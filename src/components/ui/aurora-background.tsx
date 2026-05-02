import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends ComponentPropsWithoutRef<"div"> {
	children: ReactNode;
	showRadialGradient?: boolean;
}

export const AuroraBackground = ({
	className,
	children,
	showRadialGradient = true,
	...props
}: AuroraBackgroundProps) => {
	return (
		<div
			className={cn(
				"transition-bg relative flex h-[100vh] flex-col items-center justify-center bg-navy",
				className,
			)}
			{...props}
		>
			<div
				className="absolute inset-0 overflow-hidden"
				style={
					{
						"--aurora":
							"repeating-linear-gradient(100deg,var(--color-gold)_10%,var(--color-gold-light)_15%,var(--color-navy-lighter)_20%,var(--color-gold-dark)_25%,var(--color-gold)_30%)",
						"--dark-gradient":
							"repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)",
						"--black": "#000",
						"--transparent": "transparent",
					} as CSSProperties
				}
			>
				<div
					className={cn(
						`after:animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--dark-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-50 blur-[10px] will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--color-gold)_10%,var(--color-gold-light)_15%,var(--color-navy-lighter)_20%,var(--color-gold-dark)_25%,var(--color-gold)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] after:absolute after:inset-0 after:[background-image:var(--dark-gradient),var(--aurora)] after:[background-size:200%,_100%] after:mix-blend-difference after:content-[""]`,

						showRadialGradient &&
							`[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`,
					)}
				></div>
			</div>
			{children}
		</div>
	);
};
