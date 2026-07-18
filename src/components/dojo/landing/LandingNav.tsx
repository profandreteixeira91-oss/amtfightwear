import { Link } from "@tanstack/react-router";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#recursos", label: "Recursos" },
  { href: "#modulos", label: "Módulos" },
  { href: "#integracoes", label: "Integrações" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#111111]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#111111] text-white">
            <Shield className="h-5 w-5" strokeWidth={2.2} />
          </span>
          AMT Dojo Manager
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
        <button aria-label="Menu" className="md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
