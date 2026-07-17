import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileInput = z.object({
  full_name: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  document: z.string().max(32).optional().nullable(),
  zip: z.string().max(16).optional().nullable(),
  street: z.string().max(160).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
});

export const getMyCustomerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, phone, document, zip, street, number, complement, neighborhood, city, state")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveMyCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => profileInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Buscar e-mail do usuário para captar também pedidos legados que ficaram sem user_id
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    const email = profile?.email ?? null;

    const orFilter = email
      ? `user_id.eq.${context.userId},customer_email.eq.${email}`
      : `user_id.eq.${context.userId}`;

    const { data, error } = await context.supabase
      .from("store_orders")
      .select("id, order_number, status, payment_status, payment_method, total, currency, created_at")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });


