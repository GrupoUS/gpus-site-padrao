import { domAnimation, LazyMotion, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface Testimonial {
	name: string;
	role: string;
	quote: string;
}

interface TestimonialCarouselProps {
	testimonials: Testimonial[];
}

/* ── Quote Icon SVG ── */

function QuoteIcon() {
	return (
		<svg
			className="mb-4 h-8 w-8 text-gold/30"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
		</svg>
	);
}

/* ── Testimonial Card ── */

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	const initials = testimonial.name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("");

	return (
		<blockquote className="glass-card flex h-full flex-col rounded-2xl p-6 transition-all duration-300 md:p-8 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5">
			<QuoteIcon />

			<p className="flex-1 italic leading-relaxed text-text-primary">
				&ldquo;{testimonial.quote}&rdquo;
			</p>

			<footer className="mt-5 border-t border-gold/10 pt-4">
				<cite className="flex items-center gap-3 not-italic">
					<div
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 text-sm font-bold text-gold"
						aria-hidden="true"
					>
						{initials}
					</div>
					<div>
						<span className="block font-semibold text-text-primary">
							{testimonial.name}
						</span>
						<span className="mt-0.5 block text-sm text-text-muted">
							{testimonial.role}
						</span>
					</div>
				</cite>
			</footer>
		</blockquote>
	);
}

/* ── Dot Indicators ── */

function DotIndicators({
	total,
	current,
	onSelect,
}: {
	total: number;
	current: number;
	onSelect: (index: number) => void;
}) {
	return (
		<div className="mt-6 flex items-center justify-center gap-2">
			{Array.from({ length: total }, (_, i) => (
				<button
					key={`testimonial-dot-${String(i)}`}
					type="button"
					aria-label={`Depoimento ${String(i + 1)} de ${String(total)}`}
					onClick={() => onSelect(i)}
					className={cn(
						"rounded-full transition-all duration-200",
						i === current
							? "h-2.5 w-2.5 bg-gold"
							: "h-2 w-2 bg-gold/30 hover:bg-gold/60",
					)}
				/>
			))}
		</div>
	);
}

/* ── Static Grid Fallback (reduced motion) ── */

function StaticTestimonials({ testimonials }: { testimonials: Testimonial[] }) {
	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<h2 className="text-center font-serif text-3xl font-bold text-text-primary md:text-4xl">
					O que dizem nossos alunos
				</h2>

				<div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{testimonials.map((testimonial) => (
						<TestimonialCard key={testimonial.name} testimonial={testimonial} />
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Main Carousel ── */

export function TestimonialCarousel({
	testimonials,
}: TestimonialCarouselProps) {
	const prefersReducedMotion = useReducedMotion();
	const [currentIndex, setCurrentIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const [slideWidth, setSlideWidth] = useState(0);
	const [visibleCount, setVisibleCount] = useState(1);
	const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const gap = 24; // gap-6

	/* Measure slide width based on container */
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		function measure() {
			if (!container) return;
			const containerWidth = container.clientWidth;
			const width = window.innerWidth;

			let count: number;
			if (width >= 1024) {
				count = 3;
			} else if (width >= 640) {
				count = 2;
			} else {
				count = 1;
			}

			const totalGap = (count - 1) * gap;
			const cardWidth = (containerWidth - totalGap) / count;
			setVisibleCount(count);
			setSlideWidth(cardWidth + gap);
		}

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	const maxIndex = Math.max(0, testimonials.length - visibleCount);

	/* Autoplay */
	const stopAutoplay = useCallback(() => {
		if (autoplayRef.current) {
			clearInterval(autoplayRef.current);
			autoplayRef.current = null;
		}
	}, []);

	const startAutoplay = useCallback(() => {
		stopAutoplay();
		autoplayRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
		}, 4000);
	}, [maxIndex, stopAutoplay]);

	const resumeAutoplayDelayed = useCallback(() => {
		if (resumeTimeoutRef.current) {
			clearTimeout(resumeTimeoutRef.current);
		}
		resumeTimeoutRef.current = setTimeout(() => {
			startAutoplay();
		}, 8000);
	}, [startAutoplay]);

	useEffect(() => {
		if (prefersReducedMotion) return;
		startAutoplay();
		return () => {
			stopAutoplay();
			if (resumeTimeoutRef.current) {
				clearTimeout(resumeTimeoutRef.current);
			}
		};
	}, [startAutoplay, stopAutoplay, prefersReducedMotion]);

	/* Handlers */
	const handleMouseEnter = useCallback(() => {
		stopAutoplay();
	}, [stopAutoplay]);

	const handleMouseLeave = useCallback(() => {
		startAutoplay();
	}, [startAutoplay]);

	const handleDotSelect = useCallback(
		(index: number) => {
			setCurrentIndex(index);
			stopAutoplay();
			resumeAutoplayDelayed();
		},
		[stopAutoplay, resumeAutoplayDelayed],
	);

	const handleDragEnd = useCallback(
		(_: unknown, info: { offset: { x: number } }) => {
			if (info.offset.x < -50) {
				setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
			} else if (info.offset.x > 50) {
				setCurrentIndex((prev) => Math.max(prev - 1, 0));
			}
			stopAutoplay();
			resumeAutoplayDelayed();
		},
		[maxIndex, stopAutoplay, resumeAutoplayDelayed],
	);

	if (prefersReducedMotion) {
		return <StaticTestimonials testimonials={testimonials} />;
	}

	return (
		<LazyMotion features={domAnimation}>
			<section className="px-4 py-20 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<h2 className="text-center font-serif text-3xl font-bold text-text-primary md:text-4xl">
						O que dizem nossos alunos
					</h2>

					<section
						ref={containerRef}
						className="mt-14"
						aria-roledescription="carrossel"
						aria-label="Depoimentos de alunos"
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						{/* Carousel viewport */}
						<div className="cursor-grab overflow-hidden active:cursor-grabbing">
							<m.div
								className="flex"
								style={{ gap: `${String(gap)}px` }}
								drag="x"
								dragDirectionLock
								dragConstraints={{
									left: -(maxIndex * slideWidth),
									right: 0,
								}}
								dragElastic={0.1}
								onDragEnd={handleDragEnd}
								animate={{ x: -(currentIndex * slideWidth) }}
								transition={{
									type: "spring",
									stiffness: 300,
									damping: 30,
								}}
							>
								{testimonials.map((testimonial) => (
									<div
										key={testimonial.name}
										className="shrink-0"
										style={{
											width:
												slideWidth > 0
													? `${String(slideWidth - gap)}px`
													: "100%",
										}}
									>
										<TestimonialCard testimonial={testimonial} />
									</div>
								))}
							</m.div>
						</div>

						{/* Dot indicators */}
						<DotIndicators
							total={testimonials.length}
							current={currentIndex}
							onSelect={handleDotSelect}
						/>
					</section>
				</div>
			</section>
		</LazyMotion>
	);
}
