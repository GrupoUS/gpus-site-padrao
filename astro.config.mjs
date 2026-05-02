// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

const redirectTargets = {
	"/na-mesa-certa": "https://namesa.gpus.com.br/",
	"/trintae3": "https://trintae3.drasacha.com.br/",
	"/comunidade-us": "https://drasacha.com.br/pagina-de-inscricao-comu-us/",
	"/neon-dash": "https://neondash.com.br/",
};

// https://astro.build/config
export default defineConfig({
	site: "https://grupous.com.br",
	// Manter destinos alinhados a `externalSiteUrl` nos JSON dos produtos com funil externo
	redirects: redirectTargets,
	fonts: [
		{
			name: "Playfair Display",
			cssVariable: "--font-playfair",
			provider: fontProviders.google(),
			weights: [400, 600, 700],
			styles: ["normal"],
		},
		{
			name: "Inter",
			cssVariable: "--font-inter",
			provider: fontProviders.google(),
			weights: [300, 400, 500, 600, 700],
			styles: ["normal"],
		},
	],
	integrations: [
		react(),
		sitemap({
			filter: (page) => {
				try {
					const pathname = new URL(page).pathname.replace(/\/$/, "") || "/";
					if (
						pathname === "/na-mesa-certa" ||
						pathname === "/trintae3" ||
						pathname === "/comunidade-us" ||
						pathname === "/neon-dash"
					) {
						return false;
					}
				} catch {
					/* keep page */
				}
				return true;
			},
			serialize(item) {
				const pathname = new URL(item.url).pathname.replace(/\/$/, "") || "/";

				/** @type {Record<string, { priority: number; changefreq: string }>} */
				const config = {
					"/": { priority: 1.0, changefreq: "weekly" },
					"/curso-auriculo": { priority: 0.9, changefreq: "monthly" },
					"/mentoria-black-neon": { priority: 0.9, changefreq: "monthly" },
					"/otb": { priority: 0.9, changefreq: "monthly" },
					"/sobre": { priority: 0.7, changefreq: "monthly" },
					"/contato": { priority: 0.7, changefreq: "monthly" },
					"/termos": { priority: 0.3, changefreq: "yearly" },
					"/politica-de-privacidade": { priority: 0.3, changefreq: "yearly" },
				};

				const entry = config[pathname];
				if (entry) {
					item.priority = entry.priority;
					item.changefreq = /** @type {any} */ (entry.changefreq);
				}

				return item;
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
