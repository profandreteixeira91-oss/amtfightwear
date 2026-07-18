import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  align?: "left" | "center";
};

export function Section({ id, eyebrow, title, description, children, className = "", align = "center" }: Props) {
  return (
    <section id={id} className={`px-4 py-20 md:px-6 md:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className={`mb-12 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
        >
          {eyebrow && (
            <span className="inline-block rounded-full border border-[#C1121F]/20 bg-[#C1121F]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C1121F]">
              {eyebrow}
            </span>
          )}
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#111111] md:text-4xl lg:text-5xl">
            {title}
          </h2>
          {description && <p className="mt-4 text-base text-[#111111]/60 md:text-lg">{description}</p>}
        </motion.div>
        {children}
      </div>
    </section>
  );
}

export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
