import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, Bot, Zap, Clock, CheckCircle2, AlertCircle, Play, Pause,
  LayoutDashboard, List, LayoutList, MessageSquare, Activity, History,
  Plus, Filter, Search, Download, Trash2, Send, RotateCcw
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMacroDashboardStats,
  listMacroQueues,
  listMacroCampaigns,
  createMacroQueue,
  getTopLeadsForMacro,
  buildAutoQueues,
  startMacroQueue,
  deleteMacroQueue
} from "@/lib/prospect/macro-dm.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/macro")({
  head: () => ({
    meta: [
      { title: "Macro DM — Extensão Chrome | Dojo Manager" },
      { name: "description", content: "Gerencie automações de DMs no Instagram com filas inteligentes e CRM integrado." },
    ],
  }),
  component: MacroRefactorPage,
});

function MacroRefactorPage() {
  const getStats = useServerFn(getMacroDashboardStats);
  const getQueues = useServerFn(listMacroQueues);
  const getCampaigns = useServerFn(listMacroCampaigns);
  const getTopLeads = useServerFn(getTopLeadsForMacro);
  const autoBuild = useServerFn(buildAutoQueues);
  const startQueue = useServerFn(startMacroQueue);
  const deleteQueue = useServerFn(deleteMacroQueue);

  const statsQ = useQuery({
    queryKey: ["macro-dm", "stats"],
    queryFn: () => getStats(),
  });

  const leadsQ = useQuery({
    queryKey: ["macro-dm", "top-leads"],
    queryFn: () => getTopLeads(),
  });

  const queuesQ = useQuery({
    queryKey: ["macro-dm", "queues"],
    queryFn: () => getQueues(),
  });

  const campaignsQ = useQuery({
    queryKey: ["macro-dm", "campaigns"],
    queryFn: () => getCampaigns(),
  });

  const stats = statsQ.data || { totalLeads: 0, igLeads: 0, queues: [], sentToday: 0 };
  const queues = queuesQ.data || [];
  const topLeads = leadsQ.data || [];

  return (
    <PageShell
      eyebrow="MarketEngine"
      title="Macro DM"
      description="Refatoração completa: filas inteligentes, dashboard premium e alta estabilidade."
    >
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-background/50 backdrop-blur-sm border p-1 h-12">
          <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="leads" className="gap-2"><Users className="h-4 w-4" /> Leads</TabsTrigger>
          <TabsTrigger value="filas" className="gap-2"><LayoutList className="h-4 w-4" /> Filas Inteligentes</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-2"><MessageSquare className="h-4 w-4" /> Campanhas</TabsTrigger>
          <TabsTrigger value="execucao" className="gap-2"><Activity className="h-4 w-4" /> Execução</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><History className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-emerald-500/50 group">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
                <Download className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">MACRO DM v2.1.5</h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium max-w-md">
                  Arquivo ZIP disponível diretamente no servidor. Download garantido sem links externos.
                </p>
              </div>
            </div>
            <Button 
              size="lg" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-14 rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all gap-3 text-lg" 
              asChild
            >
              <a 
                href="/api/public/download-extension" 
                className="inline-flex items-center gap-3"
              >
                <Download className="h-5 w-5" /> Iniciar Download Direto
              </a>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total de Leads" value={stats.totalLeads} icon={Users} />
            <StatCard label="Disponíveis (IG)" value={stats.igLeads} icon={Bot} />
            <StatCard label="Filas Ativas" value={queues.filter((q: any) => q.status === 'executing').length} icon={LayoutList} />
            <StatCard label="Enviados Hoje" value={stats.sentToday} icon={Zap} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Filas em Execução" description="Acompanhe o progresso das automações ativas.">
               {queues.length === 0 ? (
                 <div className="py-8 text-center text-muted-foreground italic">Nenhuma fila criada.</div>
               ) : (
                 <div className="space-y-4">
                    {queues.slice(0, 3).map((q: any) => (
                      <div key={q.id} className="p-4 rounded-xl border bg-muted/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{q.name}</span>
                          <Badge variant={q.status === 'executing' ? 'default' : 'outline'}>{q.status}</Badge>
                        </div>
                        <Progress value={(q.processed_leads / (q.total_leads || 1)) * 100} className="h-2" />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{q.processed_leads} de {q.total_leads} leads</span>
                          <span>{Math.round((q.processed_leads / (q.total_leads || 1)) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </SectionCard>
            
            <SectionCard title="Desempenho da Semana" description="Métricas de conversão e envios.">
              <div className="h-48 flex items-center justify-center border rounded-xl bg-muted/10 border-dashed">
                <span className="text-sm text-muted-foreground">Gráficos de desempenho (v2.1)</span>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <SectionCard title="Gerenciamento de Leads" description="Filtre e organize seus leads para campanhas.">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input className="w-full bg-background border rounded-lg pl-10 pr-4 h-10 text-sm" placeholder="Pesquisar melhores leads..." />
              </div>
              <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filtros</Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
               <div className="divide-y">
                 {topLeads.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic">
                      Nenhum lead com Instagram encontrado para automação.
                    </div>
                 ) : (
                   topLeads.map((lead: any) => (
                     <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {lead.name?.charAt(0) || "L"}
                           </div>
                           <div>
                              <div className="font-semibold text-sm">{lead.name}</div>
                              <div className="text-xs text-primary font-medium flex items-center gap-1">
                                 <Bot className="h-3 w-3" /> @{lead.instagram || "não definido"}
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden sm:block">
                              <div className="text-xs text-muted-foreground">Score</div>
                              <div className="text-sm font-bold text-emerald-600">{lead.score || 0}</div>
                           </div>
                           <Badge variant="outline">{lead.status || "Novo"}</Badge>
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Plus className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="filas">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Minas de Leads</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={async () => {
                  const res = await autoBuild();
                  if (res.created > 0) {
                    toast.success(`${res.created} novas filas criadas automaticamente!`);
                    queuesQ.refetch();
                  } else {
                    toast.info("Nenhuma nova fila para criar.");
                  }
                }}
              >
                <Zap className="h-4 w-4 text-amber-500" /> Construir Filas Automáticas
              </Button>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all" asChild>
                <a 
                  href="/api/public/download-extension" 
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> Baixar Macro DM v2.1
                </a>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {queues.length === 0 ? (
               <div className="col-span-full py-12 text-center border-2 border-dashed rounded-2xl text-muted-foreground italic">
                 Nenhuma mina de leads encontrada. Use "Construir Filas Automáticas" para começar.
               </div>
             ) : (
               queues.map((q: any) => (
                 <div key={q.id} className="p-5 rounded-2xl border bg-card hover:border-primary/50 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <LayoutList className="h-5 w-5" />
                      </div>
                      <Badge variant={q.status === 'executing' ? 'default' : 'secondary'}>
                        {q.status === 'executing' ? 'Em execução' : q.status === 'waiting' ? 'Aguardando' : q.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-lg mb-1">{q.name}</h4>
                    <p className="text-[10px] text-muted-foreground mb-4 uppercase tracking-wider font-semibold">
                      {q.campaign?.name || "Sem Campanha"} • {new Date(q.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso de Envio</span>
                        <span className="font-bold">{q.processed_leads || 0}/{q.total_leads || 0}</span>
                      </div>
                      <Progress value={((q.processed_leads || 0) / (q.total_leads || 1)) * 100} className="h-1.5" />
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <Button 
                        size="sm" 
                        className="flex-1 gap-2"
                        disabled={q.status === 'executing'}
                        onClick={async () => {
                          try {
                            console.log("Iniciando fila:", q.id);
                            const res = await startQueue({ data: q.id });
                            console.log("Resposta iniciar:", res);
                            toast.success("Fila iniciada!");
                            queuesQ.refetch();
                          } catch (err) {
                            console.error("Erro ao iniciar fila:", err);
                            toast.error("Erro ao iniciar fila.");
                          }
                        }}
                      >
                        <Play className="h-3 w-3" /> {q.status === 'executing' ? 'Rodando...' : 'Iniciar'}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (confirm("Excluir esta fila?")) {
                            await deleteQueue(q.id);
                            toast.success("Fila removida.");
                            queuesQ.refetch();
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                 </div>
               ))
             )}
          </div>
        </TabsContent>
        
        <TabsContent value="execucao">
           <SectionCard title="Painel de Execução" description="Acompanhe a automação em tempo real.">
              <div className="grid gap-6 lg:grid-cols-3">
                 <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl border bg-primary/5 border-primary/20 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                             <RotateCcw className="h-6 w-6 animate-spin" />
                          </div>
                          <div>
                             <div className="text-xs font-semibold text-emerald-600 uppercase">Executando Agora</div>
                             <div className="text-xl font-bold">Aguardando Cooldown...</div>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="outline" className="gap-2"><Pause className="h-4 w-4" /> Pausar</Button>
                          <Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" /> Cancelar</Button>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Próximo Envio</div>
                       <div className="p-6 rounded-2xl border bg-card">
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-6 w-6" />
                             </div>
                             <div className="flex-1">
                                <div className="font-bold">@usuario_instagram</div>
                                <div className="text-xs text-muted-foreground">Academia em São Paulo</div>
                             </div>
                             <Badge variant="outline">Aguardando 45s</Badge>
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="rounded-2xl border bg-card flex flex-col h-[500px]">
                    <div className="p-4 border-b font-bold flex items-center gap-2"><Activity className="h-4 w-4" /> Logs em Tempo Real</div>
                    <ScrollArea className="flex-1 p-4">
                       <div className="space-y-2 font-mono text-[10px]">
                          <div className="text-emerald-500">[14:20:01] Fila SP iniciada com sucesso</div>
                          <div className="text-blue-500">[14:20:05] Buscando lead @academia_sp...</div>
                          <div className="text-blue-500">[14:20:08] Perfil encontrado. Carregando automação.</div>
                          <div className="text-emerald-500">[14:20:15] Mensagem enviada para @academia_sp</div>
                          <div className="text-amber-500">[14:20:16] Iniciando cooldown de 45 segundos</div>
                       </div>
                    </ScrollArea>
                 </div>
              </div>
           </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 dark:text-amber-300">
          <p className="font-bold mb-1">Nota de Segurança:</p>
          O sistema de Macro DM utiliza a extensão oficial para simular comportamento humano. 
          Nunca envie mensagens em massa em intervalos curtos para evitar bloqueios temporários do Instagram.
          A refatoração v2.0 inclui logs completos e recuperação automática de erros.
        </div>
      </div>
    </PageShell>
  );
}
