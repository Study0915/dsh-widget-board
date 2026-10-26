# 给DS的实施入口

## 当前进度（2026-10-26）

T07文件交换已实现并获用户视觉确认：最终完整verify退出0，521项单元、真实宿主冒烟和尺寸矩阵通过。原生专项23项通过；Claude主题功能23项通过，但三款字体404导致专项整体退出1，限制保留。详见 [T07-HANDOFF.md](T07-HANDOFF.md)。继续使用feat/campus-card；下一任务为T08，尚未激活。

T04 已经用户确认验收通过，见 [T04-HANDOFF.md](T04-HANDOFF.md)。跨分支视觉统一、T00/T01/T02 完整补验已通过，见 [VISUAL-HANDOFF.md](VISUAL-HANDOFF.md)。T05 自动验收通过、视觉状态保持原记录，见 [T05-HANDOFF.md](T05-HANDOFF.md)。T06 已获用户浅深色确认，完整 verify 与完成关卡通过：511项单元、真实宿主冒烟和尺寸矩阵；原生及Claude主题专项各45项通过，见 [T06-HANDOFF.md](T06-HANDOFF.md)。

## 直接复制的开工指令

```text
在 E:\Internship\try_dsh 工作，先阅读工作区 AGENTS.md，再阅读子仓库原 AGENTS.md、docs/student-workbench/DECISIONS.md、SAFETY-RULES.md 和 TASKS.md。

这是 dsh-widget-board 的改进实施。一次只执行一个任务，从 T00 开始；先报告分支、已有改动、前置材料、任务允许范围和本次验收项。用局部 guard 激活对应任务，再执行。

完整需求在 IMPLEMENTATION-PLAN.zh-CN.md，各任务链接的规格和 TECHNICAL-CONTRACTS.md 是实现依据；UI必须按 VISUAL-SPEC.md 复用原作者风格。不要在一轮里把所有功能写完，也不要跳过真实宿主和浅深色核对。

允许你随时在 Study0915/dsh-widget-board 的任务分支 commit 和 push 保存阶段进度；未完成版本写清未完成和未验证项目。提交前执行局部范围与安全检查，标记任务完成前再执行完整验证和当前代码指纹绑定的审阅。不得向上游发Issue/PR、直接修改master/main、强推、推tag、发布包或修改我的真实DSH环境。

测试前读取工作区根目录 DSH-TEST-PERMISSIONS.md，符合其中目标和边界的验收操作已获用户授权，直接执行，不重复询问；遵守宿主实际审批，不绕过拒绝。

每次结束给出：已做内容、当前commit/分支、真实执行的检查及退出码、未验证内容、尚存问题、下一步。遇到 policy 之外的修改、保护文件变更、超出测试预授权的权限需求或缺少关键产品决定时，先说明具体影响再询问。
```

## 任务执行顺序

1. `git status --short`、`git branch --show-current`，识别用户现有修改。
2. 从TASKS选择一个任务，读取它列出的规格和原决策；不要靠聊天记忆修改代码。
3. 创建对应任务分支。开发分支从文档分支派生，校园分支从编辑器分支派生，确保计划始终可读。
4. 从工作区运行`node .local-guardrails/guard.mjs activate T00`，以后替换为实际任务号。
5. 写出本次将修改的具体文件及验收编号，保持在policy允许范围内。
6. 分小块修改，先让一条真实路径可用，再覆盖失败路径和其余尺寸。
7. `guard.mjs check`通过后可以commit/push阶段版本；这不代表功能验收完成。
8. 任务完成时运行`guard.mjs verify`，按REVIEW-PROTOCOL填写审阅记录并运行`guard.mjs complete`。
9. 证据和状态写入.debug；下一任务开始前重读最新源码和进度。

## 防止常见误解

- “排列整齐”指同排等高和统一行列间距，不是只修某张卡的margin。
- “删除入口”复用已有宿主逻辑，不能再做一份仅前端删除。
- “自定义卡片”先做普通实例表单，源码修改是另一条明确操作。
- “学校预设”是原创图案、校名和公开入口，不含虚构的考试/投稿日期。
- “看板运行提醒”不包含切到聊天、退出DSH或系统后台提醒。
- “可push”只指自己的fork任务分支，不表示可自动向作者投稿。
- “guard通过”只代表它检查的范围、安全或证据条件，不等于你已经实际看过界面。

## 环境准备

依赖、缓存、浏览器、局部DSH和截图都在子仓库.debug。T00先核实运行时版本，按锁文件安装。宿主PATH只在子进程环境加入局部CLI，DSH_HOME明确位于.debug。新依赖依照官方文档使用并锁定版本。

T00 已安装局部依赖并记录原版验证与主题截图，详见 ENVIRONMENT-BASELINE.md。用户 U16 允许最小修复演示日志路由；以 `.debug/local-review/T00/verify.json`、`review.json`、`complete.json` 的当前代码指纹判定完成，不能把旧收据当成后续任务的验证结果。下一任务为 T01；尚未实现标签管理、整齐布局或校园卡。
