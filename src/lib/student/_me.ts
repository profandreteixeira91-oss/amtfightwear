// Helper to resolve the currently active student in the student app.
// The DB function `public.get_my_student_id()` honours the `x-active-student`
// header (validated against `is_my_student`) and falls back to the caller's
// own student when no header is present. All student-scoped queries MUST
// resolve the student id through this helper — a bare
// `.from("dojo_students").limit(1).maybeSingle()` can return the wrong
// student when the same login is shared by multiple students (pai/filho).

export async function getActiveStudentId(supabase: any): Promise<string | null> {
  const { data } = await supabase.rpc("get_my_student_id");
  return (data ?? null) as string | null;
}

export async function fetchActiveStudent<T = any>(
  supabase: any,
  columns: string,
): Promise<T | null> {
  const id = await getActiveStudentId(supabase);
  if (!id) return null;
  const { data, error } = await supabase
    .from("dojo_students")
    .select(columns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as T | null;
}
