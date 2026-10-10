import { Instagram, Facebook, Youtube } from "lucide-react";
import { DojoLogo } from "@/components/dojo/DojoLogo";

const groups = [
  { title: "Produto", links: [{ label: "Recursos", href: "#recursos" }, { label: "Módulos", href: "#modulos" }, { label: "Planos", href: "#planos" }] },
  { title: "Empresa", links: [{ label: "AMT Fight Wear", href: "https://amtfightwear.com.br" }, { label: "Contato", href: "mailto:contato@amtfightwear.com.br" }] },
  { title: "Legal", links: [{ label: "Política de Privacidade", href: "/privacy" }, { label: "Termos de Uso", href: "/terms" }] },
];

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <DojoLogo className="h-16 w-auto" />
            <p className="mt-4 max-w-xs text-sm text-[#111111]/55">
              Software de gestão completo para academias de artes marciais.
            </p>
            <div className="mt-5 flex gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" aria-label="Redes sociais AMT Dojo Manager" className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-[#111111]/70 transition-colors hover:border-[#C1121F] hover:text-[#C1121F]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.title} className="min-w-0">
              <p className="text-sm font-semibold text-[#111111]">{g.title}</p>
              <ul className="mt-2 text-sm">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="inline-flex min-h-11 items-center text-[#111111]/60 transition-colors hover:text-[#C1121F]">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 text-xs text-[#111111]/50 md:flex-row">
          <span>© {new Date().getFullYear()} AMT Dojo Manager. Todos os direitos reservados.</span>
          <span>Feito com dedicação para academias que buscam excelência.</span>
        </div>
      </div>
    </footer>
  );
}
