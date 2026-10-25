# T05 受限媒体与完整备份交接（2026-10-25）

状态：实现阶段已保存，未通过最终验收。当前任务 T05，分支 feat/card-composer。不要标记 complete，也不要继续 T06。

## 已实现

- sharp 0.35.5 已精确锁定，本机原生库可调用。PNG/JPEG/WebP 签名、MIME、真实解码、动画、10MiB/8192px 输入与输出尺寸体积校验，转换静态 WebP 并去元数据。
- 独立媒体编辑会话、十分钟 ticket、目标绑定、提交成功后消费；保存失败可重试。已有资源按真实实例核对，外卡 hash 不能绑定或读取；显式复制为目标看板签发新授权。
- 既有 call 通道提供每块最多 24KiB 的媒体读取。runtime 验证 MIME、总长度、偏移和每块长度，取消/暂停/替换/卸载中止读取；图片卡释放对象 URL。
- 图片模板与内容编辑接入本地上传、alt、说明、焦点与所选图片预览，复用 T04 外壳和共享视觉契约。
- format2 使用 gzip JSON；压缩 16MiB、JSON 64MiB、最多 64 个媒体、原始媒体总量 16MiB。保留 format1 原 8MiB 入口限制。图片/组件 hash、路径、数据额度、组卡与排列引用在写入前校验；新建看板一次写完整内容，失败恢复本次组件与媒体，保留既有资源和版本。
- 人工资源整理仅移除超过 24 小时且无实例/有效 ticket 引用的媒体，不在正常读取时清理。

## 当前证据

`.debug/evidence/T05/checks.json` 绑定当前代码指纹，记录 lint、build、ADR 索引、CHANGELOG、AGENTS 命令表、单元测试与 guard check 的真实命令和退出码；全部为 0，单元测试 504 项。测试临时目录置于工作区 .debug。

真实独立 DSH_HOME 使用 `.debug/t05-media-mIVp53`，检查未通过：插件在导入阶段报告 `Dynamic require of "child_process" is not supported`，因此看板未出现。脱敏宿主日志为 `.debug/host-logs/t05-media-mIVp53.log`。原因已定位为 sharp 原生依赖被现有 esbuild 宿主配置内联。浏览器用 Edge、独立上下文，测试实例已停止；没有改动用户正式 DSH。

## 待处理

已向用户请求补充 `scripts/build.mjs` 到 T05 policy，仅将 sharp 登记为宿主外部依赖；截至本记录尚未收到该项确认。具体修正为 `HOST_NODE_PACKAGES` 增加 `'sharp'`，包与平台二进制由固定运行时依赖提供。不改 verify/lint、CSP 或安全保护基线。确认前不修改该范围外文件。

确认后先调整该项局部 scope，再修正构建并运行 `.debug/t05-media-audit.cjs`。真实上传、图片显示、刷新与备份恢复的浏览器断言目前未执行成功，M08 的浏览器对象 URL 释放仍待核对；已有 Node 层回归不能替代这些结果。随后运行原 `guard.mjs verify`，可对子进程设置 `VITEST_MAX_WORKERS=2`（已从安装的 Vitest 源码核实支持），保持原检查入口和全部断言。

按原生/Claude 主题浅深色、窄矮尺寸核对图片与编辑器，并实际打开截图。更新当前代码指纹的完整收据与自审；用户视觉核对状态如实记录。完整验收前保持阶段版本状态。

下一步：收到 sharp 构建接线范围确认后完成真实宿主回归与完整验收，再更新本交接。
