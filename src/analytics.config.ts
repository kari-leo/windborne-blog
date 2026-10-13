// Browsers in this allowlist are excluded from Vercel Web Analytics.
// These IDs only control counting; they do not grant access to analytics data.
export const analyticsConfig = {
	enabled: true,
	excludedBrowsers: [
		{ name: "My computer", id: "3fdb462b-2cc9-4c80-a3f4-bb41b01ea745" },
		{ name: "My phone", id: "c3a6e8eb-8e98-4bba-be3c-51cbeda592ed" },
	],
};
