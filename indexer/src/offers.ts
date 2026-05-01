/**
 * Sell-offer refresh helpers.
 *
 * Queries the XRPL for active sell offers for every indexed model,
 * then updates hasActiveOffer / currentPrice in the database.
 */

import type { Client } from 'xrpl'
import { db } from './db'

interface XrplSellOffer {
  nft_offer_index: string
  amount: string | { currency: string; issuer: string; value: string }
  destination?: string
  expiration?: number
  flags: number
}

async function fetchSellOffers(client: Client, nfTokenId: string): Promise<XrplSellOffer[]> {
  try {
    const response = await client.request({
      command: 'nft_sell_offers',
      nft_id: nfTokenId,
    })
    return (response.result.offers ?? []) as unknown as XrplSellOffer[]
  } catch {
    return []
  }
}

function parseAmount(amount: XrplSellOffer['amount']): { price: number; currency: string } {
  if (typeof amount === 'string') {
    // XRP amounts from the ledger are expressed in drops (integer strings).
    // We store the raw drop value so callers can convert to XRP with /1_000_000.
    return { price: parseFloat(amount), currency: 'XRP' }
  }
  // IOU amounts are decimal strings — store as-is.
  return { price: parseFloat(amount.value), currency: amount.currency }
}

/**
 * Refresh sell offers for a single NFT and persist the result.
 */
export async function refreshOffersForToken(client: Client, nfTokenId: string): Promise<void> {
  const offers = await fetchSellOffers(client, nfTokenId)

  // Mark all existing DB offers for this token as inactive
  await db.sellOffer.updateMany({
    where: { nfTokenId, isActive: true },
    data: { isActive: false },
  })

  let hasActive = false
  let lowestPrice: number | null = null
  let priceCurrency = 'XRP'

  for (const offer of offers) {
    const { price, currency } = parseAmount(offer.amount)

    await db.sellOffer.upsert({
      where: { offerIndex: offer.nft_offer_index },
      create: {
        offerIndex: offer.nft_offer_index,
        nfTokenId,
        amount: typeof offer.amount === 'string' ? offer.amount : offer.amount.value,
        currency,
        destination: offer.destination ?? null,
        expiration: offer.expiration ?? null,
        flags: offer.flags,
        isActive: true,
      },
      update: {
        isActive: true,
        amount: typeof offer.amount === 'string' ? offer.amount : offer.amount.value,
        currency,
        destination: offer.destination ?? null,
        expiration: offer.expiration ?? null,
        flags: offer.flags,
      },
    })

    hasActive = true
    if (lowestPrice === null || price < lowestPrice) {
      lowestPrice = price
      priceCurrency = currency
    }
  }

  await db.model.update({
    where: { nfTokenId },
    data: {
      hasActiveOffer: hasActive,
      currentPrice: lowestPrice ?? undefined,
      priceCurrency,
    },
  })
}

/**
 * Refresh sell offers for every model currently in the database.
 * Safe to call periodically.
 */
export async function refreshAllOffers(client: Client): Promise<void> {
  const models = await db.model.findMany({ select: { nfTokenId: true } })
  console.log(`[offers] refreshing offers for ${models.length} models…`)

  for (const { nfTokenId } of models) {
    try {
      await refreshOffersForToken(client, nfTokenId)
    } catch (err) {
      console.error(`[offers] error refreshing offers for ${nfTokenId}:`, err)
    }
  }

  console.log('[offers] refresh complete.')
}
