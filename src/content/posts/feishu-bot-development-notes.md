---
title: 飞书 Bot 开发笔记
published: 2026-08-06
description: 飞书机器人开发过程中的技术路线、问题解决方案和经验总结
tags: [telebot]
---

# 飞书 Bot 开发笔记

## 1. 技术路线

项目最初使用飞书 WebSocket 长连接接收事件，并通过飞书 HTTP API 发送消息。由于长连接稳定性和消息编辑接口兼容性不足，最终迁移为事件订阅 Webhook：

```text
飞书事件订阅
    -> 公网 HTTPS Webhook
    -> Cloudflare Tunnel
    -> FastAPI 127.0.0.1:3000
    -> Agent / LangGraph
    -> 飞书 HTTP 消息 API
```

核心实现：

- `POST /feishu/webhook` 接收飞书事件。
- URL 校验直接返回 `challenge`。
- 普通事件快速返回 HTTP 200，Agent 在 FastAPI background task 中执行。
- 支持 verification token、可选 Encrypt Key 解密、用户白名单和 `event_id` 去重。
- 最终回复通过 `im/v1/messages` 发送。
- 飞书不再编辑处理中消息，只发送一次"正在处理"提示，再发送最终答案。
- Telegram 保留原有轮询和编辑式进度提示。

## 2. 主要问题与解决方案

### 2.1 消息编辑接口返回 400

原实现先发送占位消息，再频繁 PATCH 编辑同一条消息。飞书接口持续返回：

```text
400 Bad Request
```

处理方式：

- 移除飞书进度消息编辑逻辑。
- 改为一次性发送处理中提示。
- 最终回答单独发送。

这样避免了飞书消息编辑接口限制，也降低了请求频率。

### 2.2 URL 校验返回非法 JSON

本地 FastAPI 返回 JSON 正常，但公网请求曾收到 Cloudflare `530` 文本错误。根因是 Cloudflare Tunnel 没有 active connection，或 Windows 服务没有加载正确的 ingress 配置。

验证链路：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen

C:\Windows\System32\cloudflared.exe tunnel `
  --config "C:\Users\<username>\.cloudflared\config.yml" `
  ingress validate

C:\Windows\System32\cloudflared.exe tunnel info <tunnel-id>
```

修复后确认：

- 本地 `127.0.0.1:3000` 正在监听。
- ingress 校验返回 `OK`。
- Tunnel 输出 `CONNECTOR ID`。
- 公网 URL 校验返回合法 JSON：

```json
{"challenge":"example"}
```

### 2.3 消息事件没有到达应用

URL 校验成功不代表消息事件已经生效。曾出现"飞书端发送消息，但 Uvicorn 没有 `POST /feishu/webhook` 日志"的情况。

排查结果：

- Cloudflare Tunnel 连接状态正常，但需要确认服务使用的配置文件就是实际维护的配置。
- 本地服务必须持续运行；`start.py` 只启动 Uvicorn，不会自动启动 cloudflared。
- 飞书事件订阅、消息权限和机器人应用版本必须同时生效。
- 修改事件或权限后必须创建并发布新版应用。
- 同一机器不能同时运行多个旧的 telebot 实例，否则可能出现消息由旧进程处理、日志分散等现象。

飞书后台应确认：

- 事件订阅方式为请求地址。
- 已订阅 `im.message.receive_v1` / 接收消息 v2.0。
- 机器人能力已启用并已加入测试会话。
- 已申请接收消息和发送消息权限。
- 应用版本已发布。

## 3. 配置约定

本地配置文件：

```text
tele_bot/config/feishu/local.env
```

脱敏模板：

```dotenv
FEISHU_APP_ID=<redacted>
FEISHU_APP_SECRET=<redacted>
FEISHU_VERIFICATION_TOKEN=<optional>
FEISHU_ENCRYPT_KEY=<optional>
FEISHU_ALLOWED_USER_IDS=<optional comma-separated ids>

FEISHU_API_BASE_URL=https://open.feishu.cn
FEISHU_WEBHOOK_HOST=127.0.0.1
FEISHU_WEBHOOK_PORT=3000
FEISHU_WEBHOOK_PATH=/feishu/webhook
```

安全要求：

- `local.env` 不提交到公开仓库。
- App Secret、Verification Token 和 Encrypt Key 不写入日志。
- 飞书启用 Encrypt Key 后，本地必须配置同一份密钥。
- 配置和权限变更必须随应用新版本发布。

## 4. 测试记录

已验证：

- URL verification challenge 返回。
- `im.message.receive_v1` 文本事件解析。
- 飞书进度 reporter 不再调用消息编辑接口。
- 本地 FastAPI 健康检查。
- 本地 Webhook URL 校验。
- Cloudflare ingress 配置校验。

遗留测试问题：

- 部分旧测试仍使用已移除的 `AgentCore(llm_client=...)` 初始化方式，需要后续统一更新测试夹具。

## 5. 技术经验

1. WebSocket 接收链路和 HTTP 消息发送链路应分开验证。
2. Tunnel 有 active connector 不代表 ingress 一定指向正确的本地服务。
3. URL 校验成功不代表消息事件、权限和应用版本已经生效。
4. Webhook 应快速 ACK，耗时任务放到后台执行。
5. 同一机器只保留一个 telebot 实例，避免旧进程干扰诊断。
