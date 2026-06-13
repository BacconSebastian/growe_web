/**
 * exercise-media.ts — API de galería de ejercicios del catálogo.
 *
 * exerciseId = exercise_id de catálogo (no routine_exercise_id).
 * El backend ya devuelve camelCase (serializeMedia) → passthrough directo.
 *
 * Rutas bajo /exercises/:exerciseId/media — NO bajo /routines.
 */

import { httpFetch } from "./http";
import type {
  ExerciseMedia,
  ExerciseMediaInitPayload,
  ExerciseMediaInitResponse,
  ExerciseMediaConfirmPayload,
} from "./types";

export async function getExerciseMedia(
  exerciseId: number,
  type?: "video" | "image"
): Promise<ExerciseMedia[]> {
  const qs = type ? `?type=${type}` : "";
  return httpFetch<ExerciseMedia[]>(`/exercises/${exerciseId}/media${qs}`);
}

export async function initExerciseMediaUpload(
  exerciseId: number,
  payload: ExerciseMediaInitPayload
): Promise<ExerciseMediaInitResponse> {
  return httpFetch<ExerciseMediaInitResponse>(
    `/exercises/${exerciseId}/media/init`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function confirmExerciseMediaUpload(
  exerciseId: number,
  mediaId: number,
  payload: ExerciseMediaConfirmPayload
): Promise<ExerciseMedia> {
  return httpFetch<ExerciseMedia>(
    `/exercises/${exerciseId}/media/${mediaId}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function addExerciseMediaLink(
  exerciseId: number,
  payload: {
    mediaType: "video" | "image";
    url: string;
    title?: string | null;
    isPrimary?: boolean;
  }
): Promise<ExerciseMedia> {
  return httpFetch<ExerciseMedia>(`/exercises/${exerciseId}/media/external`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteExerciseMedia(
  exerciseId: number,
  mediaId: number
): Promise<void> {
  await httpFetch<void>(`/exercises/${exerciseId}/media/${mediaId}`, {
    method: "DELETE",
  });
}

/**
 * Sube un archivo a un presigned URL de S3.
 * NO usa httpFetch ni Authorization — las URLs presignadas ya incluyen las credenciales.
 */
export async function uploadToS3(
  uploadUrl: string,
  file: Blob,
  mimeType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Error al subir archivo a S3: ${res.status} ${res.statusText}`);
  }
}
