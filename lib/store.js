// Shared note storage for the DSH notes plugin and its CLI.
// Notes live as plain Markdown with a small front-matter block; index.json is a
// derived cache that every reader can rebuild with reindex().
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const WEIGHT_MIN = 1
export const WEIGHT_MAX = 5

export function defaultNotesDir(env = process.env) {
  const home = env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'notes')
}

export function resolveDir(config = {}, env = process.env) {
  return config.dir ? path.resolve(config.dir) : defaultNotesDir(env)
}

export function ensureDir(dir) {
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true })
}

// A cheap, deliberately rough estimate: Chinese characters cost ~1 token each,
// Latin text ~1 token per 4 characters. Good enough to keep an index small.
export function estimateTokens(text) {
  const s = String(text ?? '')
  let cjk = 0
  let other = 0
  for (const ch of s) {
    if (ch.codePointAt(0) > 0x2e80) cjk++
    else other++
  }
  return Math.ceil(cjk + other / 4)
}

export function clampWeight(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, Math.round(n)))
}

export function slugId(title, existing = new Set()) {
  const base = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'note'
  let id = base
  let i = 2
  while (existing.has(id)) id = `${base}-${i++}`
  return id
}

export function safeId(id) {
  const s = String(id ?? '').trim()
  if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]{1,64}$/.test(s)) throw new Error('笔记 id 只能包含字母、数字、中文、下划线和短横线')
  return s
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean)
  return []
}

export function notePath(dir, id) {
  return path.join(dir, 'notes', safeId(id) + '.md')
}

export function serializeNote(note) {
  const tags = parseTags(note.tags)
  const front = [
    '---',
    'id: ' + note.id,
    'title: ' + String(note.title ?? '').replace(/\n/g, ' '),
    'weight: ' + clampWeight(note.weight),
    'tags: [' + tags.join(', ') + ']',
    'updated: ' + (note.updated || new Date().toISOString()),
    '---',
    '',
  ].join('\n')
  return front + String(note.body ?? '').replace(/\r\n/g, '\n').trimEnd() + '\n'
}

export function parseNote(text, fallbackId) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  const meta = {}
  let body = text
  if (m) {
    body = text.slice(m[0].length)
    for (const raw of m[1].split(/\r?\n/)) {
      const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(raw)
      if (kv) meta[kv[1]] = kv[2]
    }
  }
  const id = safeIdOr(meta.id, fallbackId)
  return {
    id,
    title: String(meta.title ?? id).trim(),
    weight: clampWeight(meta.weight),
    tags: parseTags(String(meta.tags ?? '').replace(/^\[|\]$/g, '')),
    updated: String(meta.updated ?? ''),
    body: body.trimEnd(),
  }
}

function safeIdOr(value, fallback) {
  try {
    return safeId(value)
  } catch {
    return safeId(fallback)
  }
}

export function readNote(dir, id) {
  const file = notePath(dir, id)
  if (!fs.existsSync(file)) return null
  return parseNote(fs.readFileSync(file, 'utf8'), id)
}

export function writeNote(dir, note) {
  ensureDir(dir)
  const clean = {
    id: safeId(note.id),
    title: String(note.title ?? '').trim() || note.id,
    weight: clampWeight(note.weight),
    tags: parseTags(note.tags),
    updated: new Date().toISOString(),
    body: String(note.body ?? ''),
  }
  const file = notePath(dir, clean.id)
  const tmp = file + '.tmp-' + process.pid
  fs.writeFileSync(tmp, serializeNote(clean), 'utf8')
  fs.renameSync(tmp, file)
  reindex(dir)
  return readNote(dir, clean.id)
}

export function deleteNote(dir, id) {
  const file = notePath(dir, id)
  if (fs.existsSync(file)) fs.rmSync(file, { force: true })
  reindex(dir)
}

export function listNotes(dir) {
  const folder = path.join(dir, 'notes')
  const notes = []
  let names = []
  try {
    names = fs.readdirSync(folder).filter((n) => n.endsWith('.md'))
  } catch {
    return notes
  }
  const fonts = new Map()
  for (const name of names) {
    try {
      const text = fs.readFileSync(path.join(folder, name), 'utf8')
      const note = parseNote(text, name.replace(/\.md$/, ''))
      fonts.set(note.id, {
        id: note.id,
        title: note.title,
        weight: note.weight,
        tags: note.tags,
        updated: note.updated || fs.statSync(path.join(folder, name)).mtime.toISOString(),
        tokens: estimateTokens(text),
        summary: note.body.replace(/\s+/g, ' ').slice(0, 60),
        words: note.body.length,
      })
    } catch {
      // A malformed file is skipped rather than breaking the whole listing.
    }
  }
  return [...fonts.values()].sort((a, b) => b.weight - a.weight || String(b.updated).localeCompare(String(a.updated)))
}

export function reindex(dir) {
  ensureDir(dir)
  const notes = listNotes(dir)
  const index = {
    version: 1,
    updatedAt: new Date().toISOString(),
    dir,
    notes: notes.map(({ summary, words, ...rest }) => rest),
  }
  const file = path.join(dir, 'index.json')
  const tmp = file + '.tmp-' + process.pid
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2) + '\n', 'utf8')
  fs.renameSync(tmp, file)
  return index
}

// The cheap read every session should start with: weight >= n, one line per note.
export function compactList(dir, { min = 1, tag = '', noteCount = 20 } = {}) {
  const notes = listNotes(dir).filter((n) => n.weight >= min && (!tag || n.tags.some((t) => t.includes(tag))))
  const shown = notes.slice(0, noteCount)
  const lines = shown.map((n) => `- [w${n.weight}] ${n.id} — ${n.title}${n.tags.length ? ' #' + n.tags.join(' #') : ''} · ${n.summary}`)
  const head = `笔记 ${notes.length} 条（w>=${min}${tag ? ' tag=' + tag : ''}）· 路径 ${dir}`
  return { head, lines, total: notes.length, tokens: estimateTokens(head + '\n' + lines.join('\n')) }
}
