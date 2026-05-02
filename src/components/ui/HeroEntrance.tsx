import {
	domAnimation,
	LazyMotion,
	useInView,
	useReducedMotion,
} from "motion/react";
import * as m from "motion/react-m";
import { Children, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface HeroEntranceProps {
	children: ReactNode;
	className?: string;
	stagger?: number;
}

export function HeroEntrance({
	children,
	className,
	stagger = 0.08,
}: HeroEntranceProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });
	const prefersReducedMotion = useReducedMotion();
	const childArray = Children.toArray(children);

	if (prefersReducedMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<LazyMotion features={domAnimation}>
			<m.div ref={ref} className={cn(className)}>
				{childArray.map((child, i) => (
					<m.div
						key={`hero-entrance-${String(i)}`}
						initial={{ opacity: 0, y: 24 }}
						animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							mass: 1,
							delay: i * stagger,
						}}
					>
						{child}
					</m.div>
				))}
			</m.div>
		</LazyMotion>
	);
}
