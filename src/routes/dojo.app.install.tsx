import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias administrativo: quem acessa /dojo/app/install é levado ao QR/link
// personalizado da academia (a rota /app/install é o portal do aluno).
export const Route = createFileRoute("/dojo/app/install")({
  beforeLoad: () => {
    throw redirect({ to: "/dojo/app/student-app-qr" });
  },
});
