#!/usr/bin/env node
/**
 * Garante que externalSiteUrl e cta.url dos produtos externos batem com redirects em astro.config.mjs.
 * Ver docs/solutions/integration-issues/astro-static-external-product-routing.md
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function normalizeUrl(u) {
	if (!u || typeof u !== "string") return null;
	return u.replace(/\/$/, "") || u;
}

/** @param {string} configText */
function parseRedirect(configText, pathKey) {
	const escaped = pathKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(`${escaped}"\\s*:\\s*"([^"]+)"`);
	const m = configText.match(re);
	return m ? normalizeUrl(m[1]) : null;
}

const ROUTES = [
	{ slug: "na-mesa-certa", pathKey: "/na-mesa-certa" },
	{ slug: "otb", pathKey: "/otb" },
	{ slug: "trintae3", pathKey: "/trintae3" },
	{ slug: "comunidade-us", pathKey: "/comunidade-us" },
	{ slug: "neon-dash", pathKey: "/neon-dash" },
];

const configText = readFileSync(join(root, "astro.config.mjs"), "utf8");

let failed = false;
for (const { slug, pathKey } of ROUTES) {
	const raw = readFileSync(
		join(root, "src/content/products", `${slug}.json`),
		"utf8",
	);
	const data = JSON.parse(raw);
	const ext = normalizeUrl(data.externalSiteUrl);
	const cta = normalizeUrl(data.cta?.url);
	const redir = parseRedirect(configText, pathKey);

	if (!ext) {
		console.error(`[check-external-urls] ${slug}: missing externalSiteUrl`);
		failed = true;
		continue;
	}
	if (!redir) {
		console.error(
			`[check-external-urls] ${slug}: no redirect for "${pathKey}" in astro.config.mjs`,
		);
		failed = true;
		continue;
	}
	if (redir !== ext) {
		console.error(
			`[check-external-urls] ${slug}: redirect "${redir}" !== externalSiteUrl "${ext}"`,
		);
		failed = true;
	}
	if (cta && cta !== ext) {
		console.error(
			`[check-external-urls] ${slug}: cta.url "${cta}" !== externalSiteUrl "${ext}" (align both + redirect)`,
		);
		failed = true;
	}
}

if (!failed) {
	console.log(
		"[check-external-urls] OK: external products aligned with astro.config.mjs",
	);
}

process.exit(failed ? 1 : 0);
