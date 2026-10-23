# fork版本控制与以后投稿

## 1. 当前授权

用户允许DS随时commit/push到自己的fork保存版本。当前文档分支也可推送。上游Issue/PR、合并、tag及包发布等待以后明确指令。

- origin：`https://github.com/Study0915/dsh-widget-board.git`，下载/推送均为该地址。
- upstream：`https://github.com/Nwflower/dsh-widget-board.git`，下载正常，push URL禁用。
- master/main只跟踪上游，不作为开发提交目标。
- 原作者AGENTS里的“阶段WIP不提交”在个人任务分支的版本保存场景受用户U14覆盖；提交标题仍具体说明内容和阶段状态。

## 2. 分支

| 分支 | 起点 | 内容 |
|---|---|---|
| docs/student-workbench-plan | 上游基线 | 本计划文档，不含产品代码 |
| fix/board-tab-management | 文档分支 | T01 |
| feat/aligned-board-layout | 文档分支 | T02 |
| feat/card-composer | 文档分支 | T03—T05 |
| feat/campus-card | 编辑器T05完成提交 | T06—T08校园内容 |
| integration/student-workbench | 文档分支 | 合并四项功能，整体验证 |

开发分支继承文档基线，降低DS切分支后丢失规格的风险。源码阶段提交不混入计划修改；计划更新在文档分支单独提交后显式合并。

## 3. 日常保存

在具体任务分支完成一个有意义的小块，check、审阅暂存差异，再执行：

```powershell
git add -- <本次明确文件>
git diff --cached --check
git diff --cached
git commit -m "feat(范围): 说明本次实际变化"
git push -u origin HEAD
```

未完成版本使用`chore(任务): 保存……阶段进度`等真实标题；正文列未完成项，不写“全部完成”。避免git add .把.debug、凭据或其他任务内容带入。

hook允许docs/fix/feat/integration/chore/contrib前缀分支，但仍按policy中具体任务分支验证；拒绝master/main、tag、删除、错误仓库和非快进。上游有更新时先fetch，显式merge，不通过force解决。

## 4. 同步上游

工作树干净后fetch upstream；master仅快进同步，再显式合并需要的上游更新到功能分支。发生冲突重读双方内容，保留用户修改；不用reset --hard处理。

同一工作副本顺序切任务，避免两会话同时写。如果确实需要并行工作树，另行取得用户允许并遵守原Windows链接清理规则。

## 5. 完成后的干净PR分支

个人开发分支包含文档基线，不能直接把整套计划和个人约束送进上游功能PR。

功能全部完成并收到用户投稿指令后：

1. fetch最新upstream/master，确认四个功能主题及依赖。
2. 从upstream/master分别建立contrib/board-tab-management、contrib/aligned-board-layout、contrib/card-composer、contrib/campus-card。
3. 根据审阅记录只挑选对应产品提交；文档基线提交不挑选，个人.debug、hooks及计划目录不进入贡献差异。
4. 编辑器PR先于校园依赖。校园可基于清理后的编辑器贡献分支暂存；上游合并编辑器后正常merge更新，核对差异只剩校园内容。
5. 每条contrib分支重新运行其验证，检查旧/新内容、双语说明、变更记录和实际截图。
6. 推送仍只到origin；GitHub PR base为Nwflower/master、head为Study0915/contrib分支。

以上是以后流程，当前不创建contrib分支或PR。四份Issue草稿只供未来PR正文参考，不要求先向作者发Issue。

## 6. 审阅材料

每个PR写具体问题、用户可见行为、兼容/迁移、验证及限制。含隐私的个人卡片、截图和机器绝对路径不公开。保留原MIT和素材说明；不宣称作者已经同意该方案。
