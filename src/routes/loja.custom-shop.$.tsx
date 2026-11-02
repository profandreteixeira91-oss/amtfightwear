import { createFileRoute, redirect } from "@tanstack/react-router";

// O Custom Shop foi descontinuado: links antigos (/loja/custom-shop e
// /loja/custom-shop/<tipo>) seguem para a vitrine em vez de cair num 404.
export const Route = createFileRoute("/loja/custom-shop/$")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
