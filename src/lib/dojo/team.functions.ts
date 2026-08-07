import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calendarISO, dayISO, todayISO, utcCalendarISO } from "@/lib/dates";

const uuid = z.string().uuid();

// ============ MEMBERS ============

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_team_members")
      .select("*")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTeamMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: member, error } = await context.supabase
      .from("dojo_team_members").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);

    const [payroll, signature] = await Promise.all([
      context.supabase.from("dojo_team_payroll_config").select("*").eq("member_id", data.id).maybeSingle(),
      context.supabase.from("dojo_team_signatures").select("*").eq("member_id", data.id).maybeSingle(),
    ]);

    return {
      member,
      payroll: payroll.data,
      signature: signature.data,
    };
  });

const memberSchema = z.object({
  id: uuid.optional(),
  full_name: z.string().min(1).max(200),
  photo_url: z.string().url().nullable().optional(),
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  marital_status: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  mother_name: z.string().nullable().optional(),
  father_name: z.string().nullable().optional(),
  education_level: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  emergency_contact_relation: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address_street: z.string().nullable().optional(),
  address_number: z.string().nullable().optional(),
  address_complement: z.string().nullable().optional(),
  address_neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  role: z.enum(["teacher", "instructor", "assistant", "receptionist", "finance", "admin", "manager", "other"]).optional(),
  admission_date: z.string().nullable().optional(),
  termination_date: z.string().nullable().optional(),
  professional_registry: z.string().nullable().optional(),
  confederation_name: z.string().nullable().optional(),
  confederation_number: z.string().nullable().optional(),
  belt_id: uuid.nullable().optional(),
  belt_grade: z.number().int().min(0).max(10).nullable().optional(),
  modalities: z.array(z.string()).optional(),
  specialties: z.string().nullable().optional(),
  biography: z.string().nullable().optional(),
  mini_resume: z.string().nullable().optional(),
  professional_photo_url: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive", "leave", "vacation", "terminated"]).optional(),
});

export const upsertTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => memberSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, email: rest.email === "" ? null : rest.email } as typeof rest;

    if (id) {
      const before = await context.supabase.from("dojo_team_members").select("*").eq("id", id).maybeSingle();
      const { error } = await context.supabase.from("dojo_team_members").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await context.supabase.from("dojo_team_history").insert({
        owner_id: context.userId, member_id: id,
        event_type: "profile_change", description: "Cadastro atualizado",
        before_data: (before.data ?? null) as never,
        after_data: payload as never,
        actor_user_id: context.userId,
      });
      return { id };
    }

    const insertPayload = { ...payload, owner_id: context.userId, full_name: payload.full_name };
    const { data: row, error } = await context.supabase
      .from("dojo_team_members")
      .insert(insertPayload)
      .select("id").single();
    if (error) throw new Error(error.message);

    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: row.id,
      event_type: "log", description: "Colaborador criado",
      after_data: payload as never, actor_user_id: context.userId,
    });
    return { id: row.id };
  });

export const updateTeamMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: uuid,
    status: z.enum(["active", "inactive", "leave", "vacation", "terminated"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_members")
      .update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: data.id,
      event_type: "profile_change", description: `Status: ${data.status}`,
      actor_user_id: context.userId,
    });
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    // Archive: set status = terminated, keep history intact
    const { error } = await context.supabase.from("dojo_team_members")
      .update({ status: "terminated", termination_date: todayISO() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PERMISSIONS ============

const permissionLevel = z.enum(["none", "read", "write"]);
const permissionMap = z.record(z.string().min(1).max(50), permissionLevel);

export const updateTeamMemberPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, permissions: permissionMap }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_team_members")
      .update({ permissions: data.permissions as never })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId,
      member_id: data.id,
      event_type: "profile_change",
      description: "Permissões atualizadas",
      after_data: data.permissions as never,
      actor_user_id: context.userId,
    });
    return { ok: true };
  });

export const linkTeamMemberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, email: z.string().email() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: userId, error } = await context.supabase.rpc("dojo_link_team_member_by_email", {
      _member_id: data.id,
      _email: data.email,
    });
    if (error) throw new Error(error.message);
    return { user_id: userId as string };
  });

export const unlinkTeamMemberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_team_members")
      .update({ user_id: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Cria (ou atualiza a senha de) uma conta de login para um colaborador,
 * usando o e-mail cadastrado no perfil. Apenas o dono do dojo pode chamar.
 * - Se o e-mail ainda não tem usuário: cria via admin.createUser (email_confirm=true)
 * - Se já existe usuário para o e-mail: atualiza a senha via updateUserById
 * - Vincula o user_id ao dojo_team_members
 */
export const setTeamMemberLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: uuid,
      password: z.string().min(6).max(72),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // 1) valida propriedade do membro
    const { data: member, error: mErr } = await context.supabase
      .from("dojo_team_members")
      .select("id, owner_id, email, full_name, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!member) throw new Error("Colaborador não encontrado");
    if (member.owner_id !== context.userId) {
      throw new Error("Somente o dono do dojo pode gerenciar logins da equipe");
    }
    const email = (member.email ?? "").trim().toLowerCase();
    if (!email) {
      throw new Error("Cadastre um e-mail válido para este colaborador antes de criar o login");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2) cria ou atualiza a senha
    let userId: string | null = member.user_id ?? null;
    const create = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: member.full_name ?? undefined },
    });
    if (create.error) {
      const msg = String(create.error.message || "").toLowerCase();
      const alreadyExists =
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already") ||
        msg.includes("duplicate");
      if (!alreadyExists) throw new Error(create.error.message);

      // usuário já existe: localizar e atualizar senha
      // paginar até achar
      let found: string | null = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const list = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (list.error) throw new Error(list.error.message);
        const hit = list.data.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (hit) found = hit.id;
        if (list.data.users.length < 200) break;
      }
      if (!found) throw new Error("Usuário existe mas não foi possível localizá-lo");
      const upd = await supabaseAdmin.auth.admin.updateUserById(found, { password: data.password });
      if (upd.error) throw new Error(upd.error.message);
      userId = found;
    } else {
      userId = create.data.user?.id ?? null;
    }

    if (!userId) throw new Error("Não foi possível resolver o usuário criado");

    // 3) vincula ao team_member
    const { error: linkErr } = await context.supabase
      .from("dojo_team_members")
      .update({ user_id: userId, email })
      .eq("id", data.id);
    if (linkErr) throw new Error(linkErr.message);

    // CRÍTICO: Registra como dojo_user para habilitar o contexto administrativo
    const { error: duErr } = await supabaseAdmin
      .from("dojo_users")
      .upsert({
        auth_user_id: userId,
        owner_id: member.owner_id,
        role: member.role === "admin" || member.role === "manager" ? "admin" : "teacher",
        email,
        name: member.full_name
      }, { onConflict: "auth_user_id, owner_id" });

    if (duErr) console.error("Erro ao criar dojo_user:", duErr);

    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId,
      member_id: data.id,
      event_type: "log",
      description: member.user_id ? "Senha do login atualizada" : "Login de sistema criado",
      actor_user_id: context.userId,
    });

    return { ok: true, user_id: userId, email };
  });


/**
 * Público (sem auth): verifica se um e-mail já está cadastrado como membro
 * de equipe em qualquer dojo. Usado pelo fluxo /dojo/auth para impedir
 * que um colaborador crie a própria conta de dono — o login precisa ser
 * criado pelo dono no módulo Equipe.
 */
export const isEmailTeamMember = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email() }).parse(i),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) return { isTeamMember: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("dojo_team_members")
      .select("id, user_id, status")
      .ilike("email", email)
      .limit(1);
    if (error) throw new Error(error.message);
    const row = rows && rows[0];
    if (!row) return { isTeamMember: false as const };
    return {
      isTeamMember: true as const,
      hasLogin: !!row.user_id,
      status: row.status ?? null,
    };
  });

/**
 * Verifica se o usuário autenticado é um membro de equipe. Se existir uma
 * linha em dojo_team_members com o mesmo e-mail mas sem vínculo com o próprio
 * user_id (ou com status inativo), bloqueia o acesso — o login precisa ser
 * criado pelo dono do dojo dentro do módulo Equipe.
 */
export const checkTeamMemberGate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: userRes } = await context.supabase.auth.getUser();
    const email = (userRes.user?.email ?? "").trim().toLowerCase();
    if (!email) return { blocked: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("dojo_team_members")
      .select("id, user_id, status, owner_id")
      .ilike("email", email)
      .limit(5);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { blocked: false as const };
    // Existe pelo menos uma linha de team_member para este e-mail.
    // Permite acesso somente quando ao menos uma dessas linhas está vinculada
    // ao próprio user_id e ativa.
    const linkedActive = rows.some(
      (r) => r.user_id === context.userId && (r.status ?? "active") !== "inactive",
    );
    if (linkedActive) return { blocked: false as const };
    const anyLinked = rows.some((r) => !!r.user_id);
    return {
      blocked: true as const,
      reason: anyLinked ? ("inactive" as const) : ("not_provisioned" as const),
    };
  });



export const getMyTeamPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Se o usuário é dono de um dojo (dojo_academy_profile.owner_id = auth.uid),
    // liberamos tudo. Caso contrário, retornamos permissões do team_member vinculado.
    const [{ data: ownerProfile }, { data: rows }] = await Promise.all([
      context.supabase.from("dojo_academy_profile").select("owner_id").eq("owner_id", context.userId).maybeSingle(),
      context.supabase.rpc("dojo_my_team_permissions"),
    ]);
    if (ownerProfile) return { isOwner: true as const, permissions: null, member: null };
    const row = Array.isArray(rows) ? rows[0] : null;
    // Sem team_member vinculado = usuário autônomo (ex.: novo cadastro em trial).
    // Trata-se do dono da própria conta e recebe acesso total ao sistema.
    if (!row) return { isOwner: true as const, permissions: null, member: null };
    return {
      isOwner: false as const,
      permissions: (row.permissions ?? {}) as Record<string, "none" | "read" | "write">,
      member: { id: row.member_id, role: row.role, full_name: row.full_name },
    };
  });

// ============ PAYROLL CONFIG ============

const payrollSchema = z.object({
  member_id: uuid,
  payment_type: z.enum(["fixed", "hourly", "per_class", "percentage", "commission", "contractor", "mei", "autonomous", "other"]),
  base_salary: z.number().nullable().optional(),
  hourly_rate: z.number().nullable().optional(),
  per_class_rate: z.number().nullable().optional(),
  commission_percent: z.number().nullable().optional(),
  commission_on_enrollment: z.number().nullable().optional(),
  commission_on_renewal: z.number().nullable().optional(),
  commission_on_sale: z.number().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  bank_agency: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  pix_key: z.string().nullable().optional(),
  pix_key_type: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const upsertPayrollConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => payrollSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payroll_config")
      .upsert({ ...data, owner_id: context.userId }, { onConflict: "member_id" });
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: data.member_id,
      event_type: "salary_change", description: "Configuração financeira atualizada",
      after_data: data as never, actor_user_id: context.userId,
    });
    return { ok: true };
  });

// ============ PAYMENTS ============

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid.optional(),
    month: z.string().optional(), // YYYY-MM
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("dojo_team_payments").select("*, dojo_team_members(full_name, role)").order("created_at", { ascending: false });
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.month) {
      const first = `${data.month}-01`;
      q = q.eq("reference_month", first);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const paymentSchema = z.object({
  id: uuid.optional(),
  member_id: uuid,
  kind: z.enum(["salary", "advance", "discount", "bonus", "commission", "overtime", "reimbursement", "other"]),
  reference_month: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  hours_worked: z.number().nullable().optional(),
  classes_count: z.number().int().nullable().optional(),
  status: z.enum(["pending", "paid", "canceled"]).optional(),
  due_date: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

async function ensureExpenseForPayment(supabase: any, ownerId: string, paymentId: string) {
  const { data: pay } = await supabase
    .from("dojo_team_payments")
    .select("id, owner_id, member_id, amount, description, kind, reference_month, due_date, paid_at, status, dojo_team_members(full_name, role, unit_id)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!pay || pay.status !== "paid") return;

  const { data: existing } = await supabase
    .from("dojo_expenses")
    .select("id")
    .eq("team_payment_id", paymentId)
    .maybeSingle();

  const name = pay.dojo_team_members?.full_name ?? "Colaborador";
  const kindLabel: Record<string, string> = {
    salary: "Salário", advance: "Adiantamento", discount: "Desconto",
    bonus: "Bônus", commission: "Comissão", overtime: "Hora extra",
    reimbursement: "Reembolso", other: "Pagamento",
  };
  const description = `${kindLabel[pay.kind] ?? "Pagamento"} — ${name}${pay.description ? ` · ${pay.description}` : ""}`;
  const paidAtDate = pay.paid_at ? dayISO(pay.paid_at) : null;
  const due_date = paidAtDate ?? pay.due_date ?? pay.reference_month ?? todayISO();

  const payload: any = {
    owner_id: ownerId,
    unit_id: pay.dojo_team_members?.unit_id ?? null,
    category: "Folha de pagamento",
    description,
    amount: pay.amount,
    due_date,
    paid_at: pay.paid_at,
    status: "paid",
    team_payment_id: pay.id,
  };

  if (existing) {
    await supabase.from("dojo_expenses").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("dojo_expenses").insert(payload);
  }
}

export const upsertPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => paymentSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    let paymentId = id;
    if (id) {
      const { error } = await context.supabase.from("dojo_team_payments").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await context.supabase.from("dojo_team_payments")
        .insert({ ...rest, owner_id: context.userId }).select("id").single();
      if (error) throw new Error(error.message);
      paymentId = row.id;
      await context.supabase.from("dojo_team_history").insert({
        owner_id: context.userId, member_id: rest.member_id,
        event_type: "payment", description: `Pagamento registrado: ${rest.kind} R$ ${rest.amount}`,
        after_data: rest as never, actor_user_id: context.userId,
      });
    }
    if (rest.status === "paid" && paymentId) {
      await ensureExpenseForPayment(context.supabase, context.userId, paymentId);
    } else if (rest.status && rest.status !== "paid" && id) {
      await context.supabase.from("dojo_expenses").delete().eq("team_payment_id", id);
    }
    return { id: paymentId };
  });

export const markPaymentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, paid_at: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payments")
      .update({ status: "paid", paid_at: data.paid_at ?? new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await ensureExpenseForPayment(context.supabase, context.userId, data.id);
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payments")
      .update({ status: "canceled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_expenses").delete().eq("team_payment_id", data.id);
    return { ok: true };
  });

// ============ AUTO CALC (Agenda-based) ============

function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = String(startTime).split(":").map(Number);
  const [eh, em] = String(endTime).split(":").map(Number);
  const mins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
  return Math.max(0, mins / 60);
}

export const computeMemberEarnings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      member_id: uuid,
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const [{ data: cfg }, { data: occs }] = await Promise.all([
      context.supabase.from("dojo_team_payroll_config").select("*").eq("member_id", data.member_id).maybeSingle(),
      context.supabase
        .from("dojo_class_occurrences")
        .select("id, start_time, end_time, original_teacher_id, substitute_teacher_id, status, dojo_classes(teacher_id)")
        .gte("occurrence_date", data.from)
        .lte("occurrence_date", data.to)
        .neq("status", "canceled"),
    ]);

    const mine = (occs ?? []).filter((o: any) => {
      if (o.substitute_teacher_id) return o.substitute_teacher_id === data.member_id;
      // Sem substituição: efetivo é o titular travado na ocorrência OU (fallback) o professor atual da turma
      const effective = o.original_teacher_id ?? o.dojo_classes?.teacher_id ?? null;
      return effective === data.member_id;
    });
    const classes = mine.length;
    const hours = mine.reduce((s: number, o: any) => {
      if (!o.start_time || !o.end_time) return s;
      return s + hoursBetween(o.start_time, o.end_time);
    }, 0);

    const c: any = cfg ?? {};
    const payment_type = (c.payment_type ?? "fixed") as string;
    const base_salary = Number(c.base_salary || 0);
    const hourly_rate = Number(c.hourly_rate || 0);
    const per_class_rate = Number(c.per_class_rate || 0);
    const commission_percent = Number(c.commission_percent || 0);

    let suggested_amount = 0;
    if (payment_type === "hourly") suggested_amount = hourly_rate * hours;
    else if (payment_type === "per_class") suggested_amount = per_class_rate * classes;
    else if (payment_type === "fixed") suggested_amount = base_salary;
    else if (payment_type === "percentage") suggested_amount = 0; // depende de receita, tratado no fechamento
    else if (payment_type === "commission") suggested_amount = 0;
    else suggested_amount = base_salary + hourly_rate * hours + per_class_rate * classes;

    return {
      payment_type,
      base_salary,
      hourly_rate,
      per_class_rate,
      commission_percent,
      classes,
      hours: Number(hours.toFixed(2)),
      suggested_amount: Number(suggested_amount.toFixed(2)),
    };
  });

// ============ PAYROLL CLOSING ============

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = utcCalendarISO(new Date(Date.UTC(y, m - 1, 1)));
  const end = utcCalendarISO(new Date(Date.UTC(y, m, 1)));
  return { start, end };
}

export const computePayrollPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(i))
  .handler(async ({ data, context }) => {
    const { start, end } = monthBounds(data.month);
    const [{ data: members }, { data: configs }, { data: occs }, { data: att }, { data: existing }] =
      await Promise.all([
        context.supabase
          .from("dojo_team_members")
          .select("id, full_name, role, status")
          .in("status", ["active", "leave", "vacation"]),
        context.supabase.from("dojo_team_payroll_config").select("*"),
        context.supabase
          .from("dojo_class_occurrences")
          .select("id, start_time, end_time, original_teacher_id, substitute_teacher_id, status, dojo_classes(teacher_id)")
          .gte("occurrence_date", start)
          .lt("occurrence_date", end)
          .neq("status", "canceled"),
        context.supabase
          .from("dojo_team_attendance")
          .select("member_id, hours_worked")
          .gte("work_date", start)
          .lt("work_date", end),
        context.supabase
          .from("dojo_team_payments")
          .select("member_id, kind, amount, status")
          .eq("reference_month", start),
      ]);

    const configByMember = new Map((configs ?? []).map((c: any) => [c.member_id, c]));
    const rows = (members ?? []).map((m: any) => {
      const cfg: any = configByMember.get(m.id) ?? {};
      const myOccs = (occs ?? []).filter((o: any) => {
        if (o.substitute_teacher_id) return o.substitute_teacher_id === m.id;
        const effective = o.original_teacher_id ?? o.dojo_classes?.teacher_id ?? null;
        return effective === m.id;
      });
      const classes = myOccs.length;
      const scheduleHours = myOccs.reduce((s: number, o: any) => {
        if (!o.start_time || !o.end_time) return s;
        return s + hoursBetween(o.start_time, o.end_time);
      }, 0);
      const attHours = (att ?? [])
        .filter((a: any) => a.member_id === m.id)
        .reduce((s: number, a: any) => s + Number(a.hours_worked || 0), 0);
      const hours = attHours > 0 ? attHours : scheduleHours;

      const base = Number(cfg.base_salary || 0);
      const hourly = Number(cfg.hourly_rate || 0) * hours;
      const perClass = Number(cfg.per_class_rate || 0) * classes;
      const proposed = base + hourly + perClass;

      const rowsForMember = (existing ?? []).filter((e: any) => e.member_id === m.id);
      const advances = rowsForMember
        .filter((e: any) => e.kind === "advance" && e.status !== "canceled")
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const discounts = rowsForMember
        .filter((e: any) => e.kind === "discount" && e.status !== "canceled")
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const bonuses = rowsForMember
        .filter(
          (e: any) =>
            ["bonus", "commission", "overtime", "reimbursement"].includes(e.kind) &&
            e.status !== "canceled",
        )
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const alreadyClosed = rowsForMember.some(
        (e: any) => e.kind === "salary" && e.status !== "canceled",
      );

      const net = Math.max(0, proposed + bonuses - advances - discounts);

      return {
        member_id: m.id,
        full_name: m.full_name,
        role: m.role,
        status: m.status,
        payment_type: cfg.payment_type ?? null,
        base,
        hourly_rate: Number(cfg.hourly_rate || 0),
        per_class_rate: Number(cfg.per_class_rate || 0),
        hours,
        classes,
        earnings: proposed,
        bonuses,
        advances,
        discounts,
        net,
        already_closed: alreadyClosed,
        has_config: Object.keys(cfg).length > 0,
      };
    });

    return rows;
  });

export const closePayrollMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        entries: z
          .array(
            z.object({
              member_id: uuid,
              amount: z.number().nonnegative(),
              description: z.string().optional(),
              hours_worked: z.number().nullable().optional(),
              classes_count: z.number().int().nullable().optional(),
              due_date: z.string().nullable().optional(),
            }),
          )
          .min(1),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { start } = monthBounds(data.month);
    const { data: existing } = await context.supabase
      .from("dojo_team_payments")
      .select("member_id")
      .eq("reference_month", start)
      .eq("kind", "salary")
      .neq("status", "canceled");
    const closedSet = new Set((existing ?? []).map((r: any) => r.member_id));

    const rows = data.entries
      .filter((e) => !closedSet.has(e.member_id) && e.amount > 0)
      .map((e) => ({
        owner_id: context.userId,
        member_id: e.member_id,
        kind: "salary" as const,
        reference_month: start,
        description: e.description ?? `Folha ${data.month}`,
        amount: e.amount,
        hours_worked: e.hours_worked ?? null,
        classes_count: e.classes_count ?? null,
        due_date: e.due_date ?? null,
        status: "pending" as const,
      }));

    if (rows.length === 0) return { created: 0, skipped: data.entries.length };

    const { error } = await context.supabase.from("dojo_team_payments").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length, skipped: data.entries.length - rows.length };
  });

// ============ ATTENDANCE ============

export const listTeamAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid.optional(),
    month: z.string().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("dojo_team_attendance").select("*, dojo_team_members(full_name)").order("work_date", { ascending: false });
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.month) {
      const [y, m] = data.month.split("-").map(Number);
      const start = calendarISO(new Date(y, m - 1, 1));
      const end = calendarISO(new Date(y, m, 1));
      q = q.gte("work_date", start).lt("work_date", end);
    }
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: uuid.optional(),
    member_id: uuid,
    work_date: z.string(),
    clock_in: z.string().nullable().optional(),
    clock_out: z.string().nullable().optional(),
    break_minutes: z.number().int().min(0).optional(),
    hours_worked: z.number().nullable().optional(),
    justification: z.string().nullable().optional(),
    status: z.enum(["present", "absent", "late", "justified", "leave", "holiday"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_team_attendance").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_team_attendance")
      .insert({ ...rest, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ============ DOCUMENTS ============

export const listTeamDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ member_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("dojo_team_documents")
      .select("*").eq("member_id", data.member_id).is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addTeamDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid,
    kind: z.enum(["contract", "rg", "cpf", "proof", "certificate", "course", "diploma", "other"]),
    title: z.string().min(1),
    file_url: z.string().url(),
    file_size: z.number().optional(),
    mime_type: z.string().optional(),
    notes: z.string().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("dojo_team_documents")
      .insert({ ...data, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const archiveTeamDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_documents")
      .update({ archived_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SIGNATURES (for certificates integration) ============

export const upsertSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid,
    signature_url: z.string().url(),
    display_name: z.string().min(1),
    role_label: z.string().nullable().optional(),
    belt_label: z.string().nullable().optional(),
    can_sign_certificates: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_signatures")
      .upsert({ ...data, owner_id: context.userId }, { onConflict: "member_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCertificateSigners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_team_signatures")
      .select("*, dojo_team_members(full_name, role, status)")
      .eq("can_sign_certificates", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ HISTORY ============

export const listTeamHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ member_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("dojo_team_history")
      .select("*").eq("member_id", data.member_id).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ DASHBOARD ============

export const getTeamDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members } = await context.supabase
      .from("dojo_team_members").select("id, role, status, birth_date, full_name, photo_url");

    const now = new Date();
    const monthStart = calendarISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonth = calendarISO(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const { data: payments } = await context.supabase
      .from("dojo_team_payments").select("amount, status, kind")
      .gte("reference_month", monthStart).lt("reference_month", nextMonth);

    const list = members ?? [];
    const active = list.filter((m) => m.status === "active");
    const byRole = (r: string) => active.filter((m) => m.role === r).length;

    const currentMonth = now.getMonth() + 1;
    const birthdays = list.filter((m) => {
      if (!m.birth_date) return false;
      return new Date(m.birth_date).getMonth() + 1 === currentMonth;
    });

    const payroll = (payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payrollPaid = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const payrollPending = payroll - payrollPaid;

    return {
      total: list.length,
      active_total: active.length,
      teachers: byRole("teacher"),
      instructors: byRole("instructor"),
      receptionists: byRole("receptionist"),
      admins: byRole("admin") + byRole("manager"),
      birthdays,
      payroll_month_total: payroll,
      payroll_month_paid: payrollPaid,
      payroll_month_pending: payrollPending,
    };
  });
