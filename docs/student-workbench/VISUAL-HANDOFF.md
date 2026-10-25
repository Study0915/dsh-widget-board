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

完整 verify 尚未通过新增视觉版本：T04 新样式的单元层 481 项通过，部分运行冒烟全部通过，但矩阵先后出现资源不足、浏览器崩溃和请求连接失败；T01 一次冒烟在导航期间上下文销毁；T02 一次完整验收因系统 OutOfMemoryException 被中止。没有放宽断言或修改受保护检查入口。具体失败日志在 `.debug/local-review/TVISUAL/`，不能用单独视觉检查替代完整 verify。

用户对本轮统一样式的浅深色接受状态为待核对。T09 保留未完成状态，不运行虚假的 complete。

最终补验：其余三分支的原生、Claude 主题均退出 0（final.json 六项通过），每次先构建当前分支再启动隔离宿主。已打开当前分支原生浅色待办与 Claude 深色 Markdown，标题、正文、表格、代码层次可读。branch-consistency.json 证明九份共享视觉实现与约束文件在四分支内容完全一致；T01 原生改名弹窗与 Claude 深色窄屏菜单、T00 原生链接短备注、T02 Claude 深色排列入口也已打开核对。该结果不替代前述未通过的完整 verify。

下一步：在系统资源允许时补齐完整验收；按用户最新授权继续 T05，新增媒体界面继续复用上述契约，保留本轮失败证据。
