/**
 * coaching.ts — API del área de coaching del panel web.
 * Consume los endpoints /api/coaching/* del backend.
 */

import { httpFetch } from "./http";
import type {
  User,
  Routine,
  Planning,
  PlanningWeekExercise,
  MonthlyReport,
  ConsistencyHeatmapDay,
  PlanningAdherenceWeek,
  FriendWorkoutLogData,
  PaginationMeta,
} from "./types";

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

// ─── Funciones de API ─────────────────────────────────────────────────────────

/** Dashboard del coach: alumnos recientes + stats */
export async function getCoachDashboard(): Promise<CoachDashboardData> {
  return httpFetch<CoachDashboardData>("/coaching/dashboard");
}

/** Métricas agregadas del coach */
export async function getCoachDashboardMetrics(): Promise<CoachDashboardMetrics> {
  return httpFetch<CoachDashboardMetrics>("/coaching/dashboard/metrics");
}

/** Lista paginada de alumnos del coach */
export async function listStudents(params: {
  page?: number;
  search?: string;
}): Promise<StudentsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
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

/** Historial de workouts de un alumno */
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

/** Heatmap de consistencia del alumno */
export async function getConsistencyHeatmap(
  studentId: number
): Promise<ConsistencyHeatmapResponse> {
  return httpFetch<ConsistencyHeatmapResponse>(
    `/coaching/students/${studentId}/progress/consistency-heatmap`
  );
}

/** Adherencia por semana del alumno */
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

/** Solicitudes de coaching (entrantes + salientes) */
export async function listCoachingRequests(): Promise<CoachingRequestsResponse> {
  return httpFetch<CoachingRequestsResponse>("/coaching/requests");
}

/** Responder una solicitud de coaching */
export async function respondCoachingRequest(
  requestId: number,
  accepted: boolean
): Promise<void> {
  await httpFetch<unknown>(`/coaching/requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ accepted }),
  });
}

/** Quitar relación de coaching con un alumno */
export async function removeCoaching(userId: number): Promise<void> {
  await httpFetch<unknown>(`/coaching/${userId}`, { method: "DELETE" });
}

/** Invitar a un alumno por email o username */
export async function inviteStudent(params: { identifier: string }): Promise<void> {
  await httpFetch<unknown>("/coaching/requests", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Rutinas del alumno ───────────────────────────────────────────────────────

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

// ─── Plannings del alumno ─────────────────────────────────────────────────────

export async function listStudentPlannings(studentId: number): Promise<Planning[]> {
  return httpFetch<Planning[]>(`/coaching/students/${studentId}/plannings`);
}

export async function getStudentPlanning(
  studentId: number,
  planningId: number
): Promise<Planning> {
  return httpFetch<Planning>(
    `/coaching/students/${studentId}/plannings/${planningId}`
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

export async function setStudentPlanningWeek(
  studentId: number,
  planningId: number,
  week: number
): Promise<void> {
  await httpFetch<unknown>(
    `/coaching/students/${studentId}/plannings/${planningId}/current-week`,
    { method: "PUT", body: JSON.stringify({ week }) }
  );
}

export async function getStudentPlanningWeekExercises(
  studentId: number,
  planningId: number,
  week: number,
  routineId: number
): Promise<PlanningWeekExercise[]> {
  return httpFetch<PlanningWeekExercise[]>(
    `/coaching/students/${studentId}/plannings/${planningId}/weeks/${week}/routines/${routineId}/exercises`
  );
}

export async function updateStudentPlanningWeekExercises(
  studentId: number,
  planningId: number,
  week: number,
  routineId: number,
  payload: unknown
): Promise<PlanningWeekExercise[]> {
  return httpFetch<PlanningWeekExercise[]>(
    `/coaching/students/${studentId}/plannings/${planningId}/weeks/${week}/routines/${routineId}/exercises`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}
