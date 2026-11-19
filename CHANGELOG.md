# 更新日志

记录这个插件的每次改动：时间、改了什么、为什么改。对外发布后，用户看到的就是这份记录。

## 0.1.0 — 2026-11-19 21:12

首次公开发布，包名 `dsh-weighted-notes`。

- 新增：`README.md`、`LICENSE`（MIT）、`.gitignore`，补齐 `license` / `keywords` / `engines` 等发布元数据
- 改动：`repository` 指向 `github.com/JerryHelloWorld/dsh-weighted-notes`，LICENSE 署名 JerryHelloWorld
- 改动：包名从内部的 `@local/dsh-notes` 改为 `dsh-weighted-notes`；版本号从内部迭代号重置为 0.1.0
- 内含功能：Markdown 笔记存储（`index.json` 索引 + `notes/*.md` 正文）、权重 1–5、设置页「笔记库」、命令行 `tools/notes.mjs`、更新日志接口

## 开发记录（对外发布前的内部迭代）

### 1.1.2 — 2026-11-19 20:52

- 新增：设置页底部的「更新日志」，点开就能看到历次改动
- 新增：接口 `GET /dsh-notes/api/changelog`，按 `## 版本 — 时间` 切分返回条目
- 新增：本文件 `CHANGELOG.md`，以后每次改动都要在这里追加一条

### 1.1.1 — 2026-11-19 20:48

- 修复：设置页里「笔记库」条目的接口地址前缀，改用 `document.baseURI` 解析，避免部署在子路径时 404

### 1.1.0 — 2026-11-19 20:45

- 改动：不再单独监听 43117 端口，改为把接口注册到 DSH 自己的 Web 服务（`/dsh-notes/api/*`）
- 新增：设置 → 笔记库（注册在 `settings.section` 插槽，与「养鱼」并排）
- 改动：旧的独立页面下线，`http://127.0.0.1:43117/` 不再可用

### 1.0.1 — 2026-11-19 20:30

- 修复：页面首次加载时列表总是空的——接口返回 `{dir, notes}`，前端却当数组用了
- 改动：页面 HTML 抽到 `ui/index.html` 按请求读取，改文案不用重装插件

### 1.0.0 — 2026-11-19 20:20

- 首次发布：Markdown 笔记存储（`index.json` 索引 + `notes/*.md` 正文），权重 1–5
- 新增：命令行 `tools/notes.mjs`（ls / get / add / set / rm / reindex / stats），先读清单再读正文，省 token
- 新增：本地编辑页面（列表、编辑、改权重、新建、删除、重建索引）
