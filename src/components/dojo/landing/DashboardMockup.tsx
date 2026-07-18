import { motion } from "framer-motion";
import { Users, DollarSign, Award, TrendingUp, Calendar, Bell } from "lucide-react";

export function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative"
    >
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[#C1121F]/10 via-transparent to-black/5 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        {/* Chrome */}
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="mx-auto rounded-md bg-white px-3 py-1 text-[10px] text-neutral-400 shadow-sm">
            app.amtdojomanager.com
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 p-4 sm:p-5">
          {/* Sidebar */}
          <aside className="col-span-3 space-y-1.5">
            {["Dashboard", "Alunos", "Turmas", "Financeiro", "Graduações", "Loja"].map((l, i) => (
              <div
                key={l}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] ${
                  i === 0 ? "bg-[#111111] text-white" : "text-neutral-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-[#C1121F]" : "bg-neutral-300"}`} />
                {l}
              </div>
            ))}
          </aside>

          {/* Main */}
          <main className="col-span-9 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Visão geral</p>
                <p className="text-sm font-semibold text-[#111111]">Bem-vindo, Professor</p>
              </div>
              <Bell className="h-4 w-4 text-neutral-400" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Users, label: "Alunos", value: "248", tint: "text-[#C1121F]" },
                { icon: DollarSign, label: "Receita", value: "R$ 42k", tint: "text-emerald-600" },
                { icon: Award, label: "Graduações", value: "18", tint: "text-[#111111]" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-black/5 bg-white p-2.5 shadow-sm">
                  <s.icon className={`h-3.5 w-3.5 ${s.tint}`} />
                  <p className="mt-1 text-[9px] text-neutral-400">{s.label}</p>
                  <p className="text-sm font-bold text-[#111111]">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#111111]">Frequência semanal</p>
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              </div>
              <div className="flex h-16 items-end gap-1.5">
                {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.8, delay: 0.6 + i * 0.08 }}
                    className={`flex-1 rounded-t ${i === 5 ? "bg-[#C1121F]" : "bg-neutral-200"}`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#111111]">
                <Calendar className="h-3 w-3" /> Próximas aulas
              </div>
              <div className="space-y-1.5">
                {["Jiu-Jitsu Kids · 18h", "No-Gi Avançado · 19h30", "Judô Adulto · 21h"].map((t) => (
                  <div key={t} className="flex items-center justify-between rounded-md bg-neutral-50 px-2 py-1.5 text-[10px] text-neutral-600">
                    <span>{t}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[9px] text-emerald-600">confirmado</span>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 shadow-lg sm:flex"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#C1121F]/10 text-[#C1121F]">
          <Award className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] text-neutral-400">Nova graduação</p>
          <p className="text-xs font-semibold text-[#111111]">Faixa Roxa emitida</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
