import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Animated lamp visuals only. Compose with Astro markup as a sibling so CTAs stay static HTML (data-reveal, Button.astro). */
export const LampBackdrop = ({ className }: { className?: string }) => {
	const shouldReduce = useReducedMotion();

	if (shouldReduce) {
		return (
			<div
				className={cn(
					"relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0",
					className,
				)}
			>
				<div
					style={{
						backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
					}}
					className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-gold via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
				>
					<div className="absolute w-[100%] left-0 bg-navy h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
					<div className="absolute w-40 h-[100%] left-0 bg-navy bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
				</div>
				<div
					style={{
						backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
					}}
					className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-gold text-white [--conic-position:from_290deg_at_center_top]"
				>
					<div className="absolute w-40 h-[100%] right-0 bg-navy bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
					<div className="absolute w-[100%] right-0 bg-navy h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
				</div>
				<div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-navy blur-2xl" />
				<div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
				<div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-gold opacity-50 blur-3xl" />
				<div className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-gold-light blur-2xl" />
				<div className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-gold-light" />
				<div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-navy" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0",
				className,
			)}
		>
			<motion.div
				initial={{ opacity: 0.5, scaleX: 0.5 }}
				whileInView={{ opacity: 1, scaleX: 1 }}
				transition={{
					delay: 0.3,
					duration: 0.8,
					ease: "easeInOut",
				}}
				style={{
					backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
					transformOrigin: "right center",
				}}
				className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-gold via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
			>
				<div className="absolute w-[100%] left-0 bg-navy h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
				<div className="absolute w-40 h-[100%] left-0 bg-navy bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
			</motion.div>
			<motion.div
				initial={{ opacity: 0.5, scaleX: 0.5 }}
				whileInView={{ opacity: 1, scaleX: 1 }}
				transition={{
					delay: 0.3,
					duration: 0.8,
					ease: "easeInOut",
				}}
				style={{
					backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
					transformOrigin: "left center",
				}}
				className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-gold text-white [--conic-position:from_290deg_at_center_top]"
			>
				<div className="absolute w-40 h-[100%] right-0 bg-navy bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
				<div className="absolute w-[100%] right-0 bg-navy h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
			</motion.div>
			<div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-navy blur-2xl" />
			<div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
			<div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-gold opacity-50 blur-3xl" />
			<motion.div
				initial={{ scaleX: 0.5 }}
				whileInView={{ scaleX: 1 }}
				transition={{
					delay: 0.3,
					duration: 0.8,
					ease: "easeInOut",
				}}
				style={{ transformOrigin: "center center" }}
				className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-gold-light blur-2xl"
			/>
			<motion.div
				initial={{ scaleX: 0.5 }}
				whileInView={{ scaleX: 1 }}
				transition={{
					delay: 0.3,
					duration: 0.8,
					ease: "easeInOut",
				}}
				style={{ transformOrigin: "center center" }}
				className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-gold-light"
			/>

			<div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-navy" />
		</div>
	);
};
