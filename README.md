# dsh-weighted-notes

给 **DSH（DeepSeek Harness）** 用的一套「按权重排好、每个会话共享」的 Markdown 笔记库。
*注意：本插件由(DSH)Deepseek-flash生成。*

解决的问题很具体：同一工作区里每开一个新会话，模型都从零开始，你要么把背景再讲一遍，要么让它翻聊天记录——两种都烧 token。这个插件把「长期事实」和「常用流程」挪到磁盘上，会话只读一小页清单，需要细节时再读单条。

## 它怎么省 token

- 索引 `index.json` 里只有标题、权重、标签、token 估算
- 会话开场只读 `ls --min 4`：一条笔记一行，十几条通常两三百 token
- 要正文才 `get <id>`，其余笔记不进上下文

实测一个 3 条笔记的库：清单页 184 tokens，全部正文 541 tokens。

## 装法

**本地目录**：DSH → 插件 → 添加插件 → 选这个目录。
**npm**：`npm i dsh-weighted-notes`，然后把 `cordis.patch.yml` 里的行加进 profile。

装好后入口在 **设置 → 笔记库**，和「养鱼」并排。

## 用法

### 界面

设置页里可以：列清单、点开改标题/权重/标签/正文、新建、删除、重建索引，每条显示占用 token 数，底部有更新日志。

### 命令行（给会话里的 agent 用）

```bash
node tools/notes.mjs ls [--min 4] [--tag 私信] [--json]   # 列清单，最省 token
node tools/notes.mjs get <id>                             # 读一条正文
node tools/notes.mjs add --title "改配置流程" --weight 4 --tags 配置 --body "……"
node tools/notes.mjs set <id> --weight 5
node tools/notes.mjs rm <id>
node tools/notes.mjs reindex                              # 手改 md 之后重建索引
node tools/notes.mjs stats
```

## 权重怎么分

| 权重 | 放什么 |
| --- | --- |
| 5 | 核心事实：身份、明确偏好、红线 |
| 4 | 常用流程：固定步骤、命令 |
| 3 | 项目知识：结构、坑、结论 |
| 2 | 灵感、待办 |
| 1 | 临时 |

## 数据在哪

`<DSH_HOME>/notes/`（默认 `~/.dsh/notes/`）：`index.json` + `notes/*.md`，纯文本，随时能看、能改、能带走。

## 限制

- 接口只接受本机来源；不要把 DSH 暴露到公网
- 手改 `.md` 后要在设置页点一次「重建索引」
- 正文开头的 front-matter 是元数据，别删

## 开发

```bash
node --check index.js && node --check client.js   # 语法自检
node tools/notes.mjs add --title 测试 --body x --dir ./tmp-notes
```

改动的记录都在 [CHANGELOG.md](./CHANGELOG.md)。

## License

MIT
