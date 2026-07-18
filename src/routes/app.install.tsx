import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Share, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/app/install")({
  head: () => ({ meta: [{ title: "Instalar — Portal do Aluno" }, { name: "robots", content: "noindex" }] }),
  component: InstallPage,
});

function InstallPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg">
        <Smartphone className="h-8 w-8" />
      </div>
      <h1 className="text-center text-2xl font-bold">Instalar no seu celular</h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        O portal funciona como um aplicativo. Adicione à tela inicial em poucos segundos.
      </p>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
        <h2 className="text-sm font-semibold">📱 iPhone / iPad (Safari)</h2>
        <ol className="mt-3 space-y-2 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span>Toque no ícone <b>Compartilhar</b>.</span>
          </li>
          <li>2. Role para baixo e toque em <b>“Adicionar à Tela de Início”</b>.</li>
          <li>3. Confirme em <b>Adicionar</b>. O ícone aparece na sua tela.</li>
        </ol>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
        <h2 className="text-sm font-semibold">🤖 Android (Chrome)</h2>
        <ol className="mt-3 space-y-2 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Toque no menu <b>⋮</b> no canto superior.</span>
          </li>
          <li>2. Escolha <b>“Instalar aplicativo”</b> ou <b>“Adicionar à tela inicial”</b>.</li>
          <li>3. Confirme para instalar.</li>
        </ol>
      </section>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Após instalar, abra pelo ícone criado — o portal funciona em tela cheia, como um app nativo.
      </p>
    </div>
  );
}
