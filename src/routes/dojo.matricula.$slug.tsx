import { createFileRoute } from "@tanstack/react-router";
import { PublicEnrollmentPage } from "./matricula.$slug";

export const Route = createFileRoute("/dojo/matricula/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Matrícula online — Dojo" },
      { name: "description", content: `Faça sua matrícula online no dojo ${params.slug}.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicEnrollmentPage,
});
