import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronsUpDown, Check, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { listMyStudents } from "@/lib/student/student.functions";
import { ACTIVE_STUDENT_STORAGE_KEY } from "@/integrations/supabase/active-student-attacher";

function readActive(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(ACTIVE_STUDENT_STORAGE_KEY); } catch { return null; }
}
function writeActive(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_STUDENT_STORAGE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
  } catch { /* noop */ }
}

/**
 * Botão discreto no cabeçalho do app do aluno. Aparece somente quando
 * o mesmo login está vinculado a mais de um aluno (pai + filho, irmãos).
 * Ao trocar, invalida caches e o router para carregar o outro perfil.
 */
export function StudentSwitcher({ currentName }: { currentName?: string | null }) {
  const listFn = useServerFn(listMyStudents);
  const { data } = useQuery({
    queryKey: ["student", "list-mine"],
    queryFn: () => listFn({}),
    staleTime: 60_000,
  });
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(() => readActive());

  type StudentItem = {
    id: string;
    full_name: string;
    photo_url: string | null;
    owner_id: string;
    unit_id: string | null;
    current_belt_id: string | null;
    current_degree: number | null;
  };
  const students: StudentItem[] = (data ?? []) as StudentItem[];

  useEffect(() => {
    // Se o id salvo não está mais entre os elegíveis, limpa.
    if (activeId && students.length && !students.some((s) => s.id === activeId)) {
      writeActive(null);
      setActiveId(null);
    }
  }, [activeId, students]);

  if (students.length <= 1) return null;

  const current = students.find((s) => s.id === activeId) ?? students[0];

  async function pick(id: string) {
    if (id === current?.id) {
      setOpen(false);
      return;
    }
    writeActive(id);
    setActiveId(id);
    setOpen(false);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch { /* noop */ }
    // Recarrega a página para garantir que todos os dados (SSR, caches, contextos)
    // reflitam imediatamente o aluno selecionado.
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      router.invalidate();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.photo_url ? (
          <img src={current.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <UserCircle2 className="h-4 w-4 text-neutral-500" />
        )}
        <span className="hidden max-w-[60px] truncate xs:inline sm:max-w-[110px] sm:inline">{current?.full_name?.split(" ")[0] ?? currentName?.split(" ")[0] ?? "Aluno"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
          >
            <div className="border-b border-neutral-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Trocar de aluno
            </div>
            <ul className="max-h-72 overflow-auto py-1">
              {students.map((s) => {
                const isActive = s.id === current?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-neutral-50 ${isActive ? "bg-neutral-50" : ""}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-neutral-500">
                          <UserCircle2 className="h-5 w-5" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{s.full_name}</span>
                      {isActive ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
