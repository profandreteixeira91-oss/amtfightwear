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
- Public free tools (e.g. /ferramentas/*) keep calculation logic as pure functions in src/lib/dojo/*-calculator.ts and never persist or send user input — they must work without login or backend.
- Owner first-steps setup uses an independent owner-scoped progress table and existing student/plan/class operations; never reuse AMT Pay onboarding flags or seed academy data, so setup stays optional and financially isolated.
- Store size availability uses active variant stock, with sparse size/color combinations resolved by the shared variant-availability helper; admin general-stock edits preserve explicit variant edits to prevent stale drafts from overwriting stock.
- Student status access is enforced by database identity helpers and the attendance trigger; the app gate and periodic profile revalidation clear student cache so existing sessions cannot retain blocked access.
- Melhor Envio admin writes require platform-admin authorization, durable per-order operation claims and provider-state reconciliation; sender identity comes from the connected account and no paid/generated state is inferred from HTTP success alone.
- Shipping cart creation in both admin entry points uses the shared preflight dialog and revalidates recipient, service limits and service-specific posting agencies server-side before claiming an operation; provider requirements determine agency necessity, not carrier names or fixed IDs.
- Per-order shipping volumes are persisted separately from product/default measures and used for both admin quotes and cart creation; edits use the same durable operation claim and are blocked once a shipment exists to prevent mismatched packages.
