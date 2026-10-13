# WindBorne

个人博客与项目作品集，基于 Astro、Svelte 和 Tailwind CSS，沿用 [Fuwari](https://github.com/saicaca/fuwari) 的基础结构。支持 Markdown、数学公式、Mermaid、代码高亮、全文搜索和 RSS。

## 本地开发

使用 Node.js 22 和 pnpm 9.14.4（版本由 `package.json` 指定）。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

| 命令 | 用途 |
|---|---|
| `pnpm lint:ci` | 与 GitHub CI 一致的格式、导入排序与代码质量检查 |
| `pnpm check` | Astro、TypeScript 与 Svelte 检查 |
| `pnpm build` | 生成静态站点与 Pagefind 搜索索引 |
| `pnpm preview` | 预览构建结果 |
| `pnpm new-post <filename>` | 在文章目录创建 Markdown 文件 |
| `pnpm format` | 格式化源码 |

## 内容与资源

- `src/content/posts/`：博客文章。
- `src/content/projects/`、`src/content/projectDocuments/`：作品集与项目说明。
- `src/content/spec/`：关于页面。
- `src/assets/`、`public/`：图片、图标、视频等站点资源。
- `src/config.ts`：站点、导航与主题配置。
- `docs/`：分析配置、产品设计记录与技术 Demo 说明。
- `scripts/`：文章创建工具与功能检查脚本。

发布前依次运行 `pnpm lint:ci`、`pnpm check` 和 `pnpm build`。修改域名时同步更新 `astro.config.mjs` 的 `site`。

## 功能检查

```sh
node --test scripts/mermaid.test.mjs
node scripts/check-homeagent-prototypes.mjs
node scripts/check-technical-demos.mjs
```

`analytics.test.mjs` 与 `responsive.test.mjs` 是可选浏览器检查，需要单独准备 Playwright 与浏览器环境；保留这些检查脚本，日常构建不依赖 Playwright。

维护说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，分析配置见 [docs/analytics.md](docs/analytics.md)。项目使用 [MIT License](LICENSE)。
