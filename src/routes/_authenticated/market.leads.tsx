import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Loader2, Radar, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_LEADS, type Lead, type LeadType, type LeadStatus } from "@/lib/marketMock";

export const Route = createFileRoute("/_authenticated/market/leads")({
  head: () => ({ meta: [{ title: "Lead Scraper — AMT MarketEngine" }] }),
  component: LeadsPage,
});

const STATUS_COLOR: Record<LeadStatus, string> = {
  Novo: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  Contactado: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Negociando: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  Convertido: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Perdido: "bg-red-500/15 text-red-500 border-red-500/30",
};

function LeadsPage() {
  const [type, setType] = useState<LeadType | "todos">("todos");
  const [keyword, setKeyword] = useState("Academia de Jiu-Jitsu");
  const [location, setLocation] = useState("São Paulo, SP");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [scanned, setScanned] = useState(false);

  const startScrape = async () => {
    setLoading(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 2200));
    const filtered = MOCK_LEADS.filter((l) => (type === "todos" ? true : l.type === type));
    setResults(filtered);
    setLoading(false);
    setScanned(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Lead Scraper Especializado"
        description="Busca ativa de professores, academias e escolas de Jiu-Jitsu e Judô no Google Maps e redes sociais."
        actions={<Badge variant="secondary" className="gap-1"><Radar className="h-3 w-3" /> Busca Ativa</Badge>}
      />

      <SectionCard title="Configurar raspagem">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label className="mb-2 block text-xs">Tipo de Lead</Label>
            <Select value={type} onValueChange={(v) => setType(v as LeadType | "todos")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Professor">Professores</SelectItem>
                <SelectItem value="Academia">Academias</SelectItem>
                <SelectItem value="Escola/Projeto Social">Escolas / Projetos Sociais</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="mb-2 block text-xs">Palavra-chave</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder='Ex: "Academia de Jiu-Jitsu"' />
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-xs">Localização</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? "Varrendo Google Maps e Instagram…" : "Fontes: Google Maps · Instagram · Facebook"}
          </p>
          <Button onClick={startScrape} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</> : <><Radar className="h-4 w-4" /> Iniciar Busca Ativa de Leads</>}
          </Button>
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard title={`Resultados ${results.length ? `(${results.length})` : ""}`}>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="relative mb-4 h-16 w-16">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  <div className="absolute inset-0 grid place-items-center rounded-full bg-primary/20">
                    <Radar className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-medium">Analisando "{keyword}" em {location}…</p>
                <p className="mt-1 text-xs text-muted-foreground">Cruzando dados públicos e enriquecendo contatos.</p>
              </motion.div>
            )}
            {!loading && results.length > 0 && (
              <motion.div key="table" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome / Academia</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Fonte</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((l, i) => (
                        <motion.tr
                          key={l.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b transition-colors hover:bg-muted/40"
                        >
                          <TableCell>
                            <div className="font-medium">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{l.responsible} · {l.type}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3 text-muted-foreground" /> {l.phone}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {l.email}</div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{l.modality}</Badge></TableCell>
                          <TableCell className="text-sm">{l.city}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.source}</TableCell>
                          <TableCell><Badge variant="outline" className={STATUS_COLOR[l.status]}>{l.status}</Badge></TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}
            {!loading && !results.length && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {scanned ? "Nenhum resultado para os filtros." : "Configure os filtros e inicie a busca ativa para popular os leads."}
              </div>
            )}
          </AnimatePresence>
        </SectionCard>
      </div>
    </>
  );
}
