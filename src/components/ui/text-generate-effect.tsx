import { motion, stagger, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
	words,
	className,
	filter = true,
	duration = 0.5,
}: {
	words: string;
	className?: string;
	filter?: boolean;
	duration?: number;
}) => {
	const [scope, animate] = useAnimate();
	const [runMotion, setRunMotion] = useState(false);
	const shouldReduce = useReducedMotion();
	const wordsArray = useMemo(() => words.split(" "), [words]);

	useEffect(() => {
		setRunMotion(true);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: new spans mount when `wordsArray` changes; `animate("span")` must run again for those nodes
	useEffect(() => {
		if (!runMotion) return;
		if (shouldReduce) {
			animate("span", { opacity: 1, filter: "none" }, { duration: 0 });
			return;
		}
		animate(
			"span",
			{
				opacity: 1,
				filter: filter ? "blur(0px)" : "none",
			},
			{
				duration: duration ? duration : 1,
				delay: stagger(0.2),
			},
		);
	}, [wordsArray, filter, duration, animate, runMotion, shouldReduce]);

	if (!runMotion) {
		return (
			<div className={cn("font-bold", className)}>
				<div className="mt-4">
					<p className="text-text-primary leading-snug tracking-wide">
						{words}
					</p>
				</div>
			</div>
		);
	}

	const renderWords = () => {
		return (
			<motion.div ref={scope}>
				{wordsArray.map((word, idx) => {
					const positionKey = wordsArray.slice(0, idx + 1).join(" ");
					return (
						<motion.span
							key={positionKey}
							className="text-text-primary opacity-0"
							style={{
								filter: filter ? "blur(10px)" : "none",
							}}
						>
							{word}{" "}
						</motion.span>
					);
				})}
			</motion.div>
		);
	};

	return (
		<div className={cn("font-bold", className)}>
			<div className="mt-4">
				<div className="text-text-primary text-2xl leading-snug tracking-wide">
					{renderWords()}
				</div>
			</div>
		</div>
	);
};
