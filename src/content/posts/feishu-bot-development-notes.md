---
title: 飞书 Bot 开发笔记：从长连接到事件订阅 Webhook
published: 2026-08-06
description: 记录飞书机器人接入方式的选择、开发中遇到的问题，以及从 WebSocket 长连接迁移到事件订阅 Webhook 的过程。
tags: [telebot]
---

# 飞书 Bot 开发笔记：从长连接到事件订阅 Webhook

给 Bot 接入飞书时，我先用 WebSocket 长连接接收消息事件，再通过飞书 HTTP API 回复。后来，接收事件的部分改成了事件订阅 Webhook。回头看，这两种方式并不是“新旧方案”的区别：它们都能把事件送到应用里，只是连接由谁发起、服务要如何部署，以及接入时需要自己处理哪些事情不同。

## 长连接和 Webhook，差别在哪里？

长连接由应用侧的 SDK 主动连接飞书开放平台，建立一条 WebSocket 通道。只要运行中的客户端保持连接，订阅的事件就会沿着这条通道推送过来。开发环境只需能够访问公网，不必先准备公网 IP、域名或内网穿透，因此本地调试很方便。

Webhook 则是飞书开放平台向开发者提供的服务器地址发送 HTTP POST 请求。应用需要有公网可访问的地址；飞书推送事件时，请求会直接到达这个地址。它和普通的 HTTP 服务更容易接在一起，但服务器地址、请求校验、加密和快速响应都需要纳入部署与维护。

| 对比项 | WebSocket 长连接 | 事件订阅 Webhook |
| --- | --- | --- |
| 连接方向 | 应用客户端主动连接飞书，保持 WebSocket 通道 | 飞书向应用提供的地址发送 HTTP POST |
| 网络条件 | 应用所在机器能够访问公网即可；通常不需要公网入口或 Tunnel | 接收服务需要公网可访问的地址 |
| 接入和运维 | 依赖飞书 SDK 和持续运行的连接客户端；SDK 封装了建连鉴权等流程 | 可接入现有 HTTP 服务；需要处理 URL 校验，并按加密配置做验签或解密 |
| 本地开发 | 比较轻便，适合快速验证事件和调试 | 需要公网地址，常见做法是配置 Tunnel 转发到本地服务 |
| 处理要求 | 收到事件后也要尽快完成处理；耗时任务应放到后台 | 应快速返回成功响应，再异步处理耗时任务，避免超时重推 |
| 常见选择 | 企业自建应用、想减少网络入口配置时 | 已有公网服务、希望沿用 HTTP 服务架构时 |

这里说的“Webhook”是**应用事件订阅**的接收方式，不是群聊自定义机器人的推送地址。自定义机器人 Webhook 用来向群里发消息，能力和用途都不一样。

就这个项目来说，Webhook 接入后的链路更贴近现有服务结构：

```text
飞书事件订阅
    -> 公网 HTTPS Webhook
    -> Cloudflare Tunnel
    -> FastAPI 127.0.0.1:3000
    -> Agent / LangGraph
    -> 飞书 HTTP 消息 API
```

飞书官方文档也将两者列为事件订阅的不同接收方式。长连接需要集成飞书 SDK，并由客户端与开放平台建立 WebSocket 通道；Webhook 则要求开发者配置可被访问的请求地址。[长连接接收事件](https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/request-url-configuration-case) · [将事件发送至开发者服务器](https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server)

## 为什么这次改用 Webhook

迁移是结合项目当前的运行方式做出的选择，不代表 Webhook 对所有 Bot 都更稳定。长连接在本地开发时很省事；而我希望把事件入口收敛到已有的 FastAPI 服务里，统一使用 HTTP 路由、日志和后台任务，于是改用 Webhook，并通过 Cloudflare Tunnel 把公网请求转到本机。

开发中另一个问题是飞书消息编辑接口返回 `400 Bad Request`。这件事发生在**发消息**的链路上，和用 WebSocket 还是 Webhook **收事件**是两回事。处理后，飞书侧不再反复编辑占位消息：先发一次“正在处理”，完成后单独发送最终回答。Telegram 仍保留原来的轮询和编辑式进度提示。

迁移后，`POST /feishu/webhook` 负责接收事件和 URL 校验。普通事件通过必要的校验后尽快返回 HTTP 200，Agent 放在 FastAPI background task 中运行；最终回复仍通过 `im/v1/messages` 发送。接收事件与发送消息各自独立，排查时也更容易确认问题在哪一段。

## 接入时遇到的几个问题

### URL 校验通过前，先确认公网入口

本地 FastAPI 返回 JSON，并不代表飞书一定能访问到它。我曾遇到公网 URL 校验收到 Cloudflare `530` 文本错误的情况，最后发现 Tunnel 没有 active connection，或者 Windows 服务加载的并非当前维护的 ingress 配置。

我按顺序检查了本地服务、Tunnel 配置和公网响应：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen

C:\Windows\System32\cloudflared.exe tunnel `
  --config "C:\Users\<username>\.cloudflared\config.yml" `
  ingress validate

C:\Windows\System32\cloudflared.exe tunnel info <tunnel-id>
```

确认本地 `127.0.0.1:3000` 正在监听、ingress 校验返回 `OK`，并且 Tunnel 有 `CONNECTOR ID` 后，再用公网地址验证。URL 校验请求中带有 `challenge`，服务需要按要求返回它；只有收到合法 JSON 响应，才说明这一步打通了。

### URL 校验成功，不等于消息事件已经生效

配置请求地址时的 challenge 只验证飞书能否访问并识别这个地址。它不能证明消息事件已订阅、应用权限已开通，或应用版本已经发布。

有一次，飞书端发了消息，本地 Uvicorn 却没有 `POST /feishu/webhook` 日志。最后我逐项确认了：事件订阅方式选的是请求地址、已订阅 `im.message.receive_v1`（接收消息 v2.0）、机器人已启用并加入测试会话、消息读写权限已申请，以及最新应用版本已发布。改动事件或权限后，也要让新版本生效。

如果这些条件都正确，仍没有事件到达，可以再看飞书开发者后台的事件日志，并确认公网 Tunnel 指向的正是当前运行的服务。

## Webhook 版本的处理流程

本地配置保存在：

```text
tele_bot/config/feishu/local.env
```

部署时，我为接收入口保留了几条约定：

- URL 校验请求直接返回 `challenge`。
- 普通事件先做必要校验，再快速确认收到；耗时的 Agent 任务在后台执行。
- 根据配置校验 Verification Token；启用 Encrypt Key 时，使用对应密钥解密事件。
- 用 `event_id` 去重，避免重推事件被重复处理。
- 消息发送统一走飞书 HTTP API，不在接收请求里等待完整生成过程。

配置模板如下，密钥只保存在本地环境文件中：

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

`local.env` 不提交到公开仓库；App Secret、Verification Token 和 Encrypt Key 不写入日志。飞书后台开启 Encrypt Key 后，本地配置也必须使用同一份密钥。

## 回头看

这次接入让我更清楚地看到，选择长连接还是 Webhook，首先是在选择事件入口如何适配自己的运行环境。想在本地快速接收事件、又不想先准备公网入口时，长连接很合适；如果服务已经以 HTTP 为中心，并且能稳定提供公网地址，Webhook 更容易并入现有服务。无论选哪种方式，接收事件都要尽快确认，业务处理和消息发送也最好分开排查。

目前已经验证 URL challenge、`im.message.receive_v1` 文本事件解析、本地 FastAPI 健康检查、Webhook 公网校验和 Cloudflare ingress 配置。还有一项旧测试需要后续整理：部分测试仍按已移除的 `AgentCore(llm_client=...)` 初始化方式创建对象。
