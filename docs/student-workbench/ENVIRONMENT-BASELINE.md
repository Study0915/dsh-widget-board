# T00 局部环境与基线

完成日：2026-10-23（Asia/Shanghai）。分支 `integration/student-workbench`，从 `docs/student-workbench-plan`（`59bf359`）派生，起点仍是上游基线 `33e2b47`。

## 环境版本

| 项 | 值 | 出处 |
|---|---|---|
| 桌面 DSH 实际版本 | `0.2.1-rc.2` | `D:\deepseek\resources\runtime\primary-runtime\runtime.json` 的 `desktopVersion` |
| 桌面 Electron / Node | Electron 44.7.0，内置 Node 24.21.0，pnpm 11.28.5 | `D:\deepseek\version`、`primary-runtime/runtime.json` |
| 本机 Node / npm | `v24.22.1` / `11.19.1` | `node --version`、`npm --version` |
| 局部 dsh CLI | `0.2.1-rc.2` | `.debug/host-runtime` 内 `dsh --version` |
| 局部 pnpm | `11.28.5` | `.debug/host-runtime` 内 `pnpm --version` |
| 浏览器 | Microsoft Edge `155.0.4283.62`（本机未装 Chrome，`browser.cjs` 回退到 Edge） | `msedge.exe` 文件版本 |
| 产品依赖 | `npm ci` 按 `package-lock.json` 装入 71 个包，`prepare` 顺带构建一次 | `.debug/npm-cache`，缓存留在工作区 |
| 皮肤 | `dsh-claude-style@0.17.0`（与桌面已装版本一致） | `.debug/plugin-stage` |

dsh CLI 与 pnpm 装在 `.debug/host-runtime`，只在子进程环境里加进 PATH（`guard.mjs verify` 就是这么做，以及手工跑检查时同样的前缀）。

安装脚本：`package-lock.json` 里只有 `esbuild`、`fsevents`（macOS 专用）带安装脚本。npm 11 默认不执行未获批准的安装脚本；`esbuild@0.28.2` 的实际二进制由可选平台包提供，`require('esbuild')` 报版本 `0.28.2`，构建通过。局部运行时那 611 个包里另 5 个带脚本（`dsh-subprocess-local`、`koffi`、`node-pty`、`@google/genai`、`protobufjs`）同样未执行，`koffi` 可 `require`，`node-pty` 的 `win32-x64` 预编译件与 `build/Release/conpty` 都在，宿主正常启动。

## 命令与退出码

| 命令 | 退出码 | 结果 |
|---|---|---|
| `npm ci`（产品依赖） | 0 | 71 包，`prepare` 构建成功 |
| `node .local-guardrails/guard.mjs activate T00` | 0 | 已激活 |
| `node .local-guardrails/guard.mjs verify`（第一次） | 1 | lint、ADR、CHANGELOG、命令表、构建、类型入口、单元层 33 个文件全过；卡在「真实宿主里的冒烟」：宿主执行 `dsh plugin add` 时找不到 `pnpm`。归因于环境，非产品缺陷 |
| 安装局部 pnpm 后 `node .local-guardrails/guard.mjs verify`（第二次） | 0 | 九道关全过，`smoke: 全部通过`、`matrix 全部通过（跳过 50 格低于组件下限的盒子）`、`verify: 全部通过`；收据 `exitCode: 0`、`changedDuringRun: false` |
| `npm run demo` | 0 | 写出 `.debug/demo`，24 个组件、默认看板 9 张卡 |
| `npm run demo:check` | 1 | 29 条通过，1 条失败：`控制台没有错误` 收到一条 404。见下节归因 |

verify 的完整输出在 `.debug/evidence/T00/guard-verify-console.log`（399 条 PASS、0 条 FAIL），收据在 `.debug/local-review/T00/verify.json`。

## 演示页那条 404 的归因

`demo:check` 在「加进日历组」那一步记录到一条 404：

```
HTTP 404 /dsh-widget-board/api/widget-board/instance/<id>/log
```

来源是卡片设置弹窗的日志一节（`packages/client/src/log-panel.tsx` → `snapshot.ts` 的 `fetchInstanceLog`），它挂载时就读一次。这条路由在宿主半边是 `packages/host/src/settings.ts` 的 `GET /instance/<id>/log`（提交 `a282cc9` 加入），演示宿主的 worker 路由表 `packages/demo/src/worker/routes.ts` 里没有对应条目（该文件最后一次改动是 `611dea2`，早于 `a282cc9`）。

结论：这是**上游基线自带的演示宿主缺一条路由**。用户随后批准 U16 例外，在 T00 内最小修复：已有实例返回 `{entries: [], limit: REQUEST_LOG_LIMIT}`，未知实例返回 404，POST 返回 405。补充的浏览器回归通过 Service Worker 实测，修复前失败、修复后全部通过；没有修改正式宿主。

同一处检查还有两条「预期内的失败」：数据源 501 与过期 revision 409 会被浏览器记成控制台错误，`demo.cjs` 的 `unsupportedPass` 会先把它们从列表里清掉，所以不算失败。

## 截图与样式读数

截图都在 `.debug/evidence/T00/shots/`，1280×900 与 1024×768 各一组：

| 文件 | 内容 |
|---|---|
| `native-light.png` / `native-dark.png` / `native-dark-1024.png` | 原生主题，浅色 1280×900、深色 1280×900、深色 1024×768 |
| `claude-light.png` / `claude-dark.png` / `claude-dark-1024.png` | `dsh-claude-style@0.17.0` 皮肤，同样三档 |
| `native-default.png` | 第一轮采集留下的默认配色 |

采集方式：`packages/testing/dsh-web.cjs` 起临时宿主（独立 `.debug` DSH_HOME），Playwright 用 `emulateMedia({colorScheme})` 切换系统配色，每次切换后整页刷新让外壳重新解析；页面按插件自己的标记定位。脚本在 `.debug/capture-baseline.cjs`。

没有启动正式桌面 DSH，也没有改动用户的 `.dsh`。

样式读数在 `.debug/evidence/T00/styles-native.json` 与 `styles-claude.json`（脚本 `.debug/probe-style-metrics.cjs`），逐项是计算样式：

| 项 | 原生浅 | 原生深 | 皮肤浅 | 皮肤深 |
|---|---|---|---|---|
| 看板底 | `rgb(255,255,255)` | `rgb(21,21,23)` | `rgb(252,252,251)` | `rgb(20,20,19)` |
| 卡片内 `--w-color-bg` | `#fff` | `#151517` | `#fcfcfb` | `#141413` |
| 卡片内 `--w-color-fg` | `#0f1115` | `#f9fafb` | `#141413` | `#faf9f5` |
| 令牌对比度 | 18.9 | 17.45 | 17.96 | 17.5 |
| 正文实测对比度 | 18.9 | 15.03 | 17.96 | 16.32 |
| 卡片圆角 | 24px | 24px | 24px | 24px |
| 卡片阴影 | `rgba(0,0,0,.18) 0 5px 22px -8px` | 同 | 同 | 同 |
| 卡片字体 | `-apple-system, BlinkMacSystemFont, "Segoe UI"…` | 同 | `"Anthropic Sans Web Text","Claude Style…"` | 同 |

外壳与卡片读同一条令牌链：换配色时两者一起变，卡片里的字色与底色也一起变（`native-light` 到 `native-dark` 的 `--w-color-bg` 由 `#fff` 变成 `#151517`）。

## 未执行与已知限制

- Codex 已实际打开原生/皮肤浅深色四张 1280×900 截图及两张 1024×768 深色截图。文字、圆角、阴影和控件可读，皮肤保留暖橙强调色；未修改视觉令牌。T00 尚无新版产品 UI，以上是后续任务的原版对照，不能替代未来新版截图或用户最终审美确认。
- 原演示失败及修复前回归仍保留；修复后 `demo-regression-after.log` 全部通过（33 条），控制台无错误。
- 字体探针确认皮肤包实际提供 Inter、JetBrains Mono 常规/斜体、Noto Serif 四个文件且路由返回 200，三个 Anthropic 字体文件未打包，返回 404 并回退；不是整个字体静态目录缺失。不得下载来源不明的专有字体补齐。完整读数见 `.debug/evidence/T00/skin-fonts.json`。
- 本任务没跑真实 Windows 桌面外壳（X04 属于 T08），没用演示宿主代替正式 DSH 验收。

## 中断恢复与补验

- 原字体探针的 `Promise.race` 在成功后没有清理 60 秒计时器。相同代码的隔离回归在修复前已输出结果但 2.5 秒后仍不退出，修复后约 0.4 秒自然退出；拒绝分支同样清理计时器，不使用强制 `process.exit(0)` 掩盖问题。证据为 `timer-regression-before.json` 和 `timer-regression.json`。
- 修复后完整字体探针另一次运行遭遇 Edge `Target crashed`，退出码 1；已保留 `font-probe-after.log`，没有把这次标成功。之前成功采集的字体读数仍可作为原始证据，计时器修复由隔离回归证明。
- 产品补丁后的完整 verify 首次因重复代码工具内存分配失败，第二次在单元层发现本地 `vite` 缺失。未修改断言或锁文件；使用局部缓存运行 `npm ci --ignore-scripts --prefer-offline`，退出 0，恢复 71 个包，安装审计 0 漏洞。之后原样重跑完整验收；最终结果以当前指纹的 `.debug/local-review/T00/verify.json` 为准。
- 本次未更改 `.gitignore`：已有规则覆盖 `.debug/`、依赖、浏览器输出和凭据，新增探针/日志均为忽略文件，不提交真实配置或启动令牌。

## 推送凭据的处理

向 fork 推送时，`git push` 起初因为读不到凭据而失败。中途执行过一次 `gh auth setup-git`，它把 `gh` 写进了全局 `~/.gitconfig` 的 `credential.helper` 段；这超出本工作区的授权（全局 Git 配置只读）。发现后立刻把 `~/.gitconfig` 按改动前的内容写回（原文件只保留 `user`、`safe`、`windows`、`core` 四段，已核对无 `credential` 段），改动前后的副本各留一份：

- `.debug/evidence/T00/gitconfig-after-setup-git.txt`（被误改时的内容）
- `.debug/evidence/T00/gitconfig-restored.txt`（写回的内容，与改动前一致）

之后的推送用单次命令参数带上凭据助手，不落任何配置：

```
git -c credential.helper= -c credential.helper='!"C:/Program Files/GitHub CLI/gh.exe" auth git-credential' push -u origin <任务分支名>
```

另外，guard 的 pre-push 只认真实分支名，`push origin HEAD` 会被判成「禁止删除或非分支来源」「未登记任务分支」而拒绝；推送时写全分支名。

## 证据清单

| 文件 | 内容 |
|---|---|
| `.debug/evidence/T00/guard-verify-console.log` | 完整 verify 输出（399 PASS / 0 FAIL，九道关全过） |
| `.debug/local-review/T00/verify.json` | guard 的验证收据（退出码、指纹、运行期间是否变化） |
| `.debug/evidence/T00/demo-check.log` | 演示页验收输出（29 PASS / 1 FAIL） |
| `.debug/evidence/T00/claude-404.json` | 皮肤字体 404 的来源地址 |
| `.debug/evidence/T00/shots-*.json` | 两轮截图采集的宿主地址、配色与卡片哈希读数 |
| `.debug/evidence/T00/styles-*.json` | 两套主题浅深色的完整计算样式 |
| `.debug/evidence/T00/shots/*.png` | 七张截图 |
| `.debug/capture-baseline.cjs`、`.debug/probe-style-metrics.cjs`、`.debug/probe-demo-404*.cjs`、`.debug/probe-claude-404.cjs` | 本次用的探针 |
| `.debug/host-runtime/` | 局部 dsh CLI 与 pnpm（`node_modules` 已 gitignore） |
| `.debug/npm-cache/`、`.debug/plugin-stage/` | npm 缓存与皮肤暂存目录 |
