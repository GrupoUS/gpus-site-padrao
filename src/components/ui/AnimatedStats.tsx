import {
	animate,
	domAnimation,
	LazyMotion,
	useInView,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface StatItem {
	number: string;
	label: string;
}

interface AnimatedStatsProps {
	stats: StatItem[];
	className?: string;
}

/** Parse a display string like "+5.000" into { target, prefix, suffix, thousandsSep }. */
function parseStatValue(display: string): {
	target: number;
	prefix: string;
	suffix: string;
	thousandsSep: string;
} {
	// Extract leading non-digit prefix (e.g., "+")
	const prefixMatch = display.match(/^([^\d]*)/);
	const prefix = prefixMatch ? prefixMatch[1] : "";

	// Extract trailing non-digit suffix (e.g., "+")
	const suffixMatch = display.match(/([^\d]*)$/);
	const suffix = suffixMatch ? suffixMatch[1] : "";

	// Extract numeric core (e.g., "5.000" or "26")
	const numericStr = display.slice(
		prefix.length,
		display.length - (suffix.length || 0) || undefined,
	);

	// Detect thousands separator: "5.000" uses "." (Brazilian format)
	const hasDotThousands = /^\d{1,3}\.\d{3}$/.test(numericStr);
	const thousandsSep = hasDotThousands ? "." : "";

	// Parse to number
	const cleanNum = hasDotThousands ? numericStr.replace(/\./g, "") : numericStr;
	const target = Number.parseInt(cleanNum, 10) || 0;

	return { target, prefix, suffix, thousandsSep };
}

/** Format a number with Brazilian thousands separator. */
function formatNumber(value: number, thousandsSep: string): string {
	if (!thousandsSep) return String(value);
	return value.toLocaleString("pt-BR");
}

function CountUp({
	display,
	label,
}: {
	display: string;
	label: string;
	delay: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const spanRef = useRef<HTMLSpanElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.5 });
	const prefersReducedMotion = useReducedMotion();
	const { target, prefix, suffix, thousandsSep } = parseStatValue(display);
	const count = useMotionValue(0);
	const rounded = useTransform(count, (v) => Math.round(v));

	useEffect(() => {
		if (!isInView) return;
		if (prefersReducedMotion) {
			count.set(target);
			if (spanRef.current) {
				spanRef.current.textContent = `${prefix}${formatNumber(target, thousandsSep)}${suffix}`;
			}
			return;
		}
		const controls = animate(count, target, {
			duration: target <= 10 ? 1.5 : 2,
			ease: "easeOut",
		});
		return controls.stop;
	}, [
		isInView,
		target,
		count,
		prefersReducedMotion,
		prefix,
		suffix,
		thousandsSep,
	]);

	// Subscribe to rounded value changes and update DOM directly (no React re-renders)
	useEffect(() => {
		const unsubscribe = rounded.on("change", (v) => {
			if (spanRef.current) {
				spanRef.current.textContent = `${prefix}${formatNumber(v, thousandsSep)}${suffix}`;
			}
		});
		return unsubscribe;
	}, [rounded, prefix, suffix, thousandsSep]);

	return (
		<div
			ref={ref}
			className="text-center transition-transform duration-300 hover:scale-105"
		>
			<span
				ref={spanRef}
				className="block font-serif text-4xl font-bold text-gold md:text-5xl"
				style={{ textShadow: "0 0 30px rgba(212,175,55,0.3)" }}
			>
				{display}
			</span>
			<span className="mt-2 block text-sm text-text-muted md:text-base">
				{label}
			</span>
		</div>
	);
}

export function AnimatedStats({ stats, className }: AnimatedStatsProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });
	const prefersReducedMotion = useReducedMotion();

	if (prefersReducedMotion) {
		return (
			<div className={cn(className)}>
				<div className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-4 lg:divide-x lg:divide-gold/10">
					{stats.map((stat) => (
						<CountUp
							key={stat.label}
							display={stat.number}
							label={stat.label}
							delay={0}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<LazyMotion features={domAnimation}>
			<m.div
				ref={ref}
				className={cn(className)}
				initial={{ opacity: 0, scale: 0.96 }}
				animate={
					isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
				}
				transition={{
					type: "spring",
					stiffness: 200,
					damping: 25,
					mass: 1,
				}}
			>
				<div className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-4 lg:divide-x lg:divide-gold/10">
					{stats.map((stat, index) => (
						<m.div
							key={stat.label}
							initial={{ opacity: 0, y: 24 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								mass: 1,
								delay: index * 0.06,
							}}
						>
							<CountUp
								display={stat.number}
								label={stat.label}
								delay={index * 0.06}
							/>
						</m.div>
					))}
				</div>
			</m.div>
		</LazyMotion>
	);
}
