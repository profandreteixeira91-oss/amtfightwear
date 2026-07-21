import { createFileRoute } from "@tanstack/react-router";
import { PayPageView } from "@/components/dojo/PayPageView";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Pagamento — Dojo Manager" },
      { name: "description", content: "Página segura para pagamento da sua cobrança." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { invoiceId } = Route.useParams();
  return <PayPageView invoiceId={invoiceId} />;
}
