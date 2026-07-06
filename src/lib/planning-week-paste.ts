/**
 * planning-week-paste.ts
 *
 * Lógica compartida para pegar el clipboard de día (RoutineClipboard) en una
 * celda de una semana. Reusada por:
 *  - PlanningWeekDetail (calendario editable, drill-in)
 *  - PlanningOverview / WeekCalendarReadonly (resumen de semanas)
 *
 * REGLA CRÍTICA: el payload de saveWeekRoutines SIEMPRE incluye TODAS las
 * rutinas de la semana (las no editadas con su data actual) o el backend las
 * borra implícitamente.
 */

import {
  saveWeekRoutines,
  updateWeekRoutineExercises,
  removeRoutineFromWeek,
  type SaveWeekRoutineInput,
  type SaveWeekRoutineExercisesPayload,
} from "@/lib/api/plannings";
import {
  coachSaveWeekRoutines,
  coachUpdateWeekRoutineExercises,
  coachRemoveRoutineFromWeek,
  createAndAssignStudentRoutine,
} from "@/lib/api/coaching";
import type {
  PlanningWeek,
  PlanningWeekRoutine,
  PlanningWeekRoutineExercise,
  DayOfWeek,
} from "@/lib/api/types";

/** Día efectivo de una PlanningWeekRoutine. */
export function effectiveDay(wr: PlanningWeekRoutine): DayOfWeek | null {
  if (wr.day_of_week) return wr.day_of_week as DayOfWeek;
  if (wr.routine_day_of_week && wr.routine_day_of_week.length > 0)
    return wr.routine_day_of_week[0] as DayOfWeek;
  return null;
}

/** Mapea los ejercicios de una rutina al shape de SaveWeekRoutineInput. */
export function mapRoutineExercisesToInput(
  exercises: PlanningWeekRoutineExercise[]
): Array<Record<string, unknown>> {
  return exercises.map((ex, idx) => ({
    exercise_id: ex.exercise_id,
    name: ex.name,
    order_index: idx + 1,
    series: ex.series,
    repetitions: ex.repetitions,
    exercise_type: ex.exercise_type,
    is_warmup: ex.is_warmup,
    sets_data: ex.sets_data,
    variables_config: ex.variables_config,
    superset_group: ex.superset_group,
  }));
}

interface PasteParams {
  clipboardTitle: string;
  clipboardExercises: PlanningWeekRoutineExercise[];
  week: PlanningWeek;
  mode: "own" | "coach";
  studentId?: number;
  /** Rutina destino (reemplaza sus ejercicios) o null para crear una nueva. */
  targetWkRt: PlanningWeekRoutine | null;
  /** Día destino (solo aplica al crear rutina nueva en celda vacía). */
  targetDay: DayOfWeek | null;
}

/**
 * Pega el contenido del clipboard en una celda de la semana y devuelve la
 * semana actualizada (lista para mergear en el estado del caller).
 *
 * - targetWkRt !== null → reemplaza los ejercicios de esa rutina (mantiene su título).
 * - targetWkRt === null → crea rutina nueva en `targetDay` con el contenido del clipboard.
 */
export async function pasteRoutineIntoWeek({
  clipboardTitle,
  clipboardExercises,
  week,
  mode,
  studentId,
  targetWkRt,
  targetDay,
}: PasteParams): Promise<PlanningWeek> {
  const clipExercises: SaveWeekRoutineExercisesPayload["exercises"] =
    clipboardExercises.map((ex, idx) => ({
      exercise_id: ex.exercise_id ?? null,
      name: ex.name,
      order_index: idx + 1,
      series: ex.series,
      repetitions: ex.repetitions,
      exercise_type: ex.exercise_type,
      is_warmup: ex.is_warmup ?? false,
      sets_data: ex.sets_data ?? [],
      variables_config: ex.variables_config ?? null,
      superset_group: ex.superset_group ?? null,
    }));

  // Caso A: reemplazar ejercicios de rutina existente (mantiene su título).
  // Usa el endpoint de UN SOLO pivot (rápido) en vez de reescribir toda la semana.
  if (targetWkRt !== null) {
    const updatedExercises =
      mode === "coach" && studentId != null
        ? await coachUpdateWeekRoutineExercises(studentId, targetWkRt.id, {
            exercises: clipExercises,
          })
        : await updateWeekRoutineExercises(targetWkRt.id, {
            exercises: clipExercises,
          });

    return {
      ...week,
      routines: week.routines.map((r) =>
        r.id === targetWkRt.id ? { ...r, exercises: updatedExercises } : r
      ),
    };
  }

  // Caso B: celda vacía → crear rutina nueva con el contenido del clipboard.
  if (mode === "coach" && studentId != null) {
    const newWkRt = await createAndAssignStudentRoutine(studentId, week.id, {
      title: clipboardTitle,
      day_of_week: targetDay ?? undefined,
      exercises: clipExercises,
    });
    return { ...week, routines: [...week.routines, newWkRt] };
  }

  // mode === "own": saveWeekRoutines con todas las rutinas + la nueva.
  const existingInputs: SaveWeekRoutineInput[] = week.routines.map((r) => ({
    week_routine_id: r.id,
    routine_id: r.routine_id,
    title: r.routine_title,
    day_of_week: effectiveDay(r),
    order_index: r.order_index,
    exercises: mapRoutineExercisesToInput(r.exercises),
  }));

  const newRoutineInput: SaveWeekRoutineInput = {
    week_routine_id: null,
    routine_id: null,
    title: clipboardTitle,
    day_of_week: targetDay ?? undefined,
    exercises: clipExercises,
  };

  return saveWeekRoutines(week.id, [...existingInputs, newRoutineInput]);
}

/**
 * Quita una PlanningWeekRoutine de la semana (le saca el día asignado).
 * NO borra la rutina template del alumno — solo elimina el pivot de la semana.
 * Endpoint targeted (DELETE), rápido. Devuelve la semana sin esa rutina.
 */
export async function removeRoutineFromWeekShared(params: {
  week: PlanningWeek;
  wkRtId: number;
  mode: "own" | "coach";
  studentId?: number;
}): Promise<PlanningWeek> {
  const { week, wkRtId, mode, studentId } = params;
  if (mode === "coach" && studentId != null) {
    await coachRemoveRoutineFromWeek(studentId, wkRtId);
  } else {
    await removeRoutineFromWeek(wkRtId);
  }
  return { ...week, routines: week.routines.filter((r) => r.id !== wkRtId) };
}
