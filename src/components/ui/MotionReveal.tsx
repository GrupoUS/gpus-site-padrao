import {
	domAnimation,
	LazyMotion,
	useInView,
	useReducedMotion,
} from "motion/react";
import * as m from "motion/react-m";
import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface MotionRevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
}

export function MotionReveal({
	children,
	className,
	delay = 0,
}: MotionRevealProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });
	const prefersReducedMotion = useReducedMotion();

	if (prefersReducedMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<LazyMotion features={domAnimation}>
			<m.div
				ref={ref}
				className={cn(className)}
				initial={{ opacity: 0, y: 24 }}
				animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
				transition={{
					type: "spring",
					stiffness: 180,
					damping: 22,
					mass: 1,
					delay,
				}}
			>
				{children}
			</m.div>
		</LazyMotion>
	);
}
