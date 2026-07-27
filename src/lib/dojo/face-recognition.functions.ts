import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { processClassPhoto as processPhotoServer } from "./face-recognition.server";
import { validateAndResolveCheckin } from "./attendance.functions";

export const startFaceRecognition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      photoUrl: z.string().url(),
      classId: z.string().uuid(),
      unitId: z.string().uuid(),
      lessonHistoryId: z.string().uuid().optional().nullable(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const supa = context.supabase;
    
    // 1. Get check-in settings for confidence
    const { data: settings } = await supa
      .from("dojo_checkin_settings")
      .select("face_min_confidence")
      .eq("owner_id", context.userId)
      .maybeSingle();
      
    const minConfidence = settings?.face_min_confidence ?? 0.95;

    // 2. Get students of this class and their reference photos
    // We only want students who gave LGPD consent
    const { data: students } = await supa
      .from("dojo_students")
      .select(`
        id, 
        full_name, 
        photo_url,
        facial_recognition_consent,
        dojo_student_reference_photos (
          photo_url
        )
      `)
      .eq("facial_recognition_consent", true);

    if (!students || students.length === 0) {
      throw new Error("Nenhum aluno com consentimento de reconhecimento facial encontrado.");
    }

    // 3. Flatten reference photos for the provider
    const referencePhotos = students.flatMap(s => {
      const photos: { studentId: string; name: string; url: string }[] = [];
      if (s.photo_url) {
        photos.push({ studentId: s.id, name: s.full_name, url: s.photo_url });
      }
      if (s.dojo_student_reference_photos) {
        (s.dojo_student_reference_photos as any[]).forEach((ref: any) => {
          if (ref.photo_url) {
            photos.push({ studentId: s.id, name: s.full_name, url: ref.photo_url });
          }
        });
      }
      return photos;
    });

    // 4. Process the photo
    const result = await processPhotoServer(data.photoUrl, referencePhotos, minConfidence);

    // 5. Create Class Photo entry
    const { data: classPhoto, error: cpError } = await supa
      .from("dojo_class_photos")
      .insert({
        owner_id: context.userId,
        unit_id: data.unitId,
        class_id: data.classId,
        lesson_history_id: data.lessonHistoryId ?? null,
        photo_url: data.photoUrl,
        faces_count: result.faces.length,
        identified_count: result.faces.filter(f => f.studentId).length,
        processing_time_ms: result.processingTimeMs,
        algorithm_version: "v1"
      })
      .select("id")
      .single();

    if (cpError) throw new Error(cpError.message);

    // 6. Create Detected Faces entries
    const facesToInsert = result.faces.map(f => ({
      class_photo_id: classPhoto.id,
      student_id: f.studentId || null,
      confidence: f.confidence,
      status: (f.studentId ? (f.confidence >= minConfidence ? "confirmed" : "pending") : "pending") as any,
      box_json: f.box as any,
      owner_id: context.userId
    }));

    const { error: dfError } = await supa
      .from("dojo_detected_faces")
      .insert(facesToInsert);

    if (dfError) throw new Error(dfError.message);

    return {
      classPhotoId: classPhoto.id,
      faces: result.faces,
      minConfidence
    };
  });

export const confirmSmartCheckins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      classPhotoId: z.string().uuid(),
      confirms: z.array(z.object({
        faceId: z.string().uuid().optional(), // if we had face IDs, but we'll use student IDs for simplicity in this demo
        studentId: z.string().uuid(),
        status: z.enum(['confirmed', 'visitor', 'ignored'])
      }))
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const supa = context.supabase;
    
    // Get class photo details for attendance
    const { data: classPhoto } = await supa
      .from("dojo_class_photos")
      .select("*")
      .eq("id", data.classPhotoId)
      .single();
      
    if (!classPhoto) throw new Error("Foto da aula não encontrada");

    // Perform check-ins for each confirmed student with smart validation
    let checkinCount = 0;
    const errors: any[] = [];

    for (const c of data.confirms) {
      if (c.status !== 'confirmed') continue;

      try {
        // Use smart validation (as override since it's confirmed by admin/teacher in the UI)
        const validation = await validateAndResolveCheckin(
          supa, 
          c.studentId, 
          context.userId, 
          true, // isOverride
          classPhoto.class_id
        );

        if (!validation.isValid) {
          errors.push({ studentId: c.studentId, reason: validation.reason });
          continue;
        }

        const { error } = await supa.from("dojo_attendance").insert({
          student_id: c.studentId,
          unit_id: classPhoto.unit_id,
          class_id: validation.classId || classPhoto.class_id,
          method: "smart_photo",
          notes: `Identificado via foto da aula (${data.classPhotoId})`,
          created_by: context.userId,
          owner_id: context.userId,
          checked_in_at: new Date().toISOString(),
        });

        if (error) throw error;
        checkinCount++;
      } catch (err: any) {
        errors.push({ studentId: c.studentId, error: err.message });
      }
    }

    return { ok: true, count: checkinCount, errors };
  });

export const getSmartCheckinDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ classPhotoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const supa = context.supabase;
    
    const { data: faces } = await supa
      .from("dojo_detected_faces")
      .select("*, dojo_students(full_name, photo_url)")
      .eq("class_photo_id", data.classPhotoId);
      
    return faces ?? [];
  });
