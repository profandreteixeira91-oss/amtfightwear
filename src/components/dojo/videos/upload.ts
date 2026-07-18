import { supabase } from "@/integrations/supabase/client";

export async function uploadVideoFile(file: File, userId: string, kind: "video" | "thumb" | "attachment"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const prefix = kind === "thumb" ? "thumbs" : kind === "attachment" ? "attachments" : "videos";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("dojo-videos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("dojo-videos").getPublicUrl(path);
  return data.publicUrl;
}

export async function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration && isFinite(v.duration) ? Math.round(v.duration) : null);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}
