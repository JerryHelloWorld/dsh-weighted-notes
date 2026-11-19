#!/usr/bin/env node
// Compact CLI for the notes store. Agents should start with `ls` (one line per
// note) and only `get` a single note when its content is actually needed.
import fs from 'node:fs'
import { resolveDir, readNote, writeNote, deleteNote, listNotes, reindex, compactList, estimateTokens, clampWeight, slugId } from '../lib/store.js'

const argv = process.argv.slice(2)
const cmd = argv[0] || 'ls'

function flag(name, fallback = '') {
  const i = argv.indexOf('--' + name)
  if (i >= 0) {
    const next = argv[i + 1]
    return next && !next.startsWith('--') ? next : 'true'
  }
  return fallback
}
const json = argv.includes('--json')
const dir = resolveDir({ dir: flag('dir') }, process.env)

function out(text) { process.stdout.write(text.endsWith('\n') ? text : text + '\n') }

if (cmd === 'ls' || cmd === 'list') {
  const min = Number(flag('min', flag('all') ? 1 : 1)) || 1
  const tag = flag('tag')
  const result = compactList(dir, { min, tag })
  if (json) out(JSON.stringify({ dir, ...result }, null, 2))
  else {
    out(result.head)
    for (const line of result.lines) out(line)
    if (!result.lines.length) out('（没有匹配的笔记）')
    else out(`（本页约 ${result.tokens} tokens；需要正文用：notes get <id>）`)
  }
  process.exit(0)
}

if (cmd === 'get') {
  const id = argv[1]
  if (!id) { out('用法：notes get <id>'); process.exit(2) }
  const note = readNote(dir, id)
  if (!note) { out(`没有这条笔记：${id}`); process.exit(1) }
  if (json) out(JSON.stringify(note, null, 2))
  else {
    out(`# ${note.title}  [w${note.weight}]  id=${note.id}${note.tags.length ? '  #' + note.tags.join(' #') : ''}`)
    out(note.body)
    out(`（约 ${estimateTokens(note.body)} tokens）`)
  }
  process.exit(0)
}

if (cmd === 'add') {
  const title = flag('title')
  if (!title) { out('用法：notes add --title "…" [--weight 3] [--tags a,b] [--body "…" | --file 路径]'); process.exit(2) }
  const bodyFile = flag('file')
  const body = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : flag('body')
  const ids = new Set(listNotes(dir).map((n) => n.id))
  const id = flag('id') || slugId(title, ids)
  const note = writeNote(dir, { id, title, weight: clampWeight(flag('weight', 3)), tags: flag('tags'), body })
  out(`已保存：${note.id} [w${note.weight}] ${note.title}`)
  process.exit(0)
}

if (cmd === 'set') {
  const id = argv[1]
  if (!id) { out('用法：notes set <id> [--weight 4] [--title "…"] [--tags a,b]'); process.exit(2) }
  const existing = readNote(dir, id)
  if (!existing) { out(`没有这条笔记：${id}`); process.exit(1) }
  const next = {
    ...existing,
    weight: argv.includes('--weight') ? clampWeight(flag('weight')) : existing.weight,
    title: flag('title', existing.title),
    tags: argv.includes('--tags') ? flag('tags') : existing.tags,
  }
  const note = writeNote(dir, next)
  out(`已更新：${note.id} [w${note.weight}] ${note.title}`)
  process.exit(0)
}

if (cmd === 'rm' || cmd === 'delete') {
  const id = argv[1]
  if (!id) { out('用法：notes rm <id>'); process.exit(2) }
  deleteNote(dir, id)
  out(`已删除：${id}`)
  process.exit(0)
}

if (cmd === 'reindex') {
  const index = reindex(dir)
  out(`索引已重建：${index.notes.length} 条 · ${dir}/index.json`)
  process.exit(0)
}

if (cmd === 'stats') {
  const notes = listNotes(dir)
  const tokens = notes.reduce((s, n) => s + n.tokens, 0)
  out(`目录：${dir}`)
  out(`笔记 ${notes.length} 条 · 全部正文约 ${tokens} tokens · 索引 ${Math.ceil(notes.length * 8)} tokens 量级`)
  const byWeight = {}
  for (const n of notes) byWeight[n.weight] = (byWeight[n.weight] || 0) + 1
  out('权重分布：' + Object.entries(byWeight).sort((a, b) => b[0] - a[0]).map(([w, c]) => `w${w}×${c}`).join('  '))
  process.exit(0)
}

out(`用法：
  notes ls [--min 4] [--tag 关键词] [--json]   列清单（最省 token）
  notes get <id>                              读一条正文
  notes add --title "…" [--weight 3] [--tags a,b] [--body "…"|--file p]
  notes set <id> [--weight 4] [--title "…"] [--tags a,b]
  notes rm <id>
  notes reindex | notes stats`)
process.exit(2)
