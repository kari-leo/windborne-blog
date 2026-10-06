import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

// Run against `astro dev` or `astro preview` with Playwright available locally
// (or through NODE_PATH). BROWSER_CHANNEL defaults to an installed Chrome.
const { chromium } = createRequire(import.meta.url)("playwright");
const baseURL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4321";

test("HomeAgent fits mobile viewports without widening the page", async () => {
	const browser = await chromium.launch({
		channel: process.env.BROWSER_CHANNEL ?? "chrome",
	});
	try {
		for (const width of [320, 375, 412, 768, 1280]) {
			const page = await browser.newPage({
				viewport: { width, height: 915 },
				isMobile: width < 768,
				hasTouch: width < 768,
			});
			await page.goto(`${baseURL}/portfolio/homeagent/home-agent/`);
			await page.locator(".custom-md table").first().waitFor();
			await page.evaluate(() => document.fonts.ready);
			const dimensions = await page.evaluate(() => ({
				viewport: document.documentElement.clientWidth,
				document: document.documentElement.scrollWidth,
				navbar: document.querySelector("#navbar").getBoundingClientRect().width,
			}));
			assert.ok(
				dimensions.document <= dimensions.viewport + 1,
				`${width}px viewport overflowed: ${JSON.stringify(dimensions)}`,
			);
			assert.ok(Math.abs(dimensions.navbar - width) <= 1);
			await page.close();
		}
	} finally {
		await browser.close();
	}
});

test("home title survives Swup navigation in both directions", async () => {
	const browser = await chromium.launch({
		channel: process.env.BROWSER_CHANNEL ?? "chrome",
	});
	try {
		for (const width of [375, 1280]) {
			const page = await browser.newPage({ viewport: { width, height: 915 } });
			await page.goto(`${baseURL}/portfolio/`);
			await page.waitForFunction(() => !!window.swup);
			await page.evaluate(() => {
				window.responsiveTestMarker = true;
			});
			await page.locator("#navbar a").first().click();
			await page.waitForURL(`${baseURL}/`);
			await page.waitForFunction(
				() => !document.documentElement.classList.contains("is-changing"),
			);
			assert.equal(
				await page.evaluate(() => window.responsiveTestMarker),
				true,
				"navigation must use Swup",
			);
			assert.equal(
				await page.locator(".stagger h1").count(),
				1,
				"home title must appear on return",
			);
			await page.locator(".stagger a[href$='/portfolio/']").click();
			await page.waitForURL(`${baseURL}/portfolio/`);
			await page.waitForFunction(
				() => !document.documentElement.classList.contains("is-changing"),
			);
			assert.equal(
				await page.locator(".stagger").count(),
				0,
				"home title must leave with the home page",
			);
			await page.locator("#navbar a").first().click();
			await page.waitForURL(`${baseURL}/`);
			await page.waitForFunction(
				() => !document.documentElement.classList.contains("is-changing"),
			);
			assert.equal(
				await page.locator(".stagger h1").count(),
				1,
				"cached home page must keep its title",
			);
			await page.close();
		}
	} finally {
		await browser.close();
	}
});
