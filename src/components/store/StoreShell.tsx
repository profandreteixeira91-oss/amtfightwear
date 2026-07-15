import { Link } from "@tanstack/react-router";
import { ShoppingBag, Search, User, Menu, Instagram, Truck, ShieldCheck, CreditCard } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useEffect, useState, type ReactNode } from "react";
import amtLogo from "@/assets/amt-logo.jpg";

export function StoreShell({ children, categories }: { children: ReactNode; categories?: Array<{ slug: string; name: string }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="bg-foreground text-background text-[11px] uppercase tracking-widest">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <span>Frete grátis acima de R$ 399 · Parcelamos em até 10x</span>
          <a href="https://instagram.com/amtfightwear" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 hover:text-primary">
            <Instagram className="h-3 w-3" /> @amtfightwear
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button className="md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/loja" className="flex items-center gap-2">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-9 w-9 rounded object-cover" />
            <div className="leading-tight">
              <div className="text-sm font-black tracking-tight">AMT</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fight Wear</div>
            </div>
          </Link>

          <div className="hidden md:flex flex-1 items-center rounded-md border bg-muted/40 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar kimono, rashguard, faixa..."
              className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/auth" className="hidden sm:inline-flex items-center gap-1 text-sm hover:text-primary">
              <User className="h-4 w-4" />
              <span className="hidden lg:inline">Minha conta</span>
            </Link>
            <Link to="/loja/carrinho" className="relative inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-accent">
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">Carrinho</span>
              {mounted && count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categories nav */}
        {categories && categories.length > 0 && (
          <nav className="border-t bg-background">
            <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm font-medium">
              <Link to="/loja" className="whitespace-nowrap text-foreground hover:text-primary">Início</Link>
              {categories.slice(0, 10).map((c) => (
                <Link
                  key={c.slug}
                  to="/loja/categoria/$slug"
                  params={{ slug: c.slug }}
                  className="whitespace-nowrap text-foreground hover:text-primary"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Benefits strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">Frete para todo Brasil</div>
              <div className="text-xs text-muted-foreground">Melhor Envio · rastreamento</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">10x sem juros</div>
              <div className="text-xs text-muted-foreground">Cartão, PIX ou boleto</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">Compra segura</div>
              <div className="text-xs text-muted-foreground">Site protegido · trocas fáceis</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-black">AMT Fight Wear</div>
            <p className="mt-2 text-xs text-background/70">Equipamentos de artes marciais para atletas exigentes. Kimonos, rashguards, faixas e mais.</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Institucional</div>
            <ul className="mt-3 space-y-2 text-sm text-background/80">
              <li><Link to="/loja">Sobre a AMT</Link></li>
              <li><a href="#">Blog</a></li>
              <li><Link to="/privacy">Privacidade</Link></li>
              <li><Link to="/terms">Termos</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Ajuda</div>
            <ul className="mt-3 space-y-2 text-sm text-background/80">
              <li><a href="#">Trocas e devoluções</a></li>
              <li><a href="#">Prazo de entrega</a></li>
              <li><a href="#">Formas de pagamento</a></li>
              <li><a href="#">Contato</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Siga a AMT</div>
            <a href="https://instagram.com/amtfightwear" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-background/80 hover:text-primary">
              <Instagram className="h-4 w-4" /> @amtfightwear
            </a>
          </div>
        </div>
        <div className="border-t border-background/10">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-[11px] text-background/60">
            © {new Date().getFullYear()} AMT Fight Wear — Todos os direitos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ProductCard({ product }: { product: { id: string; name: string; slug: string | null; price: number | string; compare_at_price?: number | string | null; image_url?: string | null; short_description?: string | null } }) {
  const price = Number(product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const hasDiscount = compareAt && compareAt > price;
  const installments = (price / 10).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Link
      to="/loja/produto/$slug"
      params={{ slug: product.slug ?? product.id }}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
        )}
        {hasDiscount && (
          <div className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
            -{Math.round(((compareAt! - price) / compareAt!) * 100)}%
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</h3>
        <div className="mt-auto pt-2">
          {hasDiscount && (
            <div className="text-xs text-muted-foreground line-through">
              {compareAt!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          )}
          <div className="text-lg font-bold text-foreground">
            {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div className="text-[11px] text-muted-foreground">ou 10x de {installments}</div>
        </div>
      </div>
    </Link>
  );
}
