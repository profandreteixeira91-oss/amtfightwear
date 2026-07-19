import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias administrativo: /dojo/app/install → nova página de versões (APK + QR).
export const Route = createFileRoute("/dojo/app/install")({
  beforeLoad: () => {
    throw redirect({ to: "/dojo/app/apk-versions" });
  },
});
