# 贡献材料准备

2026-10-27：用户批准四个contrib分支及204条公开路径的精确登记，policy哈希2240ba587c4b1fbcdef6005c2ad29faa11963fb200614f5c1e1e4496c6ee3ded。一次只激活CONTRIB任务，每次检查最多185文件；原有任务、安全指纹、hooks与固定fork边界保持。

## 分支与依赖

1. `contrib/board-tab-management`：从作者0.1.6提交9aa880a建立，整理标签改名、删除及空看板行为。
2. `contrib/aligned-board-layout`：包含前项基础，添加整齐排列、格式兼容、模式偏好和引用维护。
3. `contrib/card-composer`：包含前项基础，添加页面内容编辑、源码草稿与预览、受控媒体及统一排版。
4. `contrib/campus-card`：包含编辑能力基础，添加校园综合卡、CSV/ICS及看板内提醒。

前三项存在共享文件和集成修复，采用依次增加功能的分支结构。最终PR正文应明确实际依赖与基点；后续主题发送前应等待前置主题被作者接收，或者按作者反馈调整，不能声称四项互不依赖。

## 公开范围

清单位于`.debug/pr-preparation/public-diff-inventory.json`。本地任务规划、保护配置、调试脚本、截图、原始诊断及含本地授权历史的提交不进入公开贡献历史。保留原作者AGENTS与安全策略；不通过绕过hooks构造提交。

## 检查

集成版已有698项单元、宿主冒烟、尺寸矩阵、demo与桌面证据；每个整理后的实际分支仍须按其内容独立完整验收。当前集成版正式guard收据重跑中；X08在四个干净分支与材料完成之前保持pending。

四份标题与正文草稿在`.debug/pr-preparation/01-board-management.md`至`04-campus-card.md`。未执行的分支验证保持待完成。所有上游PR、Issue、合并和包发布均未执行。

下一步：归档集成验证并保存修复提交，依序整理四个分支，展示最终正文等待用户批准发送。
