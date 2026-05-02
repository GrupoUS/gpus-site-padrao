import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/products" }),
	schema: z.object({
		name: z.string(),
		slug: z.string(),
		tagline: z.string(),
		description: z.string(),
		type: z.string(),
		audience: z.string(),
		icon: z.string(),
		image: z.string().optional(),
		/** When set, home grid and header/footer product links go here; /slug still 301-redirects via astro.config. */
		externalSiteUrl: z.string().url().optional(),
		order: z.number(),
		hero: z.object({
			headline: z.string(),
			subheadline: z.string(),
		}),
		painPoints: z
			.array(
				z.object({
					icon: z.string(),
					title: z.string(),
					description: z.string(),
				}),
			)
			.min(3),
		pillars: z
			.array(
				z.object({
					icon: z.string(),
					title: z.string(),
					description: z.string(),
				}),
			)
			.length(3),
		benefits: z.array(z.string()).min(4),
		deliverables: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
				}),
			)
			.optional(),
		bonus: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
				}),
			)
			.optional(),
		story: z
			.object({
				headline: z.string(),
				paragraphs: z.array(z.string()),
				highlight: z.string(),
			})
			.optional(),
		bio: z
			.object({
				name: z.string(),
				title: z.string(),
				photo: z.string(),
				paragraphs: z.array(z.string()),
			})
			.optional(),
		differentials: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
				}),
			)
			.min(2),
		faqs: z
			.array(
				z.object({
					question: z.string(),
					answer: z.string(),
				}),
			)
			.min(3),
		cta: z.object({
			label: z.string(),
			url: z.string().url(),
			whatsappMessage: z.string(),
			helperText: z.string().optional(),
			type: z.literal("primary"),
		}),
		testimonials: z
			.array(
				z.object({
					name: z.string(),
					role: z.string(),
					quote: z.string(),
				}),
			)
			.min(2),
		event: z
			.object({
				startDate: z.string(),
				endDate: z.string(),
				location: z.object({
					name: z.string(),
					address: z.string(),
					city: z.string().optional(),
					country: z.string().optional(),
				}),
				attendanceMode: z.enum(["offline", "online", "mixed"]).optional(),
				organizer: z.string().optional(),
			})
			.optional(),
	}),
});

const team = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/team" }),
	schema: z.object({
		name: z.string(),
		role: z.string(),
		bio: z.string(),
		photo: z.string(),
		order: z.number(),
		social: z.object({
			instagram: z.string().url().optional(),
			linkedin: z.string().url().optional(),
			twitter: z.string().url().optional(),
		}),
	}),
});

export const collections = { products, team };
