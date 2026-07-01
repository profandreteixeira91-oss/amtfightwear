import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Wand2, Instagram, MessageCircle, Mail, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { generateMarketingContent } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/market/content")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — IA Content Hub" }] }),
  component: ContentPage,
});

type Product = { id: string; name: string; category: string | null; price: number; image_url: string | null };
type Generated = { instagram: string; whatsapp: string; email_subject: string; email_body: string };

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("id,name,category,price,image_url").limit(500);
  if (error) throw error;
  return (data ?? []) as Product[];
}

function ContentPage() {
  const generate = useServerFn(generateMarketingContent);
  const { data: products, isLoading } = useQuery({ queryKey: ["products", "list"], queryFn: fetchProducts });

  const [productId, setProductId] = useState<string>("");
  const [objective, setObjective] = useState<"atacado" | "varejo">("atacado");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<Generated | null>(null);

  const product = useMemo(() => products?.find((p) => p.id === productId) ?? null, [products, productId]);
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    (products ?? []).forEach((p) => {
      const key = p.category ?? "Outros";
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Selecione um produto");
      return await generate({
        data: {
          productName: product.name,
          productCategory: product.category,
          productPrice: Number(product.price),
          objective,
          extraInstructions: extra || null,
        },
      });
    },
    onSuccess: (r) => {
      setResult(r as Generated);
      toast.success("Conteúdo gerado pela IA");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar conteúdo"),
  });

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="IA Content Hub"
        description="Copies reais geradas pela Lovable AI a partir do catálogo AMT Fight Wear."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Briefing" icon={Wand2}>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (products?.length ?? 0) === 0 ? (
            <EmptyState title="Nenhum produto disponível" description="Importe o catálogo antes de gerar conteúdo." />
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Produto em destaque</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {grouped.map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{cat}</div>
                        {items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Objetivo</Label>
                <Select value={objective} onValueChange={(v) => setObjective(v as "atacado" | "varejo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atacado">Atacado para Professores / Academias</SelectItem>
                    <SelectItem value="varejo">Venda Direta para Aluno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Instruções extras (opcional)</Label>
                <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ex.: foco em graduação, mencionar frete grátis acima de 20 unidades..." />
              </div>

              <Button className="w-full gap-2" disabled={!productId || mut.isPending} onClick={() => mut.mutate()}>
                {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...</> : <><Sparkles className="h-4 w-4" /> Gerar copies</>}
              </Button>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Preview" delay={0.1}>
          {!result ? (
            <EmptyState title="Preencha o briefing" description="A IA vai gerar copies para Instagram, WhatsApp e E-mail." />
          ) : (
            <Tabs defaultValue="ig">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ig"><Instagram className="mr-1 h-3 w-3" /> Instagram</TabsTrigger>
                <TabsTrigger value="wa"><MessageCircle className="mr-1 h-3 w-3" /> WhatsApp</TabsTrigger>
                <TabsTrigger value="em"><Mail className="mr-1 h-3 w-3" /> E-mail</TabsTrigger>
              </TabsList>
              <TabsContent value="ig">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="overflow-hidden">
                    {product?.image_url && (
                      <div className="aspect-square w-full bg-muted">
                        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 text-sm whitespace-pre-wrap">{result.instagram}</div>
                  </Card>
                </motion.div>
              </TabsContent>
              <TabsContent value="wa">
                <Card className="bg-[#0b141a] p-4">
                  <div className="ml-auto max-w-[85%] rounded-lg bg-[#005c4b] p-3 text-sm text-white whitespace-pre-wrap">{result.whatsapp}</div>
                </Card>
              </TabsContent>
              <TabsContent value="em">
                <Card className="p-4">
                  <div className="mb-2 text-xs text-muted-foreground">Assunto</div>
                  <div className="mb-4 font-semibold">{result.email_subject}</div>
                  <div className="text-sm whitespace-pre-wrap">{result.email_body}</div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SectionCard>
      </div>
    </>
  );
}
