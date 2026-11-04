import { createServerFn } from "@tanstack/react-start";
import { requireStoreOwner } from "@/lib/auth/owner-middleware";
import type { CommercialCenter } from "./commercial.server";

export type { CommercialCenter, CommercialPriority, CommercialTask, CommercialTaskType } from "./commercial.server";

/** Central Comercial: pendências do dia (ver commercial.server.ts). */
export const adminGetCommercialCenter = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async (): Promise<CommercialCenter> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildCommercialCenter } = await import("./commercial.server");
    return buildCommercialCenter(supabaseAdmin);
  });
