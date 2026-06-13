/**
 * comments.ts — API de comentarios de ejercicios.
 *
 * exerciseId aquí = routine_exercise_id (no el id de catálogo).
 * El backend devuelve snake_case; se mapea a camelCase aquí.
 */

import { httpFetch } from "./http";
import type { ExerciseComment } from "./types";

// Raw shape del backend — tolera snake_case y camelCase (Sequelize underscored
// puede serializar de cualquiera de las dos formas según config).
interface RawExerciseComment {
  id: number;
  routine_exercise_id?: number;
  routineExerciseId?: number;
  user_id?: number;
  userId?: number;
  content: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  author: { id: number; username: string; avatar_url: string | null };
}

function mapComment(raw: RawExerciseComment): ExerciseComment {
  return {
    id: raw.id,
    routine_exercise_id: raw.routine_exercise_id ?? raw.routineExerciseId ?? 0,
    user_id: raw.user_id ?? raw.userId ?? 0,
    content: raw.content,
    createdAt: raw.created_at ?? raw.createdAt ?? "",
    updatedAt: raw.updated_at ?? raw.updatedAt ?? "",
    author: raw.author,
  };
}

export async function getExerciseComments(
  exerciseId: number
): Promise<ExerciseComment[]> {
  const raw = await httpFetch<RawExerciseComment[]>(
    `/routines/exercises/${exerciseId}/comments`
  );
  return raw.map(mapComment);
}

export async function createExerciseComment(
  exerciseId: number,
  content: string
): Promise<ExerciseComment> {
  const raw = await httpFetch<RawExerciseComment>(
    `/routines/exercises/${exerciseId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
  return mapComment(raw);
}

export async function markExerciseCommentsRead(
  exerciseId: number
): Promise<void> {
  await httpFetch<unknown>(`/routines/exercises/${exerciseId}/comments/read`, {
    method: "POST",
  });
}

export async function deleteExerciseComment(commentId: number): Promise<void> {
  await httpFetch<unknown>(`/routines/exercises/comments/${commentId}`, {
    method: "DELETE",
  });
}
