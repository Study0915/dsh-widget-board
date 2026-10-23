# 跨模块技术契约

以下是待实现的接口决定，不表示当前源码已有这些字段或路由。实际定义集中在contracts；宿主与客户端引用同一份。实施前重读相关原文件，发现形状漂移时先更新源码核查，再调整本文件。

## 1. 现有边界

- 宿主是唯一正式写入者，工作区保存串行，临时文件写完再改名。
- layoutRevision只随结构/排列变化，revision随内容保存变化。
- 现有状态HTTP单次请求上限16KiB；单卡持久状态64KiB；整板状态1MiB；桥消息约64KiB。这四种限制分别保留。
- 现有组件包最多64文件，单文件4MiB，总解压16MiB，压缩8MiB。看板包有自己的限制，不能随图片上传而无界扩大。
- 组件iframe继续使用allow-scripts，CSP只允许受控脚本、样式和data/blob图片；无网络、父DOM或cookie。
- InstanceFace只有id、widget、props。能力处理器需要归属信息时按真实id查询Workspace，不把前端props当权威。

## 2. 看板版本与排列

看板磁盘version从2增为3，索引版本保持现状；类型增加：

```ts
interface Arrangement {
  mode: 'free' | 'aligned'
  aligned?: {
    order: string[]
    boxes: Record<string, { w: number; h: number }>
  }
}
// Board新增arrangement；BoardInstance.layout继续保存free偏好。
```

order使用排列单元id：普通实例id或组id。宿主校验唯一、无缺项、无未知项，boxes与order键集合一致。w为1—4整数，h为现有合法高度档，实际显示时再结合minBox和当前列数约束。

读取旧version2时在内存补`{mode:'free'}`；下一次正常保存写version3，原实例layout原样保留。version3缺少合法arrangement按损坏数据报错，不能默默重建。未知高版本拒绝并保留原文件。

新增`POST /boards/:id/arrangement`：

```json
{"expectedLayoutRevision": 0, "arrangement": {"mode":"aligned","aligned":{"order":[],"boxes":{}}}}
```

响应包含layoutRevision与规范化arrangement；事件新增`arrangement`类型，只推该看板的偏好。两端事件判定、合并、快照和测试同时更新。旧layout事件继续表示free坐标更新。

客户端预览与宿主校验共用model纯函数；整齐模式坐标派生，不把当前窗口像素坐标写入磁盘。模式切换与顺序/尺寸一次提交，stale返回409和当前快照。free接口在当前mode为aligned时拒绝过时客户端写入并要求刷新，避免两种客户端互相覆盖。

## 3. 人工实例编辑

新增`POST /boards/:id/compose`创建完整卡片；`POST /instance/:id/content`编辑当前实例。两者请求体上限128KiB，保留原/state的16KiB限制，不通过修改旧常量放大不可信写入。

创建字段：widget、expectedHash、props、data、state、media和期望盒子；媒体只能来自本次合法上传或既有实例复制授权。保存只接受这些白名单字段，不接受任意实例路径或组件文件。

编辑字段：expectedRevision、可选props/data/state/media。宿主读取当前实例、组件manifest后校验；冲突返回409。全局board revision保护可能与计时器冲突，编辑器只针对内容类型实例使用；校园提醒更新采用patch并保留用户字段，必要时重新读取后显式重试一次，不能盲重试覆盖。

总校验包括：manifest schema、STATE_BYTES_LIMIT、BOARD_STATE_BYTES_LIMIT，以及序列化握手/init整体是否能装入桥上限。单卡状态小于64KiB不等于init整体一定合法。超限明确指出是请求体、状态还是消息额度。

## 4. 用户组件与草稿

- `GET /library/:id/source`：manifest、来源、hash、文本文件和资源元数据；只读请求也经过既有宿主请求栅栏。
- `POST /library/define`：id、manifest、files、expectedHash；新建时expectedHash缺省，更新时必需。
- user之外来源更新返回403；冲突409；manifest/文件不合法400；超限413。
- 创建与更新复用从widget_define/import抽出的共享写入服务。工具入口、UI入口和导入入口均执行来源保护，不能形成三套不一致检查。
- 正式保存前完整构建、校验新目录；替换目录采取同父目录暂存→验证→交换→失败恢复的事务步骤。旧版本已入版本库后才清理旧目录，读库不能看到半写状态。
- `POST /drafts`、`GET /drafts/:id`、`DELETE /drafts/:id`仅操作插件drafts目录；不接受客户端文件路径。

类型更新完成后使用原有库刷新机制；实例版本切换和授权按内容hash处理。跨类型应用当前实例先验证其内容，不静默清空。

## 5. 预览

`POST /preview`上传已校验文件和预览数据，返回随机session id；`GET /preview/:id/document`输出由buildDocument生成的预览文档；`DELETE /preview/:id`释放。

预览Session管理器属于host，和正式records/versions/grants分开。帧标识在FrameHost中明确区分preview/instance；预览端口只提供预览状态、尺寸、主题和错误，拒绝正式action/call/notify。关闭或TTL释放端口和附件。

不把预览代码插入父页面，不开放allow-same-origin，不修改contentSecurityPolicy。预览错误显示在编辑器自己的面板。

## 6. 媒体与归属

新增实例字段`media?: Record<string,string>`，键是角色（例如background/icon），值为SHA-256资源id。props只保存焦点等配置，不包含大块base64。

资源路径由宿主根据合法hash拼出`media/<hash>.webp`；不存在任意路径参数。

### 上传和绑定

`POST /media`只接受受限静态图片、角色和编辑会话id。宿主独立检查文件签名、真实像素、体积和处理输出；不能只相信客户端压缩。处理依赖选择本地sharp，固定版本并检查其平台安装结果。

响应是资源描述和短期uploadTicket。绑定时仅接受：本实例已绑定资源，或当前编辑会话合法ticket。即使知道别人的hash也不能直接绑定。ticket过期十分钟，成功提交后消费。

预览附件属于previewId，不能使用正式实例的读取权限。孤立上传最多保留24小时，显式资源整理清除；正常读取不自动大规模清理。

### 沙箱读取

manifest声明能力`widget-board:media.read`；该能力无外部网络和命令权限，只能读调用实例已经绑定的资源。处理器用Workspace.findInstance(realInstanceId)核对，不能信任参数中的instanceId。

参数`{ref,offset,length}`，offset非负整数，length最多24576字节；返回`{mime,total,offset,base64}`，base64和包络总大小必须低于桥上限。先校验归属再返回任何元数据，越权统一拒绝。

runtime提供共享readMedia辅助，通过既有call通道逐块读取、校验总长度并组装Blob。取消、卸载或版本替换中止未完成读取。组件负责创建/释放对象URL；不新增网络桥消息、不绕过capability声明检查。

## 7. 组件包与看板包

`.dshw`继续表示一种组件的manifest与文件，保持现有format。`.dshboard`增加format2：原cards/widgets基础上增加arrangement和media文件表；读取同时支持旧format1，不修改旧文件含义。

导入重建实例/组id时必须同时重映射order和boxes。media先验证hash、真实格式、数量和总体积，再导入；所有卡片验证成功后一次创建看板，失败清理本次暂存，不影响已安装资源。

format2看板媒体最多64个、原始总量16MiB；包压缩字节上限16MiB，JSON解开字节上限64MiB。base64在解析前后的开销也计算。旧包读取沿用原限制。未来超过这些额度需要单独的设计，不悄悄放宽。

从看板包导入不携带凭据或grants。导出仅包含被引用资源；未知资源明确报错，不能导出不完整包却显示成功。

## 8. 校园数据

props：schoolPreset、degree、customSchool、backgroundPosition、backgroundStrength、timeZone、reminderEnabled、reminderLeadHours。

state：schemaVersion=1、items、links、customCategories、reminderLedger。单项含id、kind、title、category、due、status、url、note、source、sourceUid、createdAt、updatedAt。media归属在实例media字段，不保存在state。

CSV/ICS解析在宿主受限导入模块完成，preview结果暂存十分钟；确认接口只收previewId、目标revision及选中行的决定。提交时重新校验目标和额度，不能接受客户端宣称“已校验”的数组直接信任。

新增`POST /instance/:id/items/import-preview`与`.../import-commit`，以及只读CSV/ICS export接口。通用模板以后需要同能力时抽出共享导入服务，不让校园UI写文件。

## 9. 不变的安全路径

请求栅栏、内容hash授权、权限scope、CSP、HTTP私网/重定向限制、状态预算、包路径规范和统一检查器继续有效。媒体/预览遇到限制时修正数据通道，不修改安全检查让用例通过。

原始AGENTS、tokens、CSP拼装、grants、HTTP访问限制和统一verify被本地保护指纹覆盖。本计划的实现预期通过新增模块及有限接线完成；确需修改保护文件时先给出具体差异和替代证据，请用户决定，然后才更新保护基线。
