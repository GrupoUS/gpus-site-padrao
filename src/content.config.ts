import type { defineCollection } from "astro:content";

export const collections = {} as Record<
	string,
	ReturnType<typeof defineCollection>
>;
