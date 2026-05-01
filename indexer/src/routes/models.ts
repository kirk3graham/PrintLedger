import { Router, type Request, type Response, type NextFunction } from 'express'
import { db } from '../db'
import { getIndexerClient, reindexAccount } from '../indexer'
import { refreshAllOffers } from '../offers'
import type { Prisma } from '@prisma/client'

const router = Router()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveFloat(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = parseFloat(String(val))
  return isFinite(n) ? n : undefined
}

function parseStringArray(val: unknown): string[] | undefined {
  if (!val) return undefined
  const raw = String(val)
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message })
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}

// ─── GET /api/models ──────────────────────────────────────────────────────────

router.get(
  '/models',
  asyncHandler(async (req, res) => {
    const {
      search,
      category,
      tags,
      minPrice,
      maxPrice,
      license,
      sort = 'newest',
      page = '1',
      limit = '20',
    } = req.query

    const pageNum = Math.max(1, parseInt(String(page), 10))
    const take = Math.min(100, Math.max(1, parseInt(String(limit), 10)))
    const skip = (pageNum - 1) * take

    const where: Prisma.ModelWhereInput = {}

    // Full-text style search on name + description
    if (search) {
      const q = String(search)
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = { equals: String(category), mode: 'insensitive' }
    }

    if (license) {
      where.licenseType = { equals: String(license), mode: 'insensitive' }
    }

    const tagList = parseStringArray(tags)
    if (tagList?.length) {
      where.tags = { hasSome: tagList }
    }

    const minP = parsePositiveFloat(minPrice)
    const maxP = parsePositiveFloat(maxPrice)
    if (minP !== undefined || maxP !== undefined) {
      where.hasActiveOffer = true
      where.currentPrice = {}
      if (minP !== undefined) (where.currentPrice as Prisma.FloatNullableFilter).gte = minP
      if (maxP !== undefined) (where.currentPrice as Prisma.FloatNullableFilter).lte = maxP
    }

    // Sort order
    let orderBy: Prisma.ModelOrderByWithRelationInput
    switch (sort) {
      case 'price-low':
        orderBy = { currentPrice: 'asc' }
        break
      case 'price-high':
        orderBy = { currentPrice: 'desc' }
        break
      default:
        orderBy = { mintedAt: 'desc' }
    }

    const [total, models] = await db.$transaction([
      db.model.count({ where }),
      db.model.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          nfTokenId: true,
          issuer: true,
          tokenTaxon: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          licenseType: true,
          transferFee: true,
          isBurnable: true,
          previewImage: true,
          mintedAt: true,
          hasActiveOffer: true,
          currentPrice: true,
          priceCurrency: true,
        },
      }),
    ])

    res.json({
      data: models,
      meta: {
        total,
        page: pageNum,
        limit: take,
        pages: Math.ceil(total / take),
      },
    })
  }),
)

// ─── GET /api/collections ─────────────────────────────────────────────────────
// NOTE: Must be registered BEFORE /models/:nfTokenId to avoid route shadowing.

router.get(
  '/collections',
  asyncHandler(async (_req, res) => {
    const collections = await db.model.groupBy({
      by: ['tokenTaxon', 'issuer'],
      _count: { nfTokenId: true },
      _min: { mintedAt: true, currentPrice: true },
      orderBy: { _count: { nfTokenId: 'desc' } },
    })

    const result = collections.map((c) => ({
      tokenTaxon: c.tokenTaxon,
      issuer: c.issuer,
      count: c._count.nfTokenId,
      firstMintedAt: c._min.mintedAt,
      lowestPrice: c._min.currentPrice,
    }))

    res.json({ data: result })
  }),
)

// ─── GET /api/models/:nfTokenId ───────────────────────────────────────────────

router.get(
  '/models/:nfTokenId',
  asyncHandler(async (req, res) => {
    const model = await db.model.findUnique({
      where: { nfTokenId: req.params.nfTokenId },
      include: {
        offers: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!model) {
      sendError(res, 404, 'Model not found')
      return
    }

    res.json({ data: model })
  }),
)

// ─── POST /api/reindex ────────────────────────────────────────────────────────

router.post(
  '/reindex',
  asyncHandler(async (req, res) => {
    const client = getIndexerClient()
    if (!client?.isConnected()) {
      sendError(res, 503, 'Indexer client is not connected')
      return
    }

    const { account } = req.body as { account?: string }

    if (account) {
      // Re-index a specific issuer account
      if (!/^r[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(account)) {
        sendError(res, 400, 'Invalid XRPL account address')
        return
      }

      const result = await reindexAccount(client, account)
      res.json({ message: `Re-index complete for ${account}`, ...result })
    } else {
      // Refresh sell offers for all known models
      await refreshAllOffers(client)
      res.json({ message: 'Sell-offer refresh complete for all models' })
    }
  }),
)

// ─── Error handler ────────────────────────────────────────────────────────────

router.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  sendError(res, 500, 'Internal server error')
})

export default router
