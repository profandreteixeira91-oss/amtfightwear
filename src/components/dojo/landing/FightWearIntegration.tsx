import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import kimonoImg from "@/assets/dojo/product-kimono.jpg";
import faixaImg from "@/assets/dojo/product-faixa.jpg";
import patchImg from "@/assets/dojo/product-patch.jpg";
import lojaImg from "@/assets/dojo/product-loja.jpg";

const cards = [
  { img: kimonoImg, label: "Kimonos", desc: "Modelos oficiais e personalizados" },
  { img: faixaImg, label: "Faixas", desc: "Todas as graduações disponíveis" },
  { img: patchImg, label: "Patches", desc: "Bordado da sua academia" },
  { img: lojaImg, label: "Loja Online", desc: "Compras direto pelo sistema" },
];

export function FightWearIntegration() {
  return (
    <section id="fightwear" className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#111111] to-[#1a1a1a] p-8 md:p-14">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <ShoppingBag className="h-3.5 w-3.5 text-[#C1121F]" />
              AMT Fight Wear · Parceria oficial
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight !text-white md:text-4xl lg:text-5xl">
              Sua academia conectada à <span className="text-[#C1121F]">fábrica</span>.
            </h2>
            <p className="mt-5 max-w-lg text-base text-white/70">
              O AMT Dojo Manager integra diretamente com a AMT Fight Wear, permitindo que academias solicitem faixas, kimonos, patches e produtos personalizados sem sair do sistema.
            </p>
            <Button asChild size="lg" className="mt-8 group rounded-full bg-[#C1121F] text-white hover:bg-[#a30f1a]">
              <a href="#cta">
                Conhecer integração
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur transition-all hover:border-[#C1121F]/50 hover:bg-white/[0.06]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>
                <div className="p-5">
                  <p className="text-base font-semibold !text-white">{c.label}</p>
                  <p className="mt-1 text-xs text-white/60">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
