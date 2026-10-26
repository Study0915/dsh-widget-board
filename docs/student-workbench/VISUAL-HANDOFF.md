# 跨任务视觉统一交接（2026-10-25）

以用户接受的 T04 为参照，字体、正文 14px/1.5、标题层级、常规 24px/紧凑 12px 留白已提取到共享外壳与 runtime 样式。待办和 Markdown 不再随高盒子放大普通正文，链接短备注可完整显示。时钟、倒计时、统计读数保留专用排版。

必须继续遵守 [跨任务视觉契约](../visual-contract.md)。client、runtime、widgets 各自的 AGENTS.md 指向同一契约；真实宿主冒烟复用 visual-contract.cjs 检查实际 iframe 的字体、行高、留白、标题和短备注。不得各模型自行增加一套视觉规范。

## 独立分支

| 原任务 | 分支 | 视觉提交后的版本 |
|---|---|---|
| T00 | integration/student-workbench | 4c89a24 |
| T01 | fix/board-tab-management | 7017e1b |
| T02 | feat/aligned-board-layout | dd86ea7 |
| T03/T04 | feat/card-composer | 1620915 |

各分支分别应用同一视觉修改并保存到固定 fork，未合并功能分支。T04 原有验收结果与新增视觉任务 T09 分别记录。

## 检查与限制

上述四分支 lint、ADR 索引、变更记录、AGENTS 命令表与 guard 范围检查通过。T01 原生和 Claude 主题的浅深色、1920/1024/单列截图与真实卡片视觉契约检查通过；改名弹窗与菜单截图已实际打开，文字、焦点边框和操作入口可读。其余三分支重新构建后逐一采集，同目录 final.json 保存真实退出码。

证据：`.debug/evidence/TVISUAL/`（按分支与主题存放），传播记录 resume.json、逐分支构建和视觉检查 final.log/final.json。已实际打开 T00 原生浅色链接卡与 T02 Claude 深色排列菜单；卡片标题、正文与说明层级一致，短备注未裁切。

最终完整验收已补齐：T00、T01、T02 各自原分支运行 `guard.mjs verify`，三次真实退出码均为 0，运行期间源码未变；分支、提交、指纹和日志见 `.debug/evidence/TVISUAL/final-full.json` 及对应 final-full-*.json/log。T03/T04 当前已含 T05，实现版本 022ac2d 的完整验收也退出 0，505 项单元、真实宿主冒烟与尺寸矩阵通过，收据见 `.debug/local-review/T05/verify.json`。所有分支保持独立。

此前资源不足、浏览器崩溃、导航上下文销毁和内存不足的失败日志仍保存在 `.debug/local-review/TVISUAL/`，作为历史记录；最终通过结果使用上述当前分支收据。补验使用 Edge、串行宿主和 `VITEST_MAX_WORKERS=2`，没有放宽断言或修改受保护检查入口。

用户对本轮统一样式的浅深色接受状态为待核对。T09 保留未完成状态，不运行虚假的 complete。

视觉补验：其余三分支的原生、Claude 主题均退出 0（final.json 六项通过），每次先构建当前分支再启动隔离宿主。已打开当前分支原生浅色待办与 Claude 深色 Markdown，标题、正文、表格、代码层次可读。branch-consistency.json 证明九份共享视觉实现与约束文件在四分支内容完全一致；T01 原生改名弹窗与 Claude 深色窄屏菜单、T00 原生链接短备注、T02 Claude 深色排列入口也已打开核对。T05 新图片界面继续复用同一契约，原生/兼容主题浅深色截图和十二项媒体回归见 [T05-HANDOFF.md](T05-HANDOFF.md)。

下一步：用户核对统一后的浅深色效果与 T05 图片界面；确认后更新用户视觉验收状态。当前工作区已恢复 feat/card-composer / T05，并重建对应产物。不要将本次阶段保存当作上游投稿或 T06 开工授权。
