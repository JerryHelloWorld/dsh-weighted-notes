# 笔记库

工作区里所有会话共用的一套 Markdown 笔记：按权重排序、先读清单再读正文，方便把「长期事实」和「常用流程」从对话上下文里挪出来。

## 装了什么

- **入口**：DSH 的 **设置 → 笔记库**（注册在 `settings.section` 插槽里，和「养鱼」并排）。
- **存储**：`<DSH_HOME>/notes/`，一个 `index.json` 索引 + `notes/*.md` 正文。纯文本，随时能看、能改、能带走。
- **命令行** `tools/notes.mjs`：给会话里的 agent 用的省 token 版，只打印需要的那几行。
- **接口**：`/dsh-notes/api/{notes,note,compact,reindex,stats,changelog}`，供设置页使用，仅本机可访问。
- **更新日志**：设置页底部的「更新日志」可以展开查看；源文件是包里的 `CHANGELOG.md`，每次改动追加一条。

## 权重怎么用

| 权重 | 放什么 |
| --- | --- |
| 5 | 核心事实：主人身份、明确偏好、红线 |
| 4 | 常用流程：改配置、发私信、查视频这类固定步骤 |
| 3 | 项目知识：结构、坑、结论 |
| 2 | 灵感、待办 |
| 1 | 临时 |

`notes ls --min 4` 只列权重 4 以上的，一条一行，通常两三百 token 就能读完。

## 常用命令

```bash
node tools/notes.mjs ls [--min 4] [--tag 私信] [--json]
node tools/notes.mjs get <id>
node tools/notes.mjs add --title "改配置流程" --weight 4 --tags 配置 --body "……"
node tools/notes.mjs set <id> --weight 5
node tools/notes.mjs rm <id>
node tools/notes.mjs reindex
node tools/notes.mjs stats
```

## 限制

- 设置页在 DSH 页面里，接口只接受本机来源；不要把 DSH 暴露到公网。
- 手改 `.md` 之后要在设置页点一次「重建索引」，索引才会更新。
- 正文开头 `---` 包起来的是 front-matter 元数据，别删。
