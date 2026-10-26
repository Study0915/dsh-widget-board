# T07 CSV/ICS 文件交换交接

分支：`feat/campus-card`。已实现文件交换；2026-10-26用户明确确认视觉，完整自动验收通过，不启动T08。

局部 `guard.mjs complete` 已退出0，T07证据关卡通过；不代表取得上游投稿授权。

## 已实现

- 宿主使用 Papa Parse 5.7.0、ical.js 2.2.1 和既有 Luxon 3.7.2，依赖版本已锁定，第三方说明已登记。
- 文件选择、中文表头建议和明确映射确认、目标时区、重复展开范围、逐行修正与跳过、重复更新与保留两条。预览同时显示错误和容量，列表每页25项，不截断候选。
- 2MiB 文件、10000候选/重复计算、100项、64KiB、全板状态及桥消息预算独立核对。无效行仍显示，选中行全部有效才可确认。
- 十分钟宿主预览会话，不信任客户端提交的事项数组；确认只接收预览标识、修订号和逐行决定。409保留输入，重新匹配后再次确认。一次工作区队列写入，失败不产生部分保存。
- UID与发生时间、无UID内容摘要去重；更新保留本地标识、完成状态和提醒记录。手动事项导出再导入也能匹配原事项。
- ICS处理 VEVENT、VTODO、UTC、浮动时间、IANA和VTIMEZONE、RRULE/RDATE/EXDATE/RECURRENCE-ID及取消例外；无效或歧义时间明确报错，不使用本机时区猜测。
- CSV公式转义；ICS稳定UID、全天次日exclusive end、精确UTC且不虚构时长，支持X-DSH扩展往返。导出范围和总数在下载前确认。
- 文件交换默认折叠，字段映射确认后可收起，复用现有编辑器控件、字体和间距。编辑草稿与文件导入互斥；取消不写入。完整备份继续使用看板包。
- UTF-8示例与日历夹具位于 `packages/testing/fixtures/campus-template.csv`、`campus-recurring.ics`，均为演示数据。

## 验收证据

- 新增10项单元场景通过，退出0：日期/DST、BOM/引号/换行、中文映射、公式转义、去重与容量、VTIMEZONE隔离、重复例外、ICS扩展与导出往返、全板及桥额度。
- 原生真实宿主专项23项通过，退出0；包括2MiB/100项/64KiB、409、取消、真实上传及CSV/ICS下载再上传、四尺寸浅深色，以及真实磁盘写入失败和恢复。证据为 `.debug/evidence/T07/native/checks.json` 和对应截图、下载文件。
- 调整界面前的完整verify退出0，519项单元、真实宿主冒烟、尺寸矩阵通过，记录为 `.debug/evidence/T07/verify-before-layout.json`、`verify-before-layout.log`，不代替最终代码收据。
- 最终代码完整verify退出0，41份文件、521项单元、真实宿主冒烟、尺寸矩阵全部通过；53格低于组件声明下限的盒子沿原规则跳过。指纹为 `60867316b3ec720687ab3b7a97934bcd12a80c1311decba8d084d54f723f8fb8`，运行期间未改变，记录为 `.debug/local-review/T07/verify.json`、`verify.log`。
- 自审已重读全部差异和新增模块，范围、保护文件、请求栅栏、共享状态校验、原子提交及旧功能回归通过。已打开原生/Claude浅深色及640窄屏截图，文字、间距、主题颜色及滚动区域可读，用户已确认视觉。

## 未完成与限制

- Claude主题23项功能判据通过，但三款可选字体缺失、返回404；即使设置typeface:host仍发生预加载，专项脚本退出1、控制台检查失败。记录为 `.debug/evidence/T07/claude/checks.json`，默认字体失败保留为 `claude-default-font-failure.json`。这是测试主题资源限制，不记录为完整主题专项通过。
- 一轮完整验收遇到Chromium截图捕获失败，原记录为 `.debug/evidence/T07/verify-capture-failure.json`、`verify-capture-failure.log`；按原断言串行重跑，不能用部分成功替代完整收据。
- 不含后台提醒、教务同步、上游PR、合并或发布。

下一步：按用户指令继续T08提醒与分支集成；上游PR、合并和发布仍等待明确授权。
