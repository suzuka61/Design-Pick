"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

interface SplitTextProps {
  text: string;
  className?: string;
  splitType?: "chars" | "words";
  delay?: number;
  duration?: number;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
  textAlign?: React.CSSProperties["textAlign"];
  from?: { opacity?: number; y?: number; x?: number };
  to?: { opacity?: number; y?: number; x?: number };
  onComplete?: () => void;
}

export function SplitText({
  text,
  className = "",
  splitType = "chars",
  delay = 50,
  duration = 1.25,
  tag: Tag = "p",
  textAlign = "center",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  onComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  const units = splitType === "words" ? text.split(" ") : text.split("");
  const shouldAnimate = isInView && fontsLoaded;

  if (shouldAnimate && !completedRef.current && onComplete) {
    const totalTime = (units.length - 1) * (delay / 1000) + duration;
    const timer = setTimeout(() => {
      completedRef.current = true;
      onComplete();
    }, totalTime * 1000);
    void timer;
  }

  return (
    <div ref={ref} style={{ textAlign, overflow: "visible" }}>
      <Tag className={className} style={{ display: "inline-block", whiteSpace: "normal", wordWrap: "break-word" }}>
        {units.map((unit, i) => (
          <motion.span
            key={i}
            style={{ display: "inline-block", willChange: "transform, opacity" }}
            initial={from}
            animate={shouldAnimate ? to : from}
            transition={{
              duration,
              delay: i * (delay / 1000),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {unit === " " ? " " : unit}
            {splitType === "words" && i < units.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </Tag>
    </div>
  );
}
