/**
 * coaching.ts — API del área de coaching del panel web.
 * Consume los endpoints /api/coaching/* del backend.
 */

import { httpFetch } from "./http";
import type {
  User,
  Routine,
  Planning,
  PlanningWeek,
  PlanningWeekRoutine,
  PlanningWeekRoutineExercise,
  MonthlyReport,
  ConsistencyHeatmapDay,
  PlanningAdherenceWeek,
  FriendWorkoutLogData,
  RoutineLog,
  PaginationMeta,
  CoachCalendarResponse,
  WeeklyVolumeData,
  CoachTemplate,
  CreateTemplateData,
  ApplyTemplateResponse,
  BulkAssignResponse,
  ProgressionRule,
  CreateProgressionRuleData,
  TrainingGroup,
  TrainingGroupDetail,
  CreateGroupPayload,
  UpdateGroupPayload,
  AssignGroupPlanningPayload,
  AssignGroupPlanningResponse,
  GroupLeaderboardResponse,
  PaginatedGroupsResponse,
  CoachQuestion,
  CoachNote,
  StudentLogListItem,
  WeekRoutineDetail,
} from "./types";
import type {
  AddWeekPayload,
  UpdateWeekPayload,
  ReorderWeeksPayload,
  AssignRoutineToWeekPayload,
  SaveWeekRoutineExercisesPayload,
  SaveWeekRoutineInput,
} from "./plannings";

// ─── Tipos locales de coaching ────────────────────────────────────────────────

export interface CoachDashboardData {
  students: Array<{
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    last_workout_at: string | null;
    current_streak: number;
    workouts_this_week: number;
    workouts_this_month: number;
    active_routine_count: number;
    needs_attention: boolean;
    weekly_adherence_percentage: number | null;
  }>;
  recent_students?: Array<{
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    last_workout_at: string | null;
  }>;
  total_students: number;
  pending_requests_count?: number;
}

export interface CoachDashboardMetrics {
  total_students: number;
  students_active_this_week: number;
  students_inactive_count?: number;
  students_without_planning?: number;
  total_routines?: number;
  active_plannings?: number;
  avg_workouts_per_week?: number;
  most_active_student?: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    current_streak: number;
  } | null;
}

export interface CoachingRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: "pending" | "accepted" | "declined";
  createdAt?: string;
  responded_at?: string | null;
  sender?: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role_id?: number;
  };
}

export interface CoachingRequestsResponse {
  incoming: CoachingRequest[];
  outgoing: CoachingRequest[];
}

export interface StudentListItem {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  email?: string;
  last_workout_at: string | null;
  active_planning_title?: string | null;
  weekly_adherence_percentage: number | null;
  current_streak: number;
  workouts_this_week: number;
  needs_attention: boolean;
}

export interface StudentsListResponse {
  items: StudentListItem[];
  pagination: PaginationMeta;
}

export interface ConsistencyHeatmapResponse {
  days: ConsistencyHeatmapDay[];
  period: { start: string; end: string };
}

export interface PlanningAdherenceResponse {
  weeks: PlanningAdherenceWeek[];
}

export interface StudentLogsResponse {
  items: FriendWorkoutLogData[];
  pagination: PaginationMeta;
}

export interface CreateAndAssignStudentRoutinePayload {
  title: string;
  estimated_duration?: number;
  day_of_week?: string | null;
  order_index?: number;
  exercises?: unknown[];
}

export interface CreateStudentQuestionPayload {
  text: string;
  is_default: boolean;
  answer?: string;
}

export interface UpdateCoachQuestionPayload {
  text?: string;
  is_default?: boolean;
  context_student_id?: number;
}

export interface CoachesListResponse {
  items: Array<{
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  }>;
  pagination: PaginationMeta;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** Dashboard del coach: alumnos recientes + stats */
export async function getCoachDashboard(): Promise<CoachDashboardData> {
  return httpFetch<CoachDashboardData>("/coaching/dashboard");
}

/** Métricas agregadas del coach */
export async function getCoachDashboardMetrics(): Promise<CoachDashboardMetrics> {
  return httpFetch<CoachDashboardMetrics>("/coaching/dashboard/metrics");
}

/**
 * Calendario del coach — entrenamientos de todos los alumnos por día.
 * GET /coaching/dashboard/calendar?month=YYYY-MM[&group_id=N]
 */
export async function getCoachCalendar(
  month: string,
  groupId?: number
): Promise<CoachCalendarResponse> {
  const params = new URLSearchParams({ month });
  if (groupId) params.set("group_id", String(groupId));
  return httpFetch<CoachCalendarResponse>(
    `/coaching/dashboard/calendar?${params.toString()}`
  );
}

// ─── Students ─────────────────────────────────────────────────────────────────

/** Lista paginada de alumnos del coach */
export async function listStudents(params: {
  page?: number;
  search?: string;
  limit?: number;
}): Promise<StudentsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return httpFetch<StudentsListResponse>(`/coaching/students${qs ? `?${qs}` : ""}`);
}

/** Perfil de un alumno */
export async function getStudent(id: number): Promise<User> {
  return httpFetch<User>(`/users/${id}`);
}

/** Reporte mensual de un alumno */
export async function getStudentMonthlyReport(
  studentId: number,
  month?: string // YYYY-MM
): Promise<MonthlyReport> {
  const qs = month ? `?month=${month}` : "";
  return httpFetch<MonthlyReport>(`/coaching/students/${studentId}/monthly-report${qs}`);
}

/**
 * Quitar relación de coaching con un alumno.
 * DELETE /coaching/:userId
 */
export async function removeCoaching(userId: number): Promise<void> {
  await httpFetch<unknown>(`/coaching/${userId}`, { method: "DELETE" });
}

// ─── Coach Requests ───────────────────────────────────────────────────────────

/** Solicitudes de coaching (entrantes + salientes) */
export async function listCoachingRequests(): Promise<CoachingRequestsResponse> {
  return httpFetch<CoachingRequestsResponse>("/coaching/requests");
}

/**
 * Responder una solicitud de coaching (aceptar o rechazar).
 * POST /coaching/requests/:requestId/respond
 *
 * CONTRATO VERIFICADO: el backend espera `{ action: "accept" | "decline" }`.
 * La versión anterior del web enviaba `{ accepted: boolean }` — era un bug.
 * Validator: respondCoachRequestValidator en coachship.validator.js línea 473-479.
 */
export async function respondCoachingRequest(
  requestId: number,
  action: "accept" | "decline"
): Promise<void> {
  await httpFetch<unknown>(`/coaching/requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/**
 * Enviar una solicitud de coaching a un alumno.
 * POST /coaching/requests — body { receiver_id }
 *
 * CONTRATO VERIFICADO: el backend espera `{ receiver_id: number }`.
 * Validator: sendCoachRequestValidator en coachship.validator.js línea 467-471.
 * La función legacy `inviteStudent({ identifier })` enviaba `{ identifier }` — no coincide.
 */
export async function sendCoachRequest(receiverId: number): Promise<void> {
  await httpFetch<null>("/coaching/requests", {
    method: "POST",
    body: JSON.stringify({ receiver_id: receiverId }),
  });
}

/**
 * Resultado de la búsqueda de usuarios (GET /community/users/search).
 */
export interface UserSearchResult {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role_id?: number;
}

/**
 * Busca usuarios por nombre/username/email para resolver su ID antes de
 * enviar una solicitud de coaching. El backend exige `receiver_id` (no acepta
 * `identifier`), por eso el flujo de invitar es: buscar → elegir → sendCoachRequest.
 *
 * GET /community/users/search?query=&limit=&role=alumno
 * Validator: searchUsersValidator (query mín. 2 chars, role "alumno"|"profesor").
 */
export async function searchUsers(
  query: string,
  opts?: { limit?: number; role?: "alumno" | "profesor" }
): Promise<UserSearchResult[]> {
  const params = new URLSearchParams({ query });
  if (opts?.limit) params.set("limit", String(opts.limit));
  params.set("role", opts?.role ?? "alumno");
  return httpFetch<UserSearchResult[]>(
    `/community/users/search?${params.toString()}`
  );
}

/**
 * @deprecated El backend NO acepta `identifier` en POST /coaching/requests —
 * exige `receiver_id`. Usar searchUsers(...) + sendCoachRequest(receiverId).
 * Se conserva el export solo para no romper imports residuales; NO usar.
 */
export async function inviteStudent(params: { identifier: string }): Promise<void> {
  await httpFetch<unknown>("/coaching/requests", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Cancela una solicitud de coaching pendiente.
 * DELETE /coaching/requests/:requestId
 */
export async function cancelCoachRequest(requestId: number): Promise<void> {
  await httpFetch<null>(`/coaching/requests/${requestId}`, { method: "DELETE" });
}

/**
 * Lista los coaches del usuario autenticado.
 * GET /coaching/coaches
 */
export async function listCoaches(params?: {
  page?: number;
  limit?: number;
}): Promise<CoachesListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return httpFetch<CoachesListResponse>(`/coaching/coaches${qs ? `?${qs}` : ""}`);
}

// ─── Student Settings ─────────────────────────────────────────────────────────

/**
 * Actualiza la configuración de inactividad de un alumno.
 * PUT /coaching/students/:studentId/settings
 */
export async function updateStudentSettings(
  studentId: number,
  settings: { inactivity_threshold_days: number }
): Promise<void> {
  await httpFetch<null>(`/coaching/students/${studentId}/settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// ─── Student Routines ─────────────────────────────────────────────────────────

export async function listStudentRoutines(studentId: number): Promise<Routine[]> {
  return httpFetch<Routine[]>(`/coaching/students/${studentId}/routines`);
}

export async function getStudentRoutine(
  studentId: number,
  routineId: number
): Promise<Routine> {
  return httpFetch<Routine>(`/coaching/students/${studentId}/routines/${routineId}`);
}

export async function updateStudentRoutine(
  studentId: number,
  routineId: number,
  payload: Partial<Routine>
): Promise<Routine> {
  return httpFetch<Routine>(
    `/coaching/students/${studentId}/routines/${routineId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

// ─── Student Plannings ────────────────────────────────────────────────────────

export async function listStudentPlannings(studentId: number): Promise<Planning[]> {
  return httpFetch<Planning[]>(`/coaching/students/${studentId}/plannings`);
}

/**
 * Obtiene una planning de un alumno, opcionalmente filtrada por semana.
 * GET /coaching/students/:studentId/plannings/:planningId[?week=N]
 */
export async function getStudentPlanning(
  studentId: number,
  planningId: number,
  opts?: { week?: number }
): Promise<Planning> {
  const qs =
    opts?.week != null && Number.isInteger(opts.week) && opts.week >= 1
      ? `?week=${opts.week}`
      : "";
  return httpFetch<Planning>(
    `/coaching/students/${studentId}/plannings/${planningId}${qs}`
  );
}

export async function updateStudentPlanning(
  studentId: number,
  planningId: number,
  payload: Partial<Planning>
): Promise<Planning> {
  return httpFetch<Planning>(
    `/coaching/students/${studentId}/plannings/${planningId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/**
 * Establece la semana activa de la planning de un alumno.
 * PUT /coaching/students/:studentId/plannings/:planningId/current-week
 *
 * REEMPLAZA setStudentPlanningWeek que enviaba `{ week }` (buggy).
 * El backend espera `{ week_number }`.
 */
export async function setStudentPlanningCurrentWeek(
  studentId: number,
  planningId: number,
  weekNumber: number | null
): Promise<Planning> {
  return httpFetch<Planning>(
    `/coaching/students/${studentId}/plannings/${planningId}/current-week`,
    { method: "PUT", body: JSON.stringify({ week_number: weekNumber }) }
  );
}

/**
 * Duplica la planning de un alumno a la biblioteca del coach.
 * POST /coaching/students/:studentId/plannings/:planningId/duplicate
 */
export async function duplicateStudentPlanningToLibrary(
  studentId: number,
  planningId: number
): Promise<Planning> {
  return httpFetch<Planning>(
    `/coaching/students/${studentId}/plannings/${planningId}/duplicate`,
    { method: "POST" }
  );
}

// ─── Coach: Week Management (alumno) ─────────────────────────────────────────

/** Agrega una nueva semana a la planificación de un alumno. */
export async function coachAddWeek(
  studentId: number,
  planningId: number,
  payload: AddWeekPayload = {}
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(
    `/coaching/students/${studentId}/plannings/${planningId}/weeks`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

/** Actualiza nombre/descripción de una semana de alumno. */
export async function coachUpdateWeek(
  studentId: number,
  weekId: number,
  payload: UpdateWeekPayload
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(
    `/coaching/students/${studentId}/planning-weeks/${weekId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/** Elimina una semana de la planificación de un alumno. */
export async function coachDeleteWeek(
  studentId: number,
  weekId: number
): Promise<void> {
  await httpFetch<null>(
    `/coaching/students/${studentId}/planning-weeks/${weekId}`,
    { method: "DELETE" }
  );
}

/** Reordena las semanas de la planificación de un alumno. */
export async function coachReorderWeeks(
  studentId: number,
  planningId: number,
  payload: ReorderWeeksPayload
): Promise<PlanningWeek[]> {
  return httpFetch<PlanningWeek[]>(
    `/coaching/students/${studentId}/plannings/${planningId}/weeks/reorder`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/** Asigna una rutina a una semana de la planificación de un alumno. */
export async function coachAssignRoutineToWeek(
  studentId: number,
  weekId: number,
  payload: AssignRoutineToWeekPayload
): Promise<PlanningWeekRoutine> {
  return httpFetch<PlanningWeekRoutine>(
    `/coaching/students/${studentId}/planning-weeks/${weekId}/routines`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

/** Quita una rutina de una semana de la planificación de un alumno. */
export async function coachRemoveRoutineFromWeek(
  studentId: number,
  wkRtId: number
): Promise<void> {
  await httpFetch<null>(
    `/coaching/students/${studentId}/planning-week-routines/${wkRtId}`,
    { method: "DELETE" }
  );
}

/** Actualiza los ejercicios del snapshot de una rutina en una semana de alumno. */
export async function coachUpdateWeekRoutineExercises(
  studentId: number,
  wkRtId: number,
  payload: SaveWeekRoutineExercisesPayload
): Promise<PlanningWeekRoutineExercise[]> {
  return httpFetch<PlanningWeekRoutineExercise[]>(
    `/coaching/students/${studentId}/planning-week-routines/${wkRtId}/exercises`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/**
 * Guarda el estado completo de una semana de alumno en una sola llamada transaccional.
 * El backend borra los pivots que no vengan en el payload (respetando autoría en coach).
 * PUT /coaching/students/:studentId/planning-weeks/:weekId/routines
 */
export async function coachSaveWeekRoutines(
  studentId: number,
  weekId: number,
  routines: SaveWeekRoutineInput[]
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(
    `/coaching/students/${studentId}/planning-weeks/${weekId}/routines`,
    { method: "PUT", body: JSON.stringify({ routines }) }
  );
}

/**
 * Reemplaza el contenido de una semana de alumno con el de otra semana.
 * POST /coaching/students/:studentId/planning-weeks/:targetWeekId/copy-from/:sourceWeekId
 */
export async function coachCopyWeekRoutines(
  studentId: number,
  sourceWeekId: number,
  targetWeekId: number
): Promise<PlanningWeekRoutine[]> {
  return httpFetch<PlanningWeekRoutine[]>(
    `/coaching/students/${studentId}/planning-weeks/${targetWeekId}/copy-from/${sourceWeekId}`,
    { method: "POST" }
  );
}

/**
 * Crea una semana nueva al final del planning y copia ahí el contenido de la
 * semana origen (operación atómica).
 * POST /coaching/students/:studentId/plannings/:planningId/weeks/append-from/:sourceWeekId
 */
export async function appendWeekFromCopy(
  studentId: number,
  planningId: number,
  sourceWeekId: number
): Promise<PlanningWeek> {
  return httpFetch<PlanningWeek>(
    `/coaching/students/${studentId}/plannings/${planningId}/weeks/append-from/${sourceWeekId}`,
    { method: "POST" }
  );
}

/**
 * Crea una rutina (owner=alumno, created_by=coach) y la asigna a la semana
 * indicada en una sola transacción atómica.
 * POST /coaching/students/:studentId/planning-weeks/:weekId/routines/new
 */
export async function createAndAssignStudentRoutine(
  studentId: number,
  weekId: number,
  payload: CreateAndAssignStudentRoutinePayload
): Promise<PlanningWeekRoutine> {
  return httpFetch<PlanningWeekRoutine>(
    `/coaching/students/${studentId}/planning-weeks/${weekId}/routines/new`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

// ─── Bulk Assign Planning ─────────────────────────────────────────────────────

/**
 * Asigna una planning a múltiples alumnos en una sola operación.
 * POST /coaching/plannings/bulk-assign
 */
export async function bulkAssignPlanning(
  planningId: number,
  studentIds: number[]
): Promise<BulkAssignResponse> {
  return httpFetch<BulkAssignResponse>("/coaching/plannings/bulk-assign", {
    method: "POST",
    body: JSON.stringify({ planning_id: planningId, student_ids: studentIds }),
  });
}

// ─── Student Logs ─────────────────────────────────────────────────────────────

/**
 * Historial de workouts paginado de un alumno (firma con `page`).
 * Usada actualmente por StudentHistoryTab.
 *
 * NOTA: el backend (coachListStudentLogsValidator) requiere `startDate` y `endDate`
 * obligatorios. Esta función con `{ page }` NO coincide con el contrato real del backend
 * y producirá errores de validación 400. Se mantiene para no romper StudentHistoryTab
 * mientras se migra ese componente a `listStudentLogsByDateRange`.
 *
 * @deprecated Migrar a listStudentLogsByDateRange({ startDate, endDate }).
 */
export async function listStudentLogs(
  studentId: number,
  params: { page?: number }
): Promise<StudentLogsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  const qs = query.toString();
  return httpFetch<StudentLogsResponse>(
    `/coaching/students/${studentId}/logs${qs ? `?${qs}` : ""}`
  );
}

/**
 * Lista los logs del alumno filtrados por rango de fechas.
 * GET /coaching/students/:studentId/logs?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Contrato real del backend — usa startDate/endDate obligatorios (rango máx 35 días).
 * Usada por el componente de progreso semanal (Fase 5).
 */
export async function listStudentLogsByDateRange(
  studentId: number,
  params: { startDate: string; endDate: string }
): Promise<StudentLogListItem[]> {
  const searchParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return httpFetch<StudentLogListItem[]>(
    `/coaching/students/${studentId}/logs?${searchParams.toString()}`
  );
}

/**
 * Obtiene el detalle completo de un log de alumno.
 * GET /coaching/students/:studentId/logs/:logId
 */
export async function getStudentLogDetail(
  studentId: number,
  logId: number
): Promise<FriendWorkoutLogData> {
  return httpFetch<FriendWorkoutLogData>(
    `/coaching/students/${studentId}/logs/${logId}`
  );
}

/**
 * Obtiene el último log de una rutina del alumno (cualquier semana).
 * GET /coaching/students/:studentId/routines/:routineId/logs?per_page=1
 *
 * Devuelve null si el alumno nunca entrenó esa rutina.
 */
export async function getLastStudentRoutineLog(
  studentId: number,
  routineId: number,
  opts?: { lineage?: boolean }
): Promise<{ items: FriendWorkoutLogData[] } | null> {
  const lineageParam = opts?.lineage ? "&lineage=true" : "";
  return httpFetch<{ items: FriendWorkoutLogData[] } | null>(
    `/coaching/students/${studentId}/routines/${routineId}/logs?per_page=1${lineageParam}`
  );
}

// ─── Student Weekly Volume ────────────────────────────────────────────────────

/**
 * Volumen semanal entrenado por un alumno.
 * GET /coaching/students/:studentId/weekly-volume
 */
export async function getStudentTrainedVolume(
  studentId: number,
  params?: { weeks?: number; start_date?: string; end_date?: string }
): Promise<WeeklyVolumeData> {
  const searchParams = new URLSearchParams();
  if (params?.start_date && params?.end_date) {
    searchParams.set("start_date", params.start_date);
    searchParams.set("end_date", params.end_date);
  } else if (params?.weeks) {
    searchParams.set("weeks", String(params.weeks));
  }
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return httpFetch<WeeklyVolumeData>(
    `/coaching/students/${studentId}/weekly-volume${query}`
  );
}

// ─── Legacy progress (sin range) — mantener hasta que los componentes migren ──

/**
 * @deprecated Usar getCoachStudentConsistencyHeatmap de coaching-progress.ts con range.
 */
export async function getConsistencyHeatmap(
  studentId: number
): Promise<ConsistencyHeatmapResponse> {
  return httpFetch<ConsistencyHeatmapResponse>(
    `/coaching/students/${studentId}/progress/consistency-heatmap`
  );
}

/**
 * @deprecated Usar getCoachStudentPlanningAdherence de coaching-progress.ts con range.
 */
export async function getPlanningAdherence(
  studentId: number,
  params?: { weeks?: number }
): Promise<PlanningAdherenceResponse> {
  const query = new URLSearchParams();
  if (params?.weeks) query.set("weeks", String(params.weeks));
  const qs = query.toString();
  return httpFetch<PlanningAdherenceResponse>(
    `/coaching/students/${studentId}/progress/planning-adherence${qs ? `?${qs}` : ""}`
  );
}

// ─── Coach Notes — Preguntas ──────────────────────────────────────────────────

/** Devuelve las preguntas del coach para un alumno (defaults + exclusivas), con respuesta incrustada. */
export async function listStudentQuestions(
  studentId: number
): Promise<CoachQuestion[]> {
  return httpFetch<CoachQuestion[]>(`/coaching/students/${studentId}/questions`);
}

/** Crea una pregunta del coach para un alumno; si `is_default=true` aplica a todos los alumnos. */
export async function createStudentQuestion(
  studentId: number,
  payload: CreateStudentQuestionPayload
): Promise<CoachQuestion> {
  return httpFetch<CoachQuestion>(`/coaching/students/${studentId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Actualiza texto o scope (default/exclusiva) de una pregunta del coach. */
export async function updateCoachQuestion(
  questionId: number,
  payload: UpdateCoachQuestionPayload
): Promise<CoachQuestion> {
  return httpFetch<CoachQuestion>(`/coaching/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Elimina una pregunta del coach y sus respuestas en cascada. */
export async function deleteCoachQuestion(questionId: number): Promise<void> {
  await httpFetch<null>(`/coaching/questions/${questionId}`, { method: "DELETE" });
}

/** Crea o actualiza la respuesta del coach a una pregunta para un alumno. */
export async function upsertQuestionAnswer(
  studentId: number,
  questionId: number,
  payload: { answer: string }
): Promise<{ id: number; text: string; updated_at: string }> {
  return httpFetch<{ id: number; text: string; updated_at: string }>(
    `/coaching/students/${studentId}/questions/${questionId}/answer`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

/** Elimina la respuesta del coach a una pregunta para un alumno. */
export async function deleteQuestionAnswer(
  studentId: number,
  questionId: number
): Promise<void> {
  await httpFetch<null>(
    `/coaching/students/${studentId}/questions/${questionId}/answer`,
    { method: "DELETE" }
  );
}

// ─── Coach Notes — Notas de texto libre ──────────────────────────────────────

/** Devuelve las notas del coach sobre un alumno, ordenadas por fecha descendente. */
export async function listStudentNotes(studentId: number): Promise<CoachNote[]> {
  return httpFetch<CoachNote[]>(`/coaching/students/${studentId}/notes`);
}

/** Crea una nota de texto libre del coach sobre un alumno. */
export async function createStudentNote(
  studentId: number,
  payload: { text: string }
): Promise<CoachNote> {
  return httpFetch<CoachNote>(`/coaching/students/${studentId}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Actualiza el texto de una nota del coach. */
export async function updateCoachNote(
  noteId: number,
  payload: { text: string }
): Promise<CoachNote> {
  return httpFetch<CoachNote>(`/coaching/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Elimina una nota del coach. */
export async function deleteCoachNote(noteId: number): Promise<void> {
  await httpFetch<null>(`/coaching/notes/${noteId}`, { method: "DELETE" });
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function listCoachTemplates(category?: string): Promise<CoachTemplate[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return httpFetch<CoachTemplate[]>(`/coaching/templates${query}`);
}

export async function getCoachTemplate(templateId: number): Promise<CoachTemplate> {
  return httpFetch<CoachTemplate>(`/coaching/templates/${templateId}`);
}

export async function createCoachTemplate(data: CreateTemplateData): Promise<CoachTemplate> {
  return httpFetch<CoachTemplate>("/coaching/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteCoachTemplate(templateId: number): Promise<void> {
  await httpFetch<null>(`/coaching/templates/${templateId}`, { method: "DELETE" });
}

export async function applyCoachTemplate(
  templateId: number,
  studentIds: number[]
): Promise<ApplyTemplateResponse> {
  return httpFetch<ApplyTemplateResponse>(`/coaching/templates/${templateId}/apply`, {
    method: "POST",
    body: JSON.stringify({ student_ids: studentIds }),
  });
}

// ─── Progression Rules ────────────────────────────────────────────────────────

export async function listProgressionRules(studentId: number): Promise<ProgressionRule[]> {
  return httpFetch<ProgressionRule[]>(
    `/coaching/students/${studentId}/progression-rules`
  );
}

export async function getProgressionRule(
  studentId: number,
  ruleId: number
): Promise<ProgressionRule> {
  return httpFetch<ProgressionRule>(
    `/coaching/students/${studentId}/progression-rules/${ruleId}`
  );
}

export async function createProgressionRule(
  studentId: number,
  data: CreateProgressionRuleData
): Promise<ProgressionRule> {
  return httpFetch<ProgressionRule>(
    `/coaching/students/${studentId}/progression-rules`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function updateProgressionRule(
  studentId: number,
  ruleId: number,
  data: Partial<CreateProgressionRuleData> & { is_active?: boolean }
): Promise<ProgressionRule> {
  return httpFetch<ProgressionRule>(
    `/coaching/students/${studentId}/progression-rules/${ruleId}`,
    { method: "PUT", body: JSON.stringify(data) }
  );
}

export async function deleteProgressionRule(
  studentId: number,
  ruleId: number
): Promise<void> {
  await httpFetch<null>(
    `/coaching/students/${studentId}/progression-rules/${ruleId}`,
    { method: "DELETE" }
  );
}

// ─── Training Groups ──────────────────────────────────────────────────────────

export async function listGroups(options?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<PaginatedGroupsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.perPage) params.set("per_page", String(options.perPage));
  if (options?.search) params.set("search", options.search);
  const qs = params.toString();
  // GET /coaching/groups pone el array en `data` y `pagination`/`totalMembers`
  // como HERMANOS del envelope (no anidados en `data`). Pedimos el envelope
  // completo y lo mapeamos a la forma { items, pagination, totalMembers }.
  const env = await httpFetch<{
    data?: TrainingGroup[];
    pagination?: PaginationMeta;
    totalMembers?: number;
  }>(`/coaching/groups${qs ? `?${qs}` : ""}`, { rawEnvelope: true });
  return {
    items: env.data ?? [],
    pagination:
      env.pagination ?? { page: 1, per_page: 0, total: 0, total_pages: 0 },
    totalMembers: env.totalMembers ?? 0,
  };
}

export async function getGroup(groupId: number): Promise<TrainingGroupDetail> {
  return httpFetch<TrainingGroupDetail>(`/coaching/groups/${groupId}`);
}

export async function createGroup(data: CreateGroupPayload): Promise<TrainingGroupDetail> {
  return httpFetch<TrainingGroupDetail>("/coaching/groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGroup(
  groupId: number,
  data: UpdateGroupPayload
): Promise<TrainingGroup> {
  return httpFetch<TrainingGroup>(`/coaching/groups/${groupId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(groupId: number): Promise<{ message: string }> {
  return httpFetch<{ message: string }>(`/coaching/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function addGroupMembers(
  groupId: number,
  studentIds: number[]
): Promise<{ added: number }> {
  return httpFetch<{ added: number }>(`/coaching/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ student_ids: studentIds }),
  });
}

export async function removeGroupMember(
  groupId: number,
  studentId: number
): Promise<{ message: string }> {
  return httpFetch<{ message: string }>(
    `/coaching/groups/${groupId}/members/${studentId}`,
    { method: "DELETE" }
  );
}

export async function assignGroupPlanning(
  groupId: number,
  data: AssignGroupPlanningPayload
): Promise<AssignGroupPlanningResponse> {
  return httpFetch<AssignGroupPlanningResponse>(
    `/coaching/groups/${groupId}/assign-planning`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function unassignGroupPlanning(
  groupId: number
): Promise<{ message: string }> {
  return httpFetch<{ message: string }>(
    `/coaching/groups/${groupId}/assign-planning`,
    { method: "DELETE" }
  );
}

export async function getGroupLeaderboard(
  groupId: number,
  sortBy?: string,
  period?: string
): Promise<GroupLeaderboardResponse> {
  const params = new URLSearchParams();
  if (sortBy) params.set("sort_by", sortBy);
  if (period) params.set("period", period);
  const qs = params.toString();
  return httpFetch<GroupLeaderboardResponse>(
    `/coaching/groups/${groupId}/leaderboard${qs ? `?${qs}` : ""}`
  );
}

// Legacy week exercises eliminados — los componentes PlanningEditor.tsx / WeekExercisesEditor.tsx
// que los usaban fueron eliminados en la Fase 1 del rework de plannings.

// ─── Attention Dashboard ──────────────────────────────────────────────────────

export interface AttentionStudent {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_workout_at: string | null;
  inactive: boolean;
  inactive_days: number | null;
  without_planning: boolean;
  commented_routines: Array<{
    routine_id: number;
    routine_title: string;
    last_comment_at: string;
    unread_count: number;
  }>;
}

export interface CoachAttentionResponse {
  students: AttentionStudent[];
}

/**
 * Alumnos que necesitan atención del coach.
 * GET /coaching/dashboard/attention[?group_id=N]
 * Solo incluye alumnos con al menos un problema; ya viene ordenado por gravedad.
 */
export async function getCoachAttention(
  groupId?: number
): Promise<CoachAttentionResponse> {
  const qs = groupId ? `?group_id=${groupId}` : "";
  return httpFetch<CoachAttentionResponse>(
    `/coaching/dashboard/attention${qs}`
  );
}
