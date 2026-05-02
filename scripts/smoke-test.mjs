#!/usr/bin/env node
/**
 * Post-deploy smoke test for Grupo US website.
 *
 * Validates content routes (200), redirects (301/302), static assets
 * (sitemap, robots.txt), and OG images against a running server.
 *
 * Usage:
 *   node scripts/smoke-test.mjs                          # default: http://localhost:4321
 *   node scripts/smoke-test.mjs https://grupous.com.br   # production
 *   bun run smoke-test                                    # via package.json
 *   bun run smoke-test https://grupous.com.br             # with custom BASE_URL
 */

const BASE = (process.argv[2] || "http://localhost:4321").replace(/\/$/, "");
const TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

/** Content pages that must return 200 with valid HTML. */
const CONTENT_ROUTES = [
	"/",
	"/sobre",
	"/curso-auriculo",
	"/mentoria-black-neon",
	"/otb",
	"/contato",
	"/404",
];

/** Legal pages — also expect 200 with valid HTML. */
const LEGAL_ROUTES = ["/termos", "/politica-de-privacidade"];

/** Redirects — expect 301 or 302 with a Location header. */
const REDIRECT_ROUTES = [
	{ from: "/na-mesa-certa", expectedDomain: "namesa.gpus.com.br" },
	{ from: "/trintae3", expectedDomain: "trintae3.drasacha.com.br" },
	{ from: "/comunidade-us", expectedDomain: "drasacha.com.br" },
	{ from: "/neon-dash", expectedDomain: "neondash.com.br" },
];

/** Static assets that must be reachable. */
const ASSETS = ["/sitemap-index.xml", "/robots.txt"];

/** OG images referenced by page ogImage props. */
const OG_IMAGES = [
	"/og/home.png",
	"/og/sobre.png",
	"/og/curso-auriculo.png",
	"/og/mentoria-black-neon.png",
	"/og/otb.png",
	"/og/contato.png",
	"/og/404.png",
	"/og/termos.png",
	"/og/privacidade.png",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const dim = (t) => `\x1b[2m${t}\x1b[0m`;

/** @param {string} url @param {RequestInit} [opts] */
async function safeFetch(url, opts = {}) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, { ...opts, signal: controller.signal });
		clearTimeout(timer);
		return res;
	} catch (err) {
		clearTimeout(timer);
		if (err.name === "AbortError") return { timeout: true };
		return { error: err.message };
	}
}

// ---------------------------------------------------------------------------
// Test runners
// ---------------------------------------------------------------------------

const failures = [];

/**
 * Check content routes return 200 and contain </html>.
 * @param {string[]} routes
 * @param {string} label
 * @returns {Promise<{ passed: number; total: number }>}
 */
async function checkContentRoutes(routes, label) {
	let passed = 0;
	for (const route of routes) {
		const url = `${BASE}${route}`;
		const res = await safeFetch(url);

		if (res.timeout) {
			console.log(`  ${red("[FAIL]")} ${route} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			failures.push(`${route} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			continue;
		}
		if (res.error) {
			console.log(`  ${red("[FAIL]")} ${route} — ERROR: ${res.error}`);
			failures.push(`${route} — ERROR: ${res.error}`);
			continue;
		}

		const status = res.status;
		const body = await res.text();
		const hasHtml = body.includes("</html>");

		if (status === 200 && hasHtml) {
			console.log(`  ${green("[PASS]")} ${route} — ${status}`);
			passed++;
		} else if (status !== 200) {
			console.log(`  ${red("[FAIL]")} ${route} — Expected 200, got ${status}`);
			failures.push(`${route} — Expected 200, got ${status}`);
		} else {
			console.log(`  ${red("[FAIL]")} ${route} — 200 but missing </html>`);
			failures.push(`${route} — 200 but missing </html>`);
		}
	}
	return { passed, total: routes.length };
}

/**
 * Check redirects return 301/302 with Location header.
 *
 * Astro SSG preview serves redirect pages as HTML with a
 * <meta http-equiv="refresh"> tag instead of real HTTP redirects.
 * Real 301/302 redirects are handled by the production server (Railway/Caddy).
 * We accept both: a true 301/302, or a 200 with meta-refresh pointing to
 * the expected domain.
 *
 * @returns {Promise<{ passed: number; total: number }>}
 */
async function checkRedirects() {
	let passed = 0;
	for (const { from, expectedDomain } of REDIRECT_ROUTES) {
		const url = `${BASE}${from}`;
		const res = await safeFetch(url, { redirect: "manual" });

		if (res.timeout) {
			console.log(`  ${red("[FAIL]")} ${from} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			failures.push(`${from} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			continue;
		}
		if (res.error) {
			console.log(`  ${red("[FAIL]")} ${from} — ERROR: ${res.error}`);
			failures.push(`${from} — ERROR: ${res.error}`);
			continue;
		}

		const status = res.status;
		const location = res.headers?.get("location") || "";

		// Case 1: Real HTTP redirect (production)
		if ((status === 301 || status === 302) && location) {
			const domainMatch = expectedDomain
				? location.includes(expectedDomain)
				: true;
			if (domainMatch) {
				console.log(
					`  ${green("[PASS]")} ${from} — ${status} -> ${dim(location)}`,
				);
				passed++;
			} else {
				console.log(
					`  ${red("[FAIL]")} ${from} — ${status} -> ${location} (expected ${expectedDomain})`,
				);
				failures.push(
					`${from} — ${status} -> ${location} (expected ${expectedDomain})`,
				);
			}
			continue;
		}

		// Case 2: Astro SSG preview — meta-refresh HTML page
		if (status === 200) {
			const body = await res.text();
			const metaRefresh = body.includes('http-equiv="refresh"');
			const hasDomain = expectedDomain ? body.includes(expectedDomain) : true;
			if (metaRefresh && hasDomain) {
				console.log(
					`  ${green("[PASS]")} ${from} — 200 ${dim("(meta-refresh → " + expectedDomain + ")")}`,
				);
				passed++;
			} else if (metaRefresh) {
				console.log(
					`  ${red("[FAIL]")} ${from} — meta-refresh present but target missing ${expectedDomain}`,
				);
				failures.push(
					`${from} — meta-refresh present but target missing ${expectedDomain}`,
				);
			} else {
				console.log(
					`  ${red("[FAIL]")} ${from} — Expected redirect, got 200 with no meta-refresh`,
				);
				failures.push(
					`${from} — Expected redirect, got 200 with no meta-refresh`,
				);
			}
			continue;
		}

		console.log(
			`  ${red("[FAIL]")} ${from} — Expected 301/302, got ${status}`,
		);
		failures.push(`${from} — Expected 301/302, got ${status}`);
	}
	return { passed, total: REDIRECT_ROUTES.length };
}

/**
 * Check static assets (sitemap, robots.txt).
 * @returns {Promise<{ passed: number; total: number }>}
 */
async function checkAssets() {
	let passed = 0;
	for (const asset of ASSETS) {
		const url = `${BASE}${asset}`;
		const res = await safeFetch(url);

		if (res.timeout) {
			console.log(`  ${red("[FAIL]")} ${asset} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			failures.push(`${asset} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			continue;
		}
		if (res.error) {
			console.log(`  ${red("[FAIL]")} ${asset} — ERROR: ${res.error}`);
			failures.push(`${asset} — ERROR: ${res.error}`);
			continue;
		}

		const status = res.status;
		if (status !== 200) {
			console.log(
				`  ${red("[FAIL]")} ${asset} — Expected 200, got ${status}`,
			);
			failures.push(`${asset} — Expected 200, got ${status}`);
			continue;
		}

		const body = await res.text();

		if (asset === "/robots.txt" && !body.includes("Disallow: /404")) {
			console.log(
				`  ${red("[FAIL]")} ${asset} — 200 but missing "Disallow: /404"`,
			);
			failures.push(`${asset} — 200 but missing "Disallow: /404"`);
			continue;
		}
		if (
			asset === "/sitemap-index.xml" &&
			!body.includes("<sitemapindex")
		) {
			console.log(
				`  ${red("[FAIL]")} ${asset} — 200 but missing <sitemapindex`,
			);
			failures.push(`${asset} — 200 but missing <sitemapindex`);
			continue;
		}

		console.log(`  ${green("[PASS]")} ${asset} — ${status}`);
		passed++;
	}
	return { passed, total: ASSETS.length };
}

/**
 * Check OG images return 200 with image/* content-type (HEAD request).
 * @returns {Promise<{ passed: number; total: number }>}
 */
async function checkOgImages() {
	let passed = 0;
	for (const image of OG_IMAGES) {
		const url = `${BASE}${image}`;
		const res = await safeFetch(url, { method: "HEAD" });

		if (res.timeout) {
			console.log(`  ${red("[FAIL]")} ${image} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			failures.push(`${image} — TIMEOUT (${TIMEOUT_MS / 1000}s)`);
			continue;
		}
		if (res.error) {
			console.log(`  ${red("[FAIL]")} ${image} — ERROR: ${res.error}`);
			failures.push(`${image} — ERROR: ${res.error}`);
			continue;
		}

		const status = res.status;
		const contentType = res.headers?.get("content-type") || "";

		if (status === 200 && contentType.startsWith("image/")) {
			console.log(
				`  ${green("[PASS]")} ${image} — ${status} ${dim(`(${contentType})`)}`,
			);
			passed++;
		} else if (status !== 200) {
			console.log(
				`  ${red("[FAIL]")} ${image} — Expected 200, got ${status}`,
			);
			failures.push(`${image} — Expected 200, got ${status}`);
		} else {
			console.log(
				`  ${red("[FAIL]")} ${image} — 200 but content-type is "${contentType}"`,
			);
			failures.push(
				`${image} — 200 but content-type is "${contentType}"`,
			);
		}
	}
	return { passed, total: OG_IMAGES.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log(`\nSmoke test against: ${dim(BASE)}\n`);

	console.log("Content Routes:");
	const content = await checkContentRoutes(CONTENT_ROUTES, "Content");

	console.log("\nLegal Routes:");
	const legal = await checkContentRoutes(LEGAL_ROUTES, "Legal");

	console.log("\nRedirects:");
	const redirects = await checkRedirects();

	console.log("\nAssets:");
	const assets = await checkAssets();

	console.log("\nOG Images:");
	const og = await checkOgImages();

	// Summary
	const totalPassed =
		content.passed + legal.passed + redirects.passed + assets.passed + og.passed;
	const totalTests =
		content.total + legal.total + redirects.total + assets.total + og.total;

	console.log("\n=== Smoke Test Results ===");
	console.log(
		`  Content Routes:  ${content.passed}/${content.total} passed`,
	);
	console.log(`  Legal Routes:    ${legal.passed}/${legal.total} passed`);
	console.log(`  Redirects:       ${redirects.passed}/${redirects.total} passed`);
	console.log(`  Assets:          ${assets.passed}/${assets.total} passed`);
	console.log(`  OG Images:       ${og.passed}/${og.total} passed`);
	console.log("");

	if (totalPassed === totalTests) {
		console.log(
			green(`  Total: ${totalPassed}/${totalTests} passed — ALL OK`),
		);
		process.exit(0);
	} else {
		console.log(
			red(
				`  Total: ${totalPassed}/${totalTests} passed — ${totalTests - totalPassed} FAILURE(S)`,
			),
		);
		console.log("\n  Failures:");
		for (const f of failures) {
			console.log(`    - ${f}`);
		}
		console.log("");
		process.exit(1);
	}
}

main();
