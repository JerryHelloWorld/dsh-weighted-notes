/* DSH 设置页 → 笔记库（Client 模块，注册到 settings.section 插槽） */
window.__ModuleLoader__.load({
  id: '@local/dsh-notes',
  factory(require) {
    const React = require('react')
    const { createElement: h, useCallback, useEffect, useState } = React

    const API = new URL('dsh-notes/api', document.baseURI).pathname

    const CSS = [
      '.nt{font-size:14px;line-height:1.5;max-width:860px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px}',
      '.nt :is(input,select,button,textarea){font-size:inherit;font-family:inherit}',
      '.nt-title{margin:0;font-weight:500;line-height:24px}',
      '.nt-intro{color:var(--dsw-alias-label-tertiary);margin:0;line-height:20px}',
      '.nt-grid{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}',
      '.nt-list{flex:0 0 280px;min-width:240px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden;max-height:420px;overflow-y:auto}',
      '.nt-row{display:flex;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer;align-items:flex-start}',
      '.nt-row:last-child{border-bottom:none}',
      '.nt-row:hover{background:rgba(127,127,127,.08)}',
      '.nt-row.on{background:rgba(127,127,127,.16)}',
      '.nt-w{flex:0 0 24px;height:20px;line-height:20px;text-align:center;border-radius:5px;background:rgba(127,127,127,.16);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600}',
      '.nt-t{flex:1;min-width:0}',
      '.nt-t b{display:block;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nt-t small{display:block;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:17px}',
      '.nt-edit{flex:1;min-width:280px;display:flex;flex-direction:column;gap:8px}',
      '.nt-rowf{display:flex;gap:8px;flex-wrap:wrap}',
      '.nt-in,.nt-sel{background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);height:28px;padding:0 8px;outline:none;min-width:0}',
      '.nt-in:focus-visible,.nt-sel:focus-visible,.nt-ta:focus-visible{border-color:var(--dsw-alias-brand-primary)}',
      '.nt-ta{background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);padding:8px;min-height:200px;resize:vertical;line-height:1.6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;width:100%}',
      '.nt-btn{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff);border:none;border-radius:6px;height:30px;padding:0 12px;cursor:pointer}',
      '.nt-btn:disabled{opacity:.5;cursor:default}',
      '.nt-btn2{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.nt-del{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-state-error-primary,#d33)}',
      '.nt-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.nt-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px}',
      '.nt-spacer{flex:1}',
      '.nt-err{color:var(--dsw-alias-state-error-primary,#d33);line-height:18px;white-space:pre-line}',
      '.nt-empty{color:var(--dsw-alias-label-tertiary);padding:14px}',
      '.nt-log{margin-top:6px;border-top:1px solid var(--dsw-alias-border-l2);padding-top:10px}',
      '.nt-log>summary{cursor:pointer;font-weight:600;line-height:24px}',
      '.nt-logitem{padding:8px 0 4px}',
      '.nt-logtitle{font-weight:500;line-height:21px}',
      '.nt-logbody{color:var(--dsw-alias-label-secondary);white-space:pre-wrap;font-size:13px;line-height:19px}',
    ].join('')

    function useStyleOnce() {
      useEffect(() => {
        if (document.querySelector('style[data-nt-notes]')) return
        const style = document.createElement('style')
        style.setAttribute('data-nt-notes', '1')
        style.textContent = CSS
        document.head.appendChild(style)
      }, [])
    }

    async function call(path, options) {
      const response = await fetch(API + path, options)
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.ok === false) throw new Error(data.error || 'HTTP ' + response.status)
      return data
    }

    function NotesSection() {
      useStyleOnce()
      const [notes, setNotes] = useState([])
      const [dir, setDir] = useState('')
      const [form, setForm] = useState({ id: '', title: '', weight: 3, tags: '', body: '' })
      const [isNew, setIsNew] = useState(false)
      const [busy, setBusy] = useState('')
      const [err, setErr] = useState('')
      const [msg, setMsg] = useState('')
      const [log, setLog] = useState([])

      const refresh = useCallback(async () => {
        const data = await call('/notes')
        setNotes(data.notes || [])
        setDir(data.dir || '')
        return data.notes || []
      }, [])

      const open = useCallback(async (id) => {
        const data = await call('/note?id=' + encodeURIComponent(id))
        setForm({ id: data.note.id, title: data.note.title, weight: data.note.weight, tags: (data.note.tags || []).join(', '), body: data.note.body })
        setIsNew(false)
        setMsg('')
        setErr('')
      }, [])

      useEffect(() => {
        refresh()
          .then((list) => (list[0] ? open(list[0].id) : null))
          .catch((e) => setErr(String(e.message || e)))
        call('/changelog').then((data) => setLog(data.entries || [])).catch(() => {})
      }, [refresh, open])

      const run = async (label, fn) => {
        setBusy(label)
        setErr('')
        setMsg('')
        try {
          await fn()
        } catch (e) {
          setErr(String(e && e.message ? e.message : e))
        } finally {
          setBusy('')
        }
      }

      const save = () => run('save', async () => {
        if (!form.title.trim()) throw new Error('先写个标题')
        const payload = { title: form.title, weight: Number(form.weight), tags: form.tags, body: form.body }
        const data = isNew
          ? await call('/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
          : await call('/note?id=' + encodeURIComponent(form.id), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        await refresh()
        setForm({ id: data.note.id, title: data.note.title, weight: data.note.weight, tags: (data.note.tags || []).join(', '), body: data.note.body })
        setIsNew(false)
        setMsg(isNew ? '已新建' : '已保存')
      })

      const remove = () => run('remove', async () => {
        if (!form.id || isNew) return
        if (!window.confirm('确定删除这条笔记？')) return
        await call('/note?id=' + encodeURIComponent(form.id), { method: 'DELETE' })
        const list = await refresh()
        if (list[0]) await open(list[0].id)
        else setForm({ id: '', title: '', weight: 3, tags: '', body: '' })
        setMsg('已删除')
      })

      const reindex = () => run('reindex', async () => {
        const data = await call('/reindex', { method: 'POST' })
        await refresh()
        setMsg('已重建索引：' + data.count + ' 条')
      })

      const filled = form.body ? Math.ceil(form.body.length / 1.5) : 0

      return h('div', { className: 'nt' },
        h('h3', { className: 'nt-title' }, '笔记库'),
        h('p', { className: 'nt-intro' }, '工作区里所有会话共用的一套 Markdown 笔记，按权重排序。新会话先读清单、需要时再读正文，比翻聊天记录省 token。'),
        dir ? h('div', { className: 'nt-meta' }, '目录：' + dir) : null,
        h('div', { className: 'nt-grid' },
          h('div', { className: 'nt-list' },
            notes.length === 0
              ? h('div', { className: 'nt-empty' }, '还没有笔记，点右边「新建」写一条。')
              : notes.map((n) => h('div', {
                  key: n.id,
                  className: 'nt-row' + (!isNew && form.id === n.id ? ' on' : ''),
                  onClick: () => run('open', () => open(n.id)),
                },
                  h('div', { className: 'nt-w' }, String(n.weight)),
                  h('div', { className: 'nt-t' },
                    h('b', null, n.title),
                    h('small', null, (n.tags && n.tags.length ? '#' + n.tags.join(' #') + ' · ' : '') + (n.tokens || 0) + ' tok'),
                  ),
                )),
          ),
          h('div', { className: 'nt-edit' },
            h('div', { className: 'nt-rowf' },
              h('input', {
                className: 'nt-in', style: { flex: '1 1 220px' }, placeholder: '标题：一句话说清这条笔记',
                value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }),
              }),
              h('select', {
                className: 'nt-sel', style: { width: '84px' }, value: String(form.weight),
                onChange: (e) => setForm({ ...form, weight: Number(e.target.value) }),
              }, [5, 4, 3, 2, 1].map((w) => h('option', { key: w, value: String(w) }, 'w' + w))),
              h('input', {
                className: 'nt-in', style: { flex: '0 1 180px' }, placeholder: '标签：配置,私信',
                value: form.tags, onChange: (e) => setForm({ ...form, tags: e.target.value }),
              }),
            ),
            h('textarea', {
              className: 'nt-ta', placeholder: '正文（Markdown）：写事实、流程、踩过的坑，别写寒暄。',
              value: form.body, onChange: (e) => setForm({ ...form, body: e.target.value }),
            }),
            h('div', { className: 'nt-actions' },
              h('button', { className: 'nt-btn', onClick: save, disabled: !!busy }, busy === 'save' ? '保存中…' : '保存'),
              h('button', {
                className: 'nt-btn nt-btn2', disabled: !!busy,
                onClick: () => { setForm({ id: '', title: '', weight: 3, tags: '', body: '' }); setIsNew(true); setMsg('新笔记，保存后生成 id'); setErr('') },
              }, '新建'),
              h('button', { className: 'nt-del', onClick: remove, disabled: !!busy || !form.id || isNew }, '删除'),
              h('button', { className: 'nt-btn nt-btn2', onClick: reindex, disabled: !!busy }, busy === 'reindex' ? '重建中…' : '重建索引'),
              h('span', { className: 'nt-spacer' }),
              h('span', { className: 'nt-meta' }, isNew ? '未保存' : form.id ? 'id: ' + form.id + ' · 约 ' + filled + ' tok' : ''),
            ),
            msg ? h('div', { className: 'nt-meta' }, msg) : null,
            err ? h('div', { className: 'nt-err' }, err) : null,
            h('div', { className: 'nt-meta' }, '权重：5 核心事实 · 4 常用流程 · 3 项目知识 · 2 灵感 · 1 临时。改完 .md 文件后点一次「重建索引」。'),
          ),
        ),
        h('details', { className: 'nt-log' },
          h('summary', null, '更新日志（' + log.length + ' 条）'),
          log.length
            ? log.map((entry) => h('div', { key: entry.title, className: 'nt-logitem' },
                h('div', { className: 'nt-logtitle' }, entry.title),
                h('div', { className: 'nt-logbody' }, entry.body),
              ))
            : h('div', { className: 'nt-meta' }, '还没有记录'),
        ),
      )
    }

    const NS = 'notes'

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(
          () => ctx.slots.inject('settings.section', () =>
            ctx.slots.register({ name: 'settings.section', id: NS, order: 7, label: () => '笔记库' }, NotesSection),
            'notes: settings section',
          ),
          'notes: settings section',
        )
      },
    }
  },
})
