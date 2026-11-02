<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Store size availability uses active variant stock, with sparse size/color combinations resolved by the shared variant-availability helper; admin general-stock edits preserve explicit variant edits to prevent stale drafts from overwriting stock.
- Melhor Envio admin writes require platform-admin authorization, durable per-order operation claims and provider-state reconciliation; sender identity comes from the connected account and no paid/generated state is inferred from HTTP success alone.
- Shipping cart creation in both admin entry points uses the shared preflight dialog and revalidates recipient, service limits and service-specific posting agencies server-side before claiming an operation; provider requirements determine agency necessity, not carrier names or fixed IDs.
- Per-order shipping volumes are persisted separately from product/default measures and used for both admin quotes and cart creation; edits use the same durable operation claim and are blocked once a shipment exists to prevent mismatched packages.
- This repository is only the AMT Fight Wear store and its admin (/admin), with no code dependency on the Dojo Manager (separate amtdojomanager project, own domain and own Mercado Pago webhook). The Supabase database is shared, so never drop or rewrite dojo_* tables or data from here; schema migrations for both products still live in supabase/migrations.
