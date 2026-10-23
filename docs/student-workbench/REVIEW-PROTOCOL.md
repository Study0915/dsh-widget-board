# 本地审阅与完成关卡

## 1. 两种关卡

**阶段保存**：commit/push随时允许，pre-commit检查任务分支、暂存文件范围、保护文件、敏感文件和体积；pre-push检查固定fork、允许分支及快进关系。未通过完整验证的阶段提交不能自称完成。

**任务完成**：运行真实verify，重读当前差异，填写证据和审阅记录，再用complete核对。完整验证和审阅都绑定代码指纹，代码改过后旧记录失效。手工填写一段“已测试”不能代替命令收据。

局部工具位于workspace `.local-guardrails/`，不需要npm依赖；它们不随普通产品PR自动提交。重新克隆只保留文档，不自动安装hooks，重新设置需明确按本工作区工具执行。

## 2. 命令

从`E:\Internship\try_dsh`执行：

```powershell
node .local-guardrails/guard.mjs status
node .local-guardrails/check-docs.mjs
node .local-guardrails/guard.mjs activate T01
node .local-guardrails/guard.mjs check
```

激活前切到TASKS规定的分支。DOCS表示当前文档交付；T00表示只准备局部环境。源码任务check仅约束当前未提交文件，pre-push另检查即将发送的提交。

完成检查：

```powershell
node .local-guardrails/guard.mjs verify
node .local-guardrails/guard.mjs review-template
node .local-guardrails/guard.mjs complete
```

verify运行原项目`npm run verify`，捕获真实退出码和日志；缺依赖就失败。T00在产品未修改状态运行同一命令。DOCS只运行文档包检查，不跑产品功能测试。

## 3. 源码指纹

指纹覆盖当前所有Git跟踪文件和非忽略未跟踪文件的路径与内容，排除本计划文档目录、.debug、依赖和构建产物。它不依赖commit时间或自然语言描述。新增源码未暂存也会使指纹变化。

verify前后指纹相同、命令退出0才生成通过收据。以后编辑任一产品文件，complete拒绝旧收据。Git分支或任务不匹配也拒绝。

## 4. 审阅记录

review-template生成`.debug/local-review/<任务>/review.json`，初始verdict为pending。审阅者真正重读差异、打开截图后填入：

- reviewer：实际审阅者名称，写明自审/人工/另一模型；没有第二人就如实写自审。
- fingerprint：模板中的当前代码指纹。
- verdict：pass或changes_requested。
- unresolvedP0P1：未解决的阻断问题数，完成时必须为0。
- checks：scope、security、style、compatibility、tests，每项pass/pending/fail。
- acceptance：本任务适用的验收编号和结果。
- evidence：仓库.debug下真实存在的文件相对路径；截图需要记录已经打开后的观察。
- limitations：未执行、环境限制、仍需用户视觉核对的项目。

complete不替模型判断截图美观，也不能证明记录者诚实；它检查字段、文件存在、指纹和命令收据。用户视觉核对尚未完成时保持pending，不把任务标为最终通过；可以继续保存和push。

## 5. 审阅顺序

1. **范围**：全部改动能对应当前任务；无无关重构、依赖或自动生成产物。
2. **正确性**：沿正常路径手动走一次，随后制造失败、冲突、空值、超限和重启恢复。
3. **安全**：请求栅栏、来源保护、路径、媒体归属、CSP、hash授权和字节预算保持；只有前端校验不算通过。
4. **兼容**：旧看板、用户组件、组卡、自由布局、主题与包导入没有退化。
5. **风格**：同视口与原卡并排看字体、间距、圆角、阴影、密度；浅深色都实际打开。
6. **证据**：逐条验收对应命令或截图，报告未执行内容，不把check替代verify。

P0：数据损坏、凭据泄漏、任意文件/网络访问等；P1：核心路径不可用、迁移丢数据、越权、严重视觉或布局破坏；P2：局部可用性和边界缺陷。P0/P1未清零不能标完成；已知P2逐项处理或取得用户明确接受。

## 6. 失败处理

检查失败保留日志，定位实现和环境原因；不修改hook/保护基线/断言使其变绿。需要受保护文件变化时给出原值、新值、必要性、替代检查，等待用户决定。此期间仍可把已允许的阶段内容正常commit/push，不包含越界文件。

## 7. 发布前检查

上游PR准备前在集成分支完整verify，重新检查所有适用验收、原生与主题浅深色截图、包往返、真实桌面和未解决缺陷。未来由用户决定是否创建PR；当前允许fork版本备份，不自动发Issue或PR。
