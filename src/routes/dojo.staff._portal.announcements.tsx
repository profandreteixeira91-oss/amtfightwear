import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { listStaffAnnouncements, staffCreateAnnouncement } from "@/lib/dojo/staff-data.functions";
import { useStaffLevel } from "@/components/dojo/staff/staff-context";
import { StaffEmpty, StaffNoAccess, StaffPageHeader } from "@/components/dojo/staff/StaffShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatBR } from "@/lib/dates";

export const Route = createFileRoute("/dojo/staff/_portal/announcements")({
  head: () => ({
    meta: [
      { title: "Comunicação — Portal da Equipe" },
      { name: "description", content: "Comunicados internos do dojo no portal do professor." },
      { property: "og:title", content: "Comunicação — Portal da Equipe" },
      { property: "og:description", content: "Avisos e comunicados internos do dojo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffAnnouncements,
});

function StaffAnnouncements() {
  const level = useStaffLevel("announcements");
  const qc = useQueryClient();
  const listFn = useServerFn(listStaffAnnouncements);
  const createFn = useServerFn(staffCreateAnnouncement);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-announcements"],
    queryFn: () => listFn(),
    enabled: level !== "none",
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { title, content, priority: "normal" } }),
    onSuccess: () => {
      toast.success("Comunicado publicado");
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["staff-announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (level === "none") return <StaffNoAccess label="Comunicação" />;

  return (
    <div className="space-y-4">
      <StaffPageHeader title="Comunicação" subtitle="Quadro de avisos do dojo" readOnly={level === "read"} />

      {level === "write" && (
        <Card className="space-y-3 p-3">
          <div className="text-sm font-semibold">Novo comunicado</div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={8000} />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => create.mutate()}
              disabled={title.trim().length < 3 || content.trim().length < 3 || create.isPending}
            >
              Publicar
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </Card>
      ) : !data || data.length === 0 ? (
        <StaffEmpty message="Nenhum comunicado publicado." />
      ) : (
        <ul className="space-y-2">
          {data.map((a) => (
            <li key={a.id}>
              <Card className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>
                    {a.status === "published" ? "Publicado" : (a.status ?? "—")}
                  </Badge>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{a.summary ?? a.content}</p>
                <div className="text-[11px] text-muted-foreground">
                  {a.author_name ?? "Dojo"} · {formatBR(a.publish_at ?? a.created_at)}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
