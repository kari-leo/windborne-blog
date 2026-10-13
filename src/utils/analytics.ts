import { type BeforeSendEvent, inject, pageview } from "@vercel/analytics";
import { analyticsConfig } from "../analytics.config";
import { pathsEqual, url } from "./url-utils";

const storageKey = "windborne:analytics-browser-id";
const registrationPath = url("/analytics-device/");
let injected = false;

function getBrowserId() {
	try {
		return localStorage.getItem(storageKey);
	} catch {
		return null;
	}
}

function findBrowser(id: string | null) {
	return analyticsConfig.excludedBrowsers.find((browser) => browser.id === id);
}

function isRegistrationPage(path: string) {
	return pathsEqual(path, registrationPath);
}

function isProductionHost() {
	const host = location.hostname;
	return (
		host !== "localhost" &&
		!host.endsWith(".localhost") &&
		!host.endsWith(".local") &&
		!host.includes(":") &&
		!/^\d+\.\d+\.\d+\.\d+$/.test(host)
	);
}

function canTrack() {
	return (
		analyticsConfig.enabled &&
		document.getElementById("private-analytics-config")?.dataset.enabled ===
			"true" &&
		isProductionHost() &&
		!findBrowser(getBrowserId())
	);
}

function beforeSend(event: BeforeSendEvent) {
	const eventUrl = new URL(event.url, location.origin);
	if (!canTrack() || isRegistrationPage(eventUrl.pathname)) return null;
	// Search filters and registration fragments are not needed in analytics.
	eventUrl.search = "";
	eventUrl.hash = "";
	return { ...event, url: eventUrl.href };
}

function updateRegistration() {
	const status = document.querySelector<HTMLElement>(
		"[data-analytics-device-status]",
	);
	if (!status) return;
	const requestedId = new URLSearchParams(location.hash.slice(1)).get(
		"browser",
	);
	if (requestedId) {
		if (!findBrowser(requestedId)) {
			status.textContent =
				"登记失败：这个标识不在白名单中。请使用你的设备登记链接。";
			return;
		}
		try {
			localStorage.setItem(storageKey, requestedId);
		} catch {
			status.textContent =
				"登记失败：浏览器不允许保存网站数据。请允许保存后重新打开登记链接。";
			return;
		}
		// Keep the enrollment ID out of copied URLs after registration succeeds.
		history.replaceState(
			history.state,
			"",
			location.pathname + location.search,
		);
	}
	const browser = findBrowser(getBrowserId());
	status.textContent = browser
		? `已登记（${browser.name}）：这个浏览器的访问不会计入统计。`
		: "这个浏览器尚未登记。请在电脑或手机上打开对应的设备登记链接。";
}

function onPageLoad() {
	if (isRegistrationPage(location.pathname)) {
		updateRegistration();
		return;
	}
	if (!canTrack()) return;
	if (!injected) {
		inject({
			mode: "production",
			framework: "astro",
			disableAutoTrack: true,
			beforeSend,
		});
		injected = true;
	}
	// Swup emits this lifecycle only for actual visits, including cached pages.
	// Manual pageviews avoid counting preloads or counting pushState twice.
	pageview({ path: location.pathname });
}

document.addEventListener("astro:page-load", onPageLoad);
document.addEventListener("click", (event) => {
	if (!(event.target instanceof Element)) return;
	if (!event.target.closest("[data-analytics-device-remove]")) return;
	try {
		localStorage.removeItem(storageKey);
		updateRegistration();
	} catch {
		const status = document.querySelector<HTMLElement>(
			"[data-analytics-device-status]",
		);
		if (status)
			status.textContent = "无法清除登记，请在浏览器设置中清除本站数据。";
	}
});
onPageLoad();
