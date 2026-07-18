import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/debug-fc")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const target = u.searchParams.get("url") || "https://www.smoothcomp.com/en/events?country=BR";
        const key = process.env.FIRECRAWL_API_KEY;
        if (!key) return new Response(JSON.stringify({ error: "no key" }), { status: 500 });
        const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: target, onlyMainContent: true, formats: ["markdown"] }),
        });
        const body = await res.text();
        return new Response(JSON.stringify({ status: res.status, body: body.slice(0, 4000) }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
