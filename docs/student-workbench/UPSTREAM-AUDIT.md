# 上游和本机核查

核查日：2026-10-23（Asia/Shanghai）。本表是带日期的快照，实施前重新核实漂移项。

## 仓库

- 上游：Nwflower/dsh-widget-board，MIT，默认master。
- 源码基线：33e2b47779f4efd595ed82b880d0d68069c85e72。
- 基线提交说明：合并运行成本卡片相关PR。
- package.json：0.1.4，Node>=22，DSH>=0.2.1-rc.1。
- fork：Study0915/dsh-widget-board，本次按用户请求创建。
- 本地现有Git作者配置继续使用，未改全局配置。

## 已确认能力及源码入口

| 事实 | 基线源码位置 | 规划影响 |
|---|---|---|
| 顶部只有切换/新建 | packages/client/src/tabs.tsx，BoardTabs | 添加就地管理 |
| 设置页已有重命名/删除 | packages/client/src/settings.tsx，BoardSettings | 复用动作，不误报能力缺失 |
| 最后看板删除后补空看板 | packages/host/src/workspace.ts，remove | 保持行为并适配新默认 |
| 自由位置、高度档、2rem纵向取整 | packages/model/src/grid.ts | aligned独立处理行坐标 |
| tidy按最低列放置、保留尺寸 | 同文件tidyLayout | 不等于同排等高 |
| 字体和圆角等统一 | packages/contracts/tokens.json | 全部新UI沿用令牌 |
| iframe不透明来源与受限图片 | packages/host/src/document.ts | 媒体经能力读取，不开放URL |
| state请求体16KiB | packages/host/src/routes.ts，STATE_LIMIT | 人工内容导入采用独立受限路由 |
| 状态64KiB/整板1MiB及速率 | packages/host/src/limits.ts | 上限保持，分别校验 |
| 组件版本blob | packages/host/src/blobs.ts | 不误当成用户图片仓库 |
| user/builtin/plugin来源合并 | packages/host/src/library.ts | 编辑器保护只读来源 |
| widget_define已有创建写入 | packages/host/src/tools/define.ts | UI与工具共享服务 |
| 组件包和看板包已有 | packages/host/src/package.ts、share.ts | 增加兼容format2 |
| 表单支持标量，复杂结构提示JSON | packages/client/src/fields.tsx | 扩充对象数组 |
| 提醒只在当前页面产生、重载未读清空 | packages/client/src/notifications.ts | 维持用户选定生命周期 |
| 能力回调InstanceFace含id/widget/props | packages/contracts/src/service-types.ts | 用id回查真实媒体归属 |
| 统一verify入口 | scripts/verify.mjs | 不降低或另造产品验收 |

实施必须重读相关原决策：宿主表面、隔离、权威状态、组件格式、令牌、测试、自由布局、多看板、卡片编辑器和请求通道。原决策目录为docs/adr；本包不修改它们。

## 本机只读观察

- 已安装dsh-widget-board 0.1.4及dsh-claude-style 0.17.0。
- 用户自由布局中heatmap的y为22，todo/stat的y为20，符合截图中第二排错位。
- 这些事实不表示用户数据可以公开；未把原看板文件或凭据复制到文档包。
- 本机Node为24系列；确切执行版本由局部交付证据保存。
- 当前桌面实际DSH运行时版本尚未为本项目独立定位；T00必须核查并固定，不能沿用旧笔记版本。

## 相关上游议题

截至核查日，#1组件库分区、#2示例、#3/#4市场、#6Token用量、#7组件能力、#8提供方接口仍开放。后续读API刷新状态。本地四份草稿不自动提交，不替作者宣布接受方案。

- https://github.com/Nwflower/dsh-widget-board/issues/1
- https://github.com/Nwflower/dsh-widget-board/issues/7
- https://github.com/Nwflower/dsh-widget-board/issues/8

## 参考来源

- 原作者README、AGENTS、ARCHITECTURE和上述源码，均已从固定提交读取。
- 原作者docs/images浅深色截图随源码克隆；至少深色参考已打开检查，用户实际浅色截图已在会话提供。
- 学校视觉引用见VISUAL-SPEC；具体入口在T06实施时逐项从官方页面重新核查。
- 官方库文档：CodeMirror https://codemirror.net/docs/guide/ ，Papa Parse https://www.papaparse.com/docs ，ical.js https://kewisch.github.io/ical.js/api/ 。Luxon/sharp在实施前再读其官方API并固定版本。

## 当前未验证

产品依赖尚未安装；原版及修改版npm run verify、真实桌面交互、浏览器尺寸矩阵和用户最终视觉核对尚未执行。本次文档/保护脚本检查只覆盖文档交付。
