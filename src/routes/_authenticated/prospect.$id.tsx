import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/$id")({
  beforeLoad: ({ params }) => {
    const p = params as any;
    throw redirect({ to: "/admin/admin/leads/$id", params: { id: p.id } as any });
  },
});
