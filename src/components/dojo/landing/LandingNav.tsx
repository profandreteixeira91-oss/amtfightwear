import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DojoLogo } from "@/components/dojo/DojoLogo";

const links = [
  { href: "#recursos", label: "Recursos" },
  { href: "#modulos", label: "Módulos" },
  { href: "#integracoes", label: "Integrações" },
  { href: "#ferramentas", label: "Ferramentas" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <a href="#top" className="flex items-center gap-2" aria-label="AMT Dojo Manager">
          <DojoLogo className="h-11 w-auto md:h-12" />
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[#111111]/70 transition-colors hover:text-[#C1121F]">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm" className="text-[#111111] hover:bg-black/5">
            <Link to="/dojo/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full bg-[#C1121F] px-5 text-white shadow-sm hover:bg-[#a30f1a]">
            <a href="#cta">Teste Grátis</a>
          </Button>
        </div>
        <button aria-label="Abrir menu" aria-expanded={open} className="-mr-2 grid h-11 w-11 place-items-center rounded-lg text-[#111111] md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-black/5 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[#111111]/80 hover:bg-black/5">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/dojo/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="flex-1 rounded-full bg-[#C1121F] text-white hover:bg-[#a30f1a]">
                <a href="#cta">Teste Grátis</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
