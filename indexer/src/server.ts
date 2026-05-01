/**
 * PrintLedger Indexer — startup script.
 *
 * Starts the Express API server and the XRPL WebSocket indexer in a single
 * process.  Graceful shutdown is handled on SIGINT / SIGTERM.
 *
 * Routes exposed:
 *   GET  /health
 *   GET  /api/models             — list + filter
 *   GET  /api/models/:nfTokenId  — single model with active offers
 *   GET  /api/collections        — group by TokenTaxon
 *   POST /api/reindex            — trigger manual re-index or offer refresh
 */

import express, { type Request, type Response, type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from './db'
import { startIndexer, stopIndexer } from './indexer'
import apiRouter from './routes/models'

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10)

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express()
app.use(express.json())

// Trust reverse-proxy headers when deployed behind nginx / Cloud Run / etc.
app.set('trust proxy', 1)

// ─── Rate limiting ────────────────────────────────────────────────────────────

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

const reindexLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Re-index rate limit reached. Please wait before trying again.' },
})

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Stricter rate limit on the reindex endpoint
app.post('/api/reindex', reindexLimiter)

// All API routes (models, collections, reindex) — standard rate limit
app.use('/api', publicLimiter, apiRouter)

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error:', _err)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── Startup ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Verify DB connection
  await db.$connect()
  console.log('[server] database connected.')

  // Start XRPL indexer
  await startIndexer()

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`[server] API listening on http://0.0.0.0:${PORT}`)
  })

  // ─── Graceful shutdown ─────────────────────────────────────────────────────

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[server] received ${signal}, shutting down…`)
    server.close(async () => {
      await stopIndexer()
      await db.$disconnect()
      console.log('[server] shutdown complete.')
      process.exit(0)
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err)
  process.exit(1)
})
