import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Props = {
  title?: string;
  className?: string;
  variant?: "light" | "dark";
};

/** Faixa de CTA reutilizada em praticamente todas as seções. */
export function CTABand({ title = "Comece hoje a organizar sua academia.", className = "", variant = "light" }: Props) {
  const dark = variant === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={`mx-auto mt-14 flex max-w-4xl flex-col items-center gap-4 rounded-3xl border p-7 text-center md:p-9 ${
        dark ? "border-white/10 bg-[#111111] text-white" : "border-black/10 bg-[#FAFAFA] text-[#111111]"
      } ${className}`}
    >
      <h3 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h3>
      <Button
        asChild
        size="lg"
        className="group min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white shadow-lg shadow-[#C1121F]/25 hover:bg-[#a30f1a]"
      >
        <a href="/dojo/auth">
          COMEÇAR TESTE GRATUITO
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </Button>
      <p className={`text-xs ${dark ? "text-white/60" : "text-[#111111]/60"}`}>
        14 dias grátis • Sem cartão • Sem compromisso
      </p>
    </motion.div>
  );
}
