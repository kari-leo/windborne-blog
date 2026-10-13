# 私人访客统计与浏览器白名单

统计使用 Vercel Web Analytics，博客页面不会显示数字，也没有公开查询统计数据的接口。请登录你的 Vercel 账号，在对应项目的 Analytics 中查看数据。

## 启用

1. 在 Vercel 项目后台启用 Web Analytics（Analytics → Enable）。
2. 部署本次代码。开启 Analytics 后需要一次新部署，Vercel 才会提供统计脚本和数据接收接口。
3. 在电脑、手机常用的浏览器中分别打开以下登记地址，将 `https://你的博客域名` 替换成实际地址：

电脑：

```text
https://你的博客域名/analytics-device/#browser=3fdb462b-2cc9-4c80-a3f4-bb41b01ea745
```

手机：

```text
https://你的博客域名/analytics-device/#browser=c3a6e8eb-8e98-4bba-be3c-51cbeda592ed
```

看到“已登记”后即可返回博客。直接打开登记地址不会产生浏览量。域名不同的网站数据不共享，例如自定义域名与 `*.vercel.app` 地址需要分别登记。

## 统计口径

- 浏览量（PV）：实际浏览页面的次数。刷新页面、返回已经访问过的页面均会计数，Swup 预加载不会计数。
- 访客数（UV）：由 Vercel 识别的独立访客。Vercel 使用每天重置的请求哈希识别访客；它不是网站上线以来去重的真实人数，跨天或跨设备可能重复识别。
- 只记录页面路径，不发送 URL 查询参数或片段。
- 本地开发、IP 地址上的预览和 Vercel Preview 部署不发送统计数据。

## 白名单维护

白名单位于 `src/analytics.config.ts` 的 `excludedBrowsers`。每项有一个名称和唯一 ID。登记链接将对应 ID 保存在浏览器的 localStorage 中；每次上报前都会重新检查 ID 是否仍在白名单中。删除白名单项并重新部署，即可撤销对应的排除规则。新增设备时添加新的 UUID，并用相同格式生成登记链接。

这些 ID 仅用于排除计数，不能登录 Vercel 或读取任何统计数据；客户端过滤不是身份认证机制。普通访客不会被分配持久化设备 ID。请保留登记链接，清除网站数据、换浏览器、使用无痕模式后需重新登记。

不希望继续排除某个浏览器时，打开 `/analytics-device/`，点击“移除此浏览器的登记”。登记页面没有导航入口，并从 sitemap 和 Pagefind 搜索中排除；它本身不是受认证保护的后台，也不展示访客数据。

官方文档：[启用与查看统计](https://vercel.com/docs/analytics/quickstart)、[事件过滤](https://vercel.com/docs/analytics/package)、[访客识别口径](https://vercel.com/docs/analytics)。
