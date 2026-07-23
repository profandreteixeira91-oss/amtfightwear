import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/contract-templates/")({
  beforeLoad: () => { throw redirect({ to: "/dojo/app/contracts/templates" }); },
});
