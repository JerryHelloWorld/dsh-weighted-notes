// DSH notes plugin (host side): weighted, file-backed notes shared by every
// session, exposed to the settings UI through the host web server.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ensureDir, resolveDir, readNote, writeNote, deleteNote, listNotes, reindex, compactList, estimateTokens, slugId } from './lib/store.js'

export const name = 'dsh-weighted-notes'
const CHANGELOG_FILE = fileURLToPath(new URL('./CHANGELOG.md', import.meta.url))

export default {
  name: '@local/dsh-notes',
  inject: ['webServer'],
  apply(ctx, config = {}) {
    const dir = resolveDir(config)
    ensureDir(dir)
    reindex(dir)

    const disposers = []
    const route = (kind, pathname, handler) => {
      disposers.push(ctx.webServer.register({
        kind,
        path: pathname,
        handler: async (req, res) => {
          try {
            await handler(req, res)
          } catch (error) {
            json(res, 500, { ok: false, error: String(error?.message ?? error) })
          }
        },
      }))
    }

    let warnedUntrusted = false
    function untrusted(req) {
      const host = String(req.headers?.host ?? '').toLowerCase()
      const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
      if (name === '127.0.0.1' || name === 'localhost' || name === '[::1]' || name === '::1') return false
      const connection = ctx.get?.('connection') ?? ctx.connection
      try {
        if (connection && typeof connection.isTrusted === 'function') return connection.isTrusted(req) !== true
        if (connection && typeof connection.requestRejection === 'function') return connection.requestRejection(req) !== undefined
      } catch {}
      if (!warnedUntrusted) {
        warnedUntrusted = true
        try { ctx.logger?.warn?.('[dsh-notes] 信任栅栏不可用，非回环来源一律拒绝') } catch {}
      }
      return true
    }

    function readBody(req, limit = 2 * 1024 * 1024) {
      return new Promise((resolve, reject) => {
        const chunks = []
        let size = 0
        req.on('data', (chunk) => {
          size += chunk.length
          if (size > limit) { reject(new Error('请求过大')); req.destroy(); return }
          chunks.push(chunk)
        })
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          if (!raw) return resolve({})
          try { resolve(JSON.parse(raw)) } catch { reject(new Error('请求体不是合法 JSON')) }
        })
        req.on('error', reject)
      })
    }

    const guard = (handler) => async (req, res) => {
      if (untrusted(req)) return json(res, 403, { ok: false, error: '不受信任的访问来源' })
      return handler(req, res)
    }

    route('exact', '/dsh-notes/api/notes', guard(async (req, res) => {
      if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost')
        const min = Number(url.searchParams.get('min') || 1)
        const tag = url.searchParams.get('tag') || ''
        const notes = listNotes(dir).filter((n) => n.weight >= min && (!tag || n.tags.some((t) => t.includes(tag))))
        return json(res, 200, { ok: true, dir, notes })
      }
      if (req.method === 'POST') {
        const body = await readBody(req)
        const ids = new Set(listNotes(dir).map((n) => n.id))
        const id = body.id ? String(body.id) : slugId(body.title, ids)
        return json(res, 200, { ok: true, note: writeNote(dir, { ...body, id }) })
      }
      return json(res, 405, { ok: false, error: 'method not allowed' })
    }))

    route('exact', '/dsh-notes/api/note', guard(async (req, res) => {
      const url = new URL(req.url, 'http://localhost')
      const id = url.searchParams.get('id') || ''
      if (!id) return json(res, 400, { ok: false, error: '缺少 id' })
      if (req.method === 'GET') {
        const note = readNote(dir, id)
        return note ? json(res, 200, { ok: true, note }) : json(res, 404, { ok: false, error: '没有这条笔记' })
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const existing = readNote(dir, id)
        if (!existing) return json(res, 404, { ok: false, error: '没有这条笔记' })
        const body = await readBody(req)
        return json(res, 200, { ok: true, note: writeNote(dir, { ...existing, ...body, id }) })
      }
      if (req.method === 'DELETE') {
        deleteNote(dir, id)
        return json(res, 200, { ok: true })
      }
      return json(res, 405, { ok: false, error: 'method not allowed' })
    }))

    route('exact', '/dsh-notes/api/compact', guard(async (req, res) => {
      const url = new URL(req.url, 'http://localhost')
      return json(res, 200, { ok: true, ...compactList(dir, { min: Number(url.searchParams.get('min') || 4) }) })
    }))

    route('exact', '/dsh-notes/api/reindex', guard(async (req, res) => {
      const index = reindex(dir)
      return json(res, 200, { ok: true, count: index.notes.length, dir })
    }))

    route('exact', '/dsh-notes/api/stats', guard(async (req, res) => {
      const notes = listNotes(dir)
      return json(res, 200, {
        ok: true,
        dir,
        count: notes.length,
        tokens: notes.reduce((sum, n) => sum + n.tokens, 0),
        emptyEstimate: estimateTokens(notes.map((n) => n.title).join('')),
      })
    }))

    route('exact', '/dsh-notes/api/changelog', guard(async (req, res) => {
      let text = ''
      try {
        text = fs.readFileSync(CHANGELOG_FILE, 'utf8')
      } catch {
        return json(res, 200, { ok: true, entries: [], file: CHANGELOG_FILE })
      }
      const entries = text
        .split(/^## /m)
        .slice(1)
        .map((chunk) => {
          const lines = chunk.split(/\r?\n/)
          return { title: String(lines[0] || '').trim(), body: lines.slice(1).join('\n').trim() }
        })
        .filter((entry) => entry.title)
      return json(res, 200, { ok: true, file: CHANGELOG_FILE, entries })
    }))

    ctx.effect?.(() => () => { for (const dispose of disposers) { try { dispose?.() } catch {} } }, 'dsh-notes: routes')
    try { ctx.logger?.info?.(`[dsh-notes] 笔记目录 ${dir}；入口：设置 → 笔记库`) } catch {}
    return () => { for (const dispose of disposers) { try { dispose?.() } catch {} } }
  },
}

function json(res, code, body) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}
