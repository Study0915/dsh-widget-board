# 九个可独立交接的任务

一次只激活一个任务。先运行workspace局部guard的status；工作树已有修改时先识别归属，不能为切任务清理用户内容。文件允许范围以workspace`.local-guardrails/policy.json`为机器权威，下列名称说明职责；不在范围内时先申请扩展，不能修改policy绕过。

每次任务先读取DS-HANDOFF、安全规则和原仓库AGENTS。检查未通过可以commit/push阶段版本，不能标为完成。完成关卡见审阅协议。

## T00 局部环境与基线

- 分支：integration/student-workbench，从docs/student-workbench-plan创建。
- 前置：文档包和局部guard可读；源码仍为记录基线。
- 读取：UPSTREAM-AUDIT、原package.json、testing/dsh-web.cjs、scripts/verify.mjs。
- 操作：在.debug内准备npm缓存、浏览器和独立DSH运行时；核查当前桌面实际DSH版本，精确固定。安装前检查生命周期脚本，不执行来源不明的安装器。
- 运行：原版完整verify、演示构建/检查，并保存原生及主题浅深色截图。不能把演示宿主当作正式DSH验收。
- 修改范围：本任务只产生.debug证据和任务记录，不改产品源码。
- 退出：环境版本、命令退出码、截图路径清楚；失败属于原基线还是环境明确记录。基线失败先诊断，不通过删除断言继续。

## T01 看板标签管理

- 分支：fix/board-tab-management，从文档分支创建。
- 前置：T00基线证据；读取specs/BOARD的B1和原多看板决策。
- 操作顺序：抽共享管理动作→菜单→重命名→删除确认→标题栏/溢出→键盘与语言→测试和文档。
- 主要文件：client的tabs、settings、snapshot、copy、titlebar及新增board-management模块；对应测试。默认不改宿主删除算法。
- 验收：B01—B12、相关V项。最后一块删除、输入法Enter、非当前标签菜单必须实际测试。
- 停止：不要顺带实现排列、模板或校园内容。

## T02 整齐行列

- 分支：feat/aligned-board-layout，从文档分支创建。
- 前置：T00；读取specs/BOARD的B2—B6、技术契约2、自由布局/组卡/事件决策。
- 操作顺序：纯模型→类型及迁移→宿主原子提交/事件→客户端派生布局→模式菜单→拖动/行高→新增删除适配→导出布局元数据→回归。
- 主要文件：model新增aligned模块、contracts board/events/routes、host state/workspace/arrangement及package/share、client board-grid/snapshot/merge相关；用新模块控制文件长度。
- 验收：L01—L14，保留原free算法测试。使用动态根字号，不能把0.75rem当成固定12px。
- 停止：不改tokens、CSP或组件自己的内容高度协议。

## T03 模板创建与实例表单

- 分支：feat/card-composer，从文档分支创建；后续T04/T05继续该分支。
- 前置：T00；读取specs/COMPOSER的C1—C3、技术契约3。
- 操作顺序：实例编辑契约和共享校验→嵌套表单→文本/待办/链接/倒计时模板→创建界面→冲突与失败恢复→测试。
- 主要文件：client表单/创建器、host人工content路由、contracts相关类型、已有四类widgets及新增countdown、测试。
- 验收：C01—C07；卡片实例编辑不会改共享类型，保存失败不留空卡片。
- 停止：图片入口待T05可用再显示，校园入口待T06再显示。

## T04 源码、草稿与真实预览

- 分支：feat/card-composer。
- 前置：T03；读取specs/COMPOSER的C4—C6、技术契约4—5、隔离/格式/来源/编辑器决策。
- 操作顺序：共享用户组件写入服务→只读来源保护→expectedHash→草稿→CodeMirror→预览会话与FrameHost隔离→适配工具/导入共用规则→测试。
- 主要文件：client composer子模块、frame-host、host library/write/preview/drafts/share/tools、contracts相关类型与包依赖。
- 验收：C08—C17，故意运行预览的action/call/notify不能产生正式副作用。
- 停止：不得为了预览修改CSP或授予同源权限；保护文件变更先询问用户。

## T05 受限媒体与完整备份

- 分支：feat/card-composer。
- 前置：T04；读取技术契约6—7、specs/COMPOSER的C7—C8。
- 操作顺序：sharp本地处理→上传ticket及绑定→按真实实例归属读取→runtime分块工具→图片模板→看板包format2→资源清理→测试。
- 主要文件：host新增media模块及有限接线、contracts实例/能力类型、runtime新增media工具、client图片字段、image widget、package/share及测试。
- 验收：M01—M12，特别验证已知外卡hash不能绑定或读取、篡改MIME不能通过、包导出导入恢复图片。
- 停止：不放宽原桥/状态上限，不用base64填满props，不访问任意用户磁盘路径。

## T06 校园综合卡与学校预设

- 分支：feat/campus-card，从feat/card-composer已完成T05的提交创建。
- 前置：T05；读取specs/CAMPUS、VISUAL-SPEC、技术契约8。
- 操作顺序：schema及手动事项→三身份→常用入口→通用/四校原创素材→图片外观→窄矮布局→samples与尺寸矩阵。
- 主要文件：widgets/campus、其共享纯逻辑model模块、client模板登记与校园编辑模块；此时不新增文件导入或后台提醒。
- 验收：P01—P12、V01—V10，12个身份学校组合都检查，不只检查个人使用组合。
- 停止：不自动抓教务，不写真实论文/考试日期，不把别校建筑当作本校图案。

## T07 CSV/ICS文件交换

- 分支：feat/campus-card。
- 前置：T06；读取specs/IMPORT-REMINDERS的I1—I4。
- 操作顺序：时间模型和库→CSV解析/字段映射→ICS解析/重复例外→预览→重复处理→宿主原子提交→导出→真实往返。
- 主要文件：host新增受限import模块、共享纯时间逻辑、client导入预览、contracts接口、校园管理、夹具与依赖。
- 验收：I01—I15；时区未知、重复例外、100条/64KiB/桥整体额度都不可忽略。
- 停止：不手写ICS解析，不静默丢行，不把CSV/ICS当完整组件备份。

## T08 提醒、集成与交付审阅

- 分支：先在feat/campus-card完成提醒，再在integration/student-workbench合并四条功能分支验证；切换前结束对应活动任务，由guard使用T08配置覆盖这两条分支。
- 前置：T01、T02、T07；读取日历规格I5—I7、验收矩阵和审阅协议。
- 操作顺序：纯提醒计算→暂停/恢复与去重→未读提示→各分支完整verify→集成分支完整verify和demo→真实桌面与主题截图→逐项审阅→整理投稿材料。
- 修改范围：提醒及有限接线、整体验证、双语说明、变更记录；不趁集成重写已完成模块。
- 验收：N01—N08、X01—X08以及全部适用行；视觉待用户核对时明确标记，其他工作继续完成。
- 交付：当前commit、分支、未提交内容、检查证据、未完成项、下一步。可以push到fork备份；上游Issue/PR仍等待用户指令。
