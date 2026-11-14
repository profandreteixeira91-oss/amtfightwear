> [!IMPORTANT]
> Stack: GitHub (`main`), Supabase (project `gudjmkiyprgwgxmzbgji`) and
> Cloudflare (the build targets Cloudflare Workers via nitro `cloudflare-module`).
> Lovable is no longer used: don't add `@lovable.dev/*`, `LOVABLE_API_KEY` or
> `*.lovable.app` URLs.
>
> - Keep `main` in a working state and don't rewrite published history (no force
>   push, no amending/rebasing commits that are already pushed).
> - `main` moves on its own: the "Mapa do Projeto" workflow commits
>   `graphify-out/` after every push, and other machines push too. Fetch and
>   rebase local commits onto `origin/main` before pushing.
> - Server secrets go in `.env.local` or the host's secrets, never in `.env`.
- The store charges `variant.price ?? product.price`. Changing a product's price (list, edit dialog, costs page) only moves variants whose price equalled the old product price; variants with their own per-size price are kept, and percentage adjustments scale them too (shared helper `product-price.server.ts`).
- Product costs (`/admin/produtos/custos`) are store-wide: server functions read/write `product_cost_compositions`, `app_pricing_configs` and `fixed_expenses` with the admin client after `requireStoreOwner`, ignoring the per-user `tenant_id` RLS; `products.cost` mirrors the sheet total.
- Store size availability uses active variant stock, with sparse size/color combinations resolved by the shared variant-availability helper; admin general-stock edits preserve explicit variant edits to prevent stale drafts from overwriting stock.
- Melhor Envio admin writes require platform-admin authorization, durable per-order operation claims and provider-state reconciliation; sender identity comes from the connected account and no paid/generated state is inferred from HTTP success alone.
- Shipping cart creation in both admin entry points uses the shared preflight dialog and revalidates recipient, service limits and service-specific posting agencies server-side before claiming an operation; provider requirements determine agency necessity, not carrier names or fixed IDs.
- Per-order shipping volumes are persisted separately from product/default measures and used for both admin quotes and cart creation; edits use the same durable operation claim and are blocked once a shipment exists to prevent mismatched packages.
- This repository is only the AMT Fight Wear store and its admin (/admin), with no code dependency on the Dojo Manager (separate amtdojomanager project, own domain and own Mercado Pago webhook). The Supabase database is shared, so never drop or rewrite dojo_* tables or data from here; schema migrations for both products still live in supabase/migrations.
