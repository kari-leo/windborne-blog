import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

// Run after `pnpm build`, with Playwright installed or available via NODE_PATH.
const { chromium } = createRequire(import.meta.url)("playwright");
const dist = path.resolve("dist");
const origin = "https://analytics.example.com";
const storageKey = "windborne:analytics-browser-id";
const browserIds = [
	"3fdb462b-2cc9-4c80-a3f4-bb41b01ea745",
	"c3a6e8eb-8e98-4bba-be3c-51cbeda592ed",
];

// Stand in for Vercel's deployed runtime; exercise the real SDK's queue,
// beforeSend callback, and Swup lifecycle without sending real analytics.
const analyticsRuntime = `
window.analyticsTestEvents = [];
let filter = event => event;
window.va = (type, data) => {
    if (type === 'beforeSend') { filter = data; return; }
    if (type !== 'pageview' && type !== 'event') return;
    const event = filter({ type, url: new URL(data.path || location.href, location.origin).href });
    if (event) window.analyticsTestEvents.push(event);
};
for (const args of window.vaq || []) window.va(...args);
`;

async function withPage(run, options = {}) {
	const browser = await chromium.launch({
		channel: process.env.BROWSER_CHANNEL ?? "chrome",
	});
	try {
		const page = await browser.newPage({
			viewport: { width: options.mobile ? 375 : 1280, height: 900 },
		});
		let scriptRequests = 0;
		await page.route("**/*", async (route) => {
			const requestUrl = new URL(route.request().url());
			if (requestUrl.pathname === "/_vercel/insights/script.js") {
				scriptRequests++;
				await route.fulfill({
					contentType: "application/javascript",
					body: analyticsRuntime,
				});
				return;
			}
			let filename = path.resolve(
				dist,
				`.${decodeURIComponent(requestUrl.pathname)}`,
			);
			if (requestUrl.pathname.endsWith("/"))
				filename = path.join(filename, "index.html");
			assert.ok(filename.startsWith(`${dist}${path.sep}`));
			try {
				if (options.disabled && filename.endsWith(".html")) {
					const html = await readFile(filename, "utf8");
					await route.fulfill({
						contentType: "text/html",
						body: html.replace('data-enabled="true"', 'data-enabled="false"'),
					});
				} else {
					await route.fulfill({ path: filename });
				}
			} catch {
				await route.fulfill({ status: 404, body: "Not found" });
			}
		});
		await run(page, () => scriptRequests);
	} finally {
		await browser.close();
	}
}

async function waitForVisit(page, pathname) {
	await page.waitForURL(`${origin}${pathname}`);
	await page.waitForFunction(
		() => !document.documentElement.classList.contains("is-changing"),
	);
}

test("counts initial visits and Swup cache returns once, with no public statistics", async () => {
	await withPage(async (page, scriptRequests) => {
		await page.goto(`${origin}/?search=private#fragment`);
		await page.waitForFunction(() => window.analyticsTestEvents?.length === 1);
		assert.deepEqual(await page.evaluate(() => window.analyticsTestEvents), [
			{ type: "pageview", url: `${origin}/` },
		]);
		assert.equal(await page.locator('[id^="busuanzi_"]').count(), 0);
		assert.equal(
			await page.locator("footer").innerText(),
			`© ${new Date().getFullYear()} WindBorne`,
		);
		await page.waitForFunction(() => !!window.swup);
		await page.evaluate(() => {
			window.analyticsDocumentMarker = true;
		});
		await page.locator('.stagger a[href="/portfolio/"]').click();
		await waitForVisit(page, "/portfolio/");
		await page.waitForFunction(() => window.analyticsTestEvents.length === 2);
		await page.goBack();
		await page.waitForFunction(() => window.analyticsTestEvents.length === 3);
		assert.equal(
			await page.evaluate(() => window.analyticsDocumentMarker),
			true,
		);
		assert.equal(scriptRequests(), 1);
		const paths = await page.evaluate(() =>
			window.analyticsTestEvents.map((event) => new URL(event.url).pathname),
		);
		assert.deepEqual(paths, ["/", "/portfolio/", "/"]);
		assert.equal(
			await page.evaluate(() => {
				window.va("event", { path: "/analytics-device/?secret=x" });
				return window.analyticsTestEvents.length;
			}),
			3,
		);
	});
});

test("allowlisted desktop and mobile browsers remain excluded across navigation and reloads", async () => {
	for (const [index, id] of browserIds.entries()) {
		await withPage(
			async (page, scriptRequests) => {
				await page.goto(`${origin}/analytics-device/#browser=${id}`);
				await page
					.locator("[data-analytics-device-status]")
					.filter({ hasText: "已登记" })
					.waitFor();
				assert.equal(
					await page.evaluate((key) => localStorage.getItem(key), storageKey),
					id,
				);
				assert.equal(new URL(page.url()).hash, "");
				await page.getByRole("link", { name: "返回博客" }).click();
				await waitForVisit(page, "/");
				await page.reload();
				await page.waitForFunction(() => !!window.swup);
				assert.equal(scriptRequests(), 0);
				await page.goto(`${origin}/analytics-device/`);
				await page.getByRole("button", { name: "移除此浏览器的登记" }).click();
				await page
					.locator("[data-analytics-device-status]")
					.filter({ hasText: "尚未登记" })
					.waitFor();
				await page.getByRole("link", { name: "返回博客" }).click();
				await page.waitForFunction(
					() => window.analyticsTestEvents?.length === 1,
				);
			},
			{ mobile: index === 1 },
		);
	}
});

test("unknown IDs cannot enroll or suppress counting", async () => {
	await withPage(async (page, scriptRequests) => {
		await page.goto(`${origin}/analytics-device/#browser=unknown`);
		await page
			.locator("[data-analytics-device-status]")
			.filter({ hasText: "不在白名单" })
			.waitFor();
		assert.equal(
			await page.evaluate((key) => localStorage.getItem(key), storageKey),
			null,
		);
		assert.equal(scriptRequests(), 0);
		await page.evaluate(
			(key) => localStorage.setItem(key, "revoked-id"),
			storageKey,
		);
		await page.getByRole("link", { name: "返回博客" }).click();
		await page.waitForFunction(() => window.analyticsTestEvents?.length === 1);
	});
});

test("storage failures do not falsely report successful enrollment", async () => {
	await withPage(async (page, scriptRequests) => {
		await page.addInitScript(() => {
			Storage.prototype.setItem = () => {
				throw new Error("blocked");
			};
		});
		await page.goto(`${origin}/analytics-device/#browser=${browserIds[0]}`);
		await page
			.locator("[data-analytics-device-status]")
			.filter({ hasText: "不允许保存" })
			.waitFor();
		assert.equal(scriptRequests(), 0);
	});
});

test("local and disabled preview deployments do not load the analytics script", async () => {
	for (const options of [{}, { disabled: true }]) {
		await withPage(async (page, scriptRequests) => {
			await page.goto(`${options.disabled ? origin : "http://localhost"}/`);
			await page.waitForFunction(() => !!window.swup);
			assert.equal(scriptRequests(), 0);
		}, options);
	}
});
