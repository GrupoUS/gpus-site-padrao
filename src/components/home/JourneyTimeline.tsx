import { Ear, Globe, GraduationCap, Rocket, Users } from "lucide-react";
import {
	domAnimation,
	LazyMotion,
	useInView,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface TimelineStage {
	slug: string;
	stage: string;
	eyebrow: string;
	summary: string;
	productName: string;
	tagline: string;
	pageHref: string;
	iconName: string;
}

interface ComplementaryExperience {
	name: string;
	href: string;
}

interface TimelineProps {
	stages: TimelineStage[];
	complementary: ComplementaryExperience[];
}

/* ── Icon Map ── */

const iconMap: Record<string, ReactNode> = {
	Ear: <Ear className="h-5 w-5" aria-hidden="true" />,
	Users: <Users className="h-5 w-5" aria-hidden="true" />,
	GraduationCap: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
	Rocket: <Rocket className="h-5 w-5" aria-hidden="true" />,
	Globe: <Globe className="h-5 w-5" aria-hidden="true" />,
};

/* ── Animated Node (desktop) ── */

function AnimatedNode({
	stage,
	index,
}: {
	stage: TimelineStage;
	index: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.15 });

	return (
		<m.div
			ref={ref}
			initial={{ opacity: 0, y: 24 }}
			animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				mass: 1,
				delay: index * 0.12,
			}}
		>
			<NodeCard stage={stage} />
		</m.div>
	);
}

/* ── Node Card (shared between animated and static) ── */

function NodeCard({ stage }: { stage: TimelineStage }) {
	const isExternal = stage.pageHref.startsWith("http");

	return (
		<a
			href={stage.pageHref}
			target={isExternal ? "_blank" : undefined}
			rel={isExternal ? "noopener noreferrer" : undefined}
			className="glass-card card-glow-hover flex h-full flex-col rounded-3xl p-6 no-underline"
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<span className="text-gold/75">
						{iconMap[stage.iconName] ?? null}
					</span>
					<span className="text-xs font-semibold uppercase tracking-[0.24em] text-gold/75">
						{stage.eyebrow}
					</span>
				</div>
				<span className="font-serif text-3xl text-gold/80">{stage.stage}</span>
			</div>

			<h3 className="mt-5 font-serif text-2xl font-bold text-text-primary">
				{stage.productName}
			</h3>
			<p className="mt-3 text-sm leading-relaxed text-text-muted">
				{stage.summary}
			</p>
			<p className="mt-4 text-sm leading-relaxed text-text-muted">
				{stage.tagline}
			</p>
		</a>
	);
}

/* ── Complementary Section (static) ── */

function ComplementarySection({
	complementary,
}: {
	complementary: ComplementaryExperience[];
}) {
	if (complementary.length === 0) return null;

	return (
		<div className="mt-8 rounded-3xl border border-gold/10 bg-navy-light/40 px-6 py-5 text-sm text-text-muted">
			<p>
				Experiencias complementares do ecossistema:{" "}
				{complementary.map((experience, index) => (
					<span key={experience.name}>
						<a
							href={experience.href}
							className="font-medium text-gold transition-colors duration-200 hover:text-gold-light"
							target={experience.href.startsWith("http") ? "_blank" : undefined}
							rel={
								experience.href.startsWith("http")
									? "noopener noreferrer"
									: undefined
							}
						>
							{experience.name}
						</a>
						{index < complementary.length - 1 ? ", " : "."}
					</span>
				))}
			</p>
		</div>
	);
}

/* ── Mobile Dots ── */

function MobileDots({
	total,
	activeIndex,
}: {
	total: number;
	activeIndex: number;
}) {
	return (
		<div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
			{Array.from({ length: total }, (_, i) => (
				<span
					key={`dot-${String(i)}`}
					className={cn(
						"rounded-full transition-all duration-200",
						i === activeIndex ? "h-2.5 w-2.5 bg-gold" : "h-2 w-2 bg-gold/30",
					)}
					aria-hidden="true"
				/>
			))}
		</div>
	);
}

/* ── Static Fallback (reduced motion) ── */

function StaticTimeline({ stages, complementary }: TimelineProps) {
	return (
		<section
			className="px-4 py-24 sm:px-6 lg:py-32"
			aria-labelledby="journey-heading"
		>
			<div className="mx-auto max-w-7xl">
				<div className="mb-16 text-center">
					<h2
						id="journey-heading"
						className="font-serif text-3xl font-bold text-text-primary md:text-4xl"
					>
						A jornada do aluno no ecossistema Grupo US
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-text-muted">
						Cinco estagios na ordem oficial da trilha; cada card usa os dados
						reais do produto.
					</p>
				</div>

				<ol className="grid gap-6 lg:grid-cols-5">
					{stages.map((stage) => (
						<li key={stage.slug} className="flex">
							<NodeCard stage={stage} />
						</li>
					))}
				</ol>

				<ComplementarySection complementary={complementary} />
			</div>
		</section>
	);
}

/* ── Main Component ── */

export function JourneyTimeline({ stages, complementary }: TimelineProps) {
	const prefersReducedMotion = useReducedMotion();
	const sectionRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [activeMobileIndex, setActiveMobileIndex] = useState(0);

	/* Scroll-linked progress line (desktop) */
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start 0.8", "end 0.4"],
	});
	const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
	const smoothLineScaleY = useSpring(lineScaleY, {
		stiffness: 100,
		damping: 30,
	});

	/* Mobile scroll-snap IntersectionObserver for dots */
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const cards = container.querySelectorAll("[data-snap-card]");
		if (cards.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = Number((entry.target as HTMLElement).dataset.snapIndex);
						if (!Number.isNaN(idx)) {
							setActiveMobileIndex(idx);
						}
					}
				}
			},
			{
				root: container,
				threshold: 0.6,
			},
		);

		for (const card of cards) {
			observer.observe(card);
		}

		return () => observer.disconnect();
	}, []);

	if (prefersReducedMotion) {
		return <StaticTimeline stages={stages} complementary={complementary} />;
	}

	return (
		<LazyMotion features={domAnimation}>
			<section
				ref={sectionRef}
				className="px-4 py-24 sm:px-6 lg:py-32"
				aria-labelledby="journey-heading"
			>
				<div className="mx-auto max-w-7xl">
					{/* Section heading */}
					<div className="mb-16 text-center">
						<h2
							id="journey-heading"
							className="font-serif text-3xl font-bold text-text-primary md:text-4xl"
						>
							A jornada do aluno no ecossistema Grupo US
						</h2>
						<p className="mx-auto mt-4 max-w-2xl text-text-muted">
							Cinco estagios na ordem oficial da trilha; cada card usa os dados
							reais do produto.
						</p>
					</div>

					{/* Desktop: vertical layout with progress line */}
					<div className="relative hidden lg:block">
						{/* Progress line track (background) */}
						<div className="absolute left-6 top-0 h-full w-0.5 bg-gold/30" />
						{/* Progress line fill (animated) */}
						<m.div
							className="absolute left-6 top-0 h-full w-0.5 bg-gold"
							style={{
								scaleY: smoothLineScaleY,
								transformOrigin: "top",
							}}
						/>

						{/* Nodes */}
						<ol className="relative space-y-6 pl-16">
							{stages.map((stage, index) => (
								<li key={stage.slug}>
									{/* Dot on the progress line */}
									<div className="absolute left-4 mt-6 h-4 w-4 rounded-full border-2 border-gold bg-navy" />
									<AnimatedNode stage={stage} index={index} />
								</li>
							))}
						</ol>
					</div>

					{/* Mobile/Tablet: horizontal scroll-snap carousel */}
					<div className="lg:hidden">
						<div
							ref={scrollContainerRef}
							className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none"
							style={{ scrollbarWidth: "none" }}
						>
							{stages.map((stage, index) => (
								<div
									key={stage.slug}
									data-snap-card
									data-snap-index={index}
									className="w-[min(100vw-2rem,22rem)] shrink-0 snap-center"
								>
									<NodeCard stage={stage} />
								</div>
							))}
						</div>
						<MobileDots total={stages.length} activeIndex={activeMobileIndex} />
					</div>

					{/* Complementary experiences */}
					<ComplementarySection complementary={complementary} />
				</div>
			</section>
		</LazyMotion>
	);
}
