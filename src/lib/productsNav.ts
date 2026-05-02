import type { CollectionEntry } from "astro:content";

export type ProductNavLink = {
	label: string;
	href: string;
	/** Off-site product experience — open in new tab with noopener. */
	external?: boolean;
};

/** Short nav label: text before " — " if present, else full name. */
function navLabelFromName(name: string): string {
	const sep = " — ";
	const idx = name.indexOf(sep);
	return idx > 0 ? name.slice(0, idx) : name;
}

export function productNavLinksFromCollection(
	entries: CollectionEntry<"products">[],
): ProductNavLink[] {
	const links = [...entries]
		.sort((a, b) => a.data.order - b.data.order)
		.map((e) => {
			const external = Boolean(e.data.externalSiteUrl);
			return {
				label: navLabelFromName(e.data.name),
				href: e.data.externalSiteUrl ?? `/${e.data.slug}`,
				...(external ? { external: true as const } : {}),
			};
		});

	return links;
}
