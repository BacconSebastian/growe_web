/**
 * Tipos de ejercicio canónicos (Fase 2 en adelante).
 * - 'weight'   → reps, weight_kg, rir  (antes: 'normal')
 * - 'timed'    → seconds
 * - 'superset' → reps, weight_kg, rir  (+ alias requerido en cada set)
 * - 'custom'   → variables definidas por el usuario (variables_config obligatorio)
 *
 * @deprecated 'normal' | 'warmup' | 'warmup_timed' ya no existen en el backend.
 * El flag `is_warmup: boolean` reemplaza la semántica de warmup.
 * TODO Fase 3: remover los valores legacy del union una vez que los editores estén actualizados.
 */
export type ExerciseType =
  | 'weight'
  | 'timed'
  | 'superset'
  | 'custom'
  // Legacy — mantenidos para compatibilidad con datos históricos y editores pendientes de Fase 3
  | 'normal'
  | 'warmup'
  | 'warmup_timed';

// ─── Variables personalizables por ejercicio ─────────────────────────────────

/** Keys canónicas del catálogo de variables */
export type CanonicalVariableKey =
  | 'reps'
  | 'weight_kg'
  | 'rir'
  | 'seconds'
  | 'minutes'
  | 'distance_m'
  | 'distance_km'
  | 'calories'
  | 'bricks'
  | 'rpe';

/** Definición de una variable (canónica o custom) */
export interface VariableDef {
  key: string;            // canónica o slug custom
  label?: string;         // override del label o label custom
  unit?: string;          // override de unit (opcional)
  is_custom: boolean;     // true → no participa en progress-comparison automático
  type: 'int' | 'number';
  default_value?: number;
}

/**
 * Configuración de variables de un ejercicio.
 * Siempre presente en las respuestas del backend (never null).
 * version: 1 para futuras migraciones de schema.
 */
export interface VariablesConfig {
  version: 1;
  variables: VariableDef[];
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string;
  role_id: number;
  is_premium?: boolean;
  avatar_url?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  age?: number | null;
  email_verified?: boolean;
  max_students?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegistrationResult {
  user: User;
  verificationToken: string;
  requiresVerification: true;
}

export interface LoginRequiresVerification {
  requiresVerification: true;
  verificationToken: string;
  user: { email: string };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message?: string;
  };
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedCollection<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface RoutineExerciseSet {
  reps?: number | null;
  reps_max?: number | null;
  weight_kg?: number | null;
  weight_kg_max?: number | null;
  rir?: number | null;
  rir_max?: number | null;
  seconds?: number | null;
  seconds_max?: number | null;
  // Nuevas variables canónicas (Fase 2)
  distance_m?: number | null;
  calories?: number | null;
  bricks?: number | null;
  rpe?: number | null;
  // Bag de variables custom namespaced bajo 'custom'
  custom?: Record<string, number> | null;
  alias?: string | null;
  rest_time?: number | null;
}

export interface RoutineExercise {
  id: number;
  routine_id: number;
  exercise_id?: number | null;
  name: string;
  series: number;
  repetitions: number;
  weight_kg?: number | null;
  rir?: number | null;
  tempo?: string | null;
  notes?: string | null;
  order_index: number;
  variant_order?: number;
  sets_data?: RoutineExerciseSet[] | null;
  exercise_type?: ExerciseType;
  /** Flag ortogonal al tipo: true = ejercicio de calentamiento. No cambia variables. */
  is_warmup?: boolean;
  /**
   * Configuración de variables del ejercicio.
   * El backend SIEMPRE la resuelve (nunca null en respuestas GET).
   * Para presets sin personalización, refleja el config canónico del preset.
   */
  variables_config?: VariablesConfig;
  /** UUID v4 del grupo superset; null = ejercicio suelto. */
  superset_group?: string | null;
  description?: string | null;
  exercise?: { id: number; name: string; description?: string | null } | null;
  createdAt?: string;
  updated_at?: string;
}

export interface RoutineCreator {
  id: number;
  username: string;
  role_id?: number;
  first_name?: string | null;
  last_name?: string | null;
}

export interface RoutineShare {
  id: number;
  routine_id: number;
  recipient_routine_id?: number | null;
  shared_by: number;
  shared_with: number | null;
  access_level: string;
  status: string;
  sharedWith?: { id: number; username: string; avatar_url?: string | null };
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Routine {
  id: number;
  title: string;
  description?: string | null;
  estimated_duration?: number | null;
  status: string;
  is_public: boolean;
  created_by: number;
  owner_user_id: number;
  source_routine_id?: number | null;
  planning_id?: number | null;
  planning_title?: string | null;
  day_of_week?: DayOfWeek[] | DayOfWeek | null;
  createdAt?: string;
  updated_at?: string;
  exercises: RoutineExercise[];
  creator?: RoutineCreator | null;
  owner?: RoutineCreator | null;
  active_share?: RoutineShare | null;
  coach_share_id?: number | null;
  planning_current_week?: number;
  planning_total_weeks?: number;
  current_week_exercises?: RoutineExercise[];
  current_week_exercise_count?: number | null;
  shares?: RoutineShare[];
}

export interface PlanningWeekExercise {
  id: number;
  planning_id: number;
  routine_id: number;
  routine_exercise_id?: number | null;
  week_number: number;
  exercise_id?: number | null;
  name: string;
  order_index: number;
  variant_order?: number;
  series: number;
  repetitions: number;
  weight_kg?: number | null;
  rir?: number | null;
  sets_data?: RoutineExerciseSet[] | null;
  exercise_type?: ExerciseType;
  /** Flag ortogonal al tipo: true = ejercicio de calentamiento. No cambia variables. */
  is_warmup?: boolean;
  /**
   * Configuración de variables del ejercicio.
   * El backend SIEMPRE la resuelve (nunca null en respuestas GET).
   */
  variables_config?: VariablesConfig;
  description?: string | null;
  exercise?: { id: number; name: string; description?: string | null } | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlanningShareUser {
  id: number;
  username: string;
  avatar_url?: string | null;
}

export interface PlanningShare {
  id: number;
  planning_id: number;
  recipient_planning_id?: number | null;
  shared_by: number;
  shared_with: number;
  status: "pending" | "active" | "revoked";
  notes?: string | null;
  createdAt?: string;
  sharedBy?: PlanningShareUser;
  sharedWith?: PlanningShareUser;
}

export interface PlanningShareRequest {
  id: number;
  planning: {
    id: number;
    title: string;
    total_weeks: number;
    target_days: DayOfWeek[] | null;
  };
  sharedBy: PlanningShareUser;
  status: "pending" | "active" | "revoked";
  notes?: string | null;
  createdAt: string;
}

// ─── New planning model — semanas como entidad ───────────────────────────────

export interface PlanningWeekRoutineExercise {
  id: number;                          // planning_week_routine_exercise_id
  routine_exercise_id?: number | null; // FK estable a routine_exercises
  exercise_id?: number | null;
  name: string;
  series: number;
  repetitions: number;
  weight_kg?: number | null;
  rir?: number | null;
  order_index: number;
  variant_order?: number;
  sets_data?: RoutineExerciseSet[] | null;
  exercise_type?: ExerciseType;
  is_warmup?: boolean;
  variables_config?: VariablesConfig;  // backend SIEMPRE la resuelve (nunca null en GET)
  superset_group?: string | null;      // UUID v4 del grupo; null = suelto
  exercise?: { id: number; name: string; description?: string | null } | null;
}

export interface PlanningWeekRoutine {
  id: number;                          // planning_week_routine_id (pivot)
  routine_id: number;
  routine_title: string;
  order_index: number;
  day_of_week?: string | null;
  routine_day_of_week?: string[] | null;
  created_by?: number | null;          // autor de la rutina template (authorship coach)
  exercises: PlanningWeekRoutineExercise[];
}

export interface PlanningWeek {
  id: number;                          // planning_week_id
  week_number: number;
  name?: string | null;
  description?: string | null;
  routines: PlanningWeekRoutine[];
  created_at?: string;
  updated_at?: string;
}

export interface WeekRoutineDetail {
  id: number;
  routine_id: number;
  routine_title: string;
  planning_id: number;
  planning_title: string;
  week_number: number;
  day_of_week: string | null;
  routine_day_of_week: string | null;
  exercises: PlanningWeekRoutineExercise[];
}

export interface Planning {
  id: number;
  title: string;
  created_by: number;
  owner_user_id: number;
  target_days: DayOfWeek[] | null;
  status: 'draft' | 'active' | 'archived' | 'completed' | 'scheduled';
  /** @deprecated total_weeks ya no existe en DB — se deriva de weeks.length */
  total_weeks: number;
  start_date?: string | null;
  current_week_override?: number | null;
  current_week?: number;
  created_at?: string;
  updated_at?: string;
  routines?: Routine[];
  weekExercises?: PlanningWeekExercise[];
  week_exercises_grouped?: Record<string, Record<string, PlanningWeekExercise[]>>;
  shared_by_user?: PlanningShareUser | null;
  planningShares?: PlanningShare[];
  coach_share_id?: number | null;
  /** Semanas del planning (modelo nuevo). Hidratado por GET /plannings/:id */
  weeks?: PlanningWeek[];
}

export interface RoutineLog {
  id: number;
  routine_id: number | null;
  user_id: number;
  performed_at: string;
  duration_minutes?: number | null;
  mood?: string | null;
  energy_level?: string | null;
  notes?: string | null;
  week_number?: number | null;
  client_request_id?: string | null;
  routine_updated?: boolean;
  routine_update_warnings?: string[];
  idempotent_replay?: boolean;
  routine_snapshot?: {
    exercises?: Array<{
      id: number;
      name: string;
      exercise_id?: number | null;
      order_index: number;
      variant_order?: number;
      exercise_type?: string;
      is_warmup?: boolean;
    }>;
    workout_progress?: Array<{
      orderIndex: number;
      variantId: number | null;
      exerciseId?: number | null;
      setLogs: Array<{
        reps: number;
        weight: number;
        rir: number;
        seconds?: number;
        completed: boolean;
      }>;
    }> | null;
  };
}

export interface MetricsOverview {
  total_trainings: number;
  current_week_trainings: number;
  daily_streak_days: number;
  longest_streak: number;
  last_training: {
    id: number;
    routine_id: number | null;
    routine_title: string | null;
    performed_at: string;
    duration_minutes: number | null;
    mood: string | null;
    energy_level: string | null;
    notes: string | null;
  } | null;
  time_since_first_training: {
    since: string;
    days: number;
  } | null;
  previous_week_trained_days: string[];         // deprecated — kept for compat
  previous_week_trained_day_keys: string[];     // canonical new name
  previous_week_trained_days_count: number;     // scalar count
  routines: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: string;
    last_completed_at: string | null;
    completed_days_this_week: DayOfWeek[];
  }>;
  all_completed_days_this_week: DayOfWeek[];
  weekly_target_days_count: number | null;
  weekly_scheduled_days_keys: DayOfWeek[];
  weekly_adherence_percentage: number | null;
  monthly_adherence_percentage: number | null;
  weekly_average_trainings: number;
  planned_days_in_current_month: number | null;
}

export interface ExerciseProgressEntry {
  log_id?: number;
  exercise_id?: number | null;
  performed_at?: string | null;
  date: string;
  weight_kg: number | null;
  series: number;
  repetitions: number | null;
  rir: number | null;
  routine_title: string | null;
  exercise_name?: string | null;
  set_logs?: Array<{
    set_number: number;
    weight: number | null;
    reps: number | null;
    rir: number | null;
  }>;
}

export interface WeightProgressEntry {
  date: string;
  weight_kg: number;
}

export interface WeightLogEntry {
  id: number;
  user_id: number;
  log_date: string;
  weight_kg: number;
  created: boolean;
}

export interface ActiveWorkoutInfo {
  gym_name: string | null;
  routine_id: number | null;
  started_at: string;
}

export interface FriendSummary {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role_id?: number;
  role?: Role | null;
  role_name?: string;
  active_workout?: ActiveWorkoutInfo | null;
  active_planning_title?: string | null;
  active_planning_current_week?: number | null;
  active_planning_id?: number | null;
  active_planning_total_weeks?: number | null;
  active_planning_share_id?: number | null;
}

export interface FriendRequestUser {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role_id?: number;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: "pending" | "accepted" | "declined";
  createdAt?: string;
  responded_at?: string | null;
  sender?: FriendRequestUser;
  receiver?: FriendRequestUser;
}

export interface FriendRequestsResponse {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface RoutineShareRequest {
  id: number;
  routine: {
    id: number;
    title: string;
  };
  sharedBy: FriendRequestUser;
  status: "pending" | "active" | "revoked" | "expired";
  notes?: string | null;
  createdAt: string;
}

export interface RoutineShareSummary {
  id: number;
  routine_id: number;
  recipient_routine_id?: number | null;
  shared_with: number | null;
  status: "pending" | "active" | "revoked" | "expired";
  routine?: {
    id: number;
    title: string;
  };
  sharedBy?: RoutineCreator | null;
  sharedWith?: RoutineCreator | null;
  createdAt?: string;
}

export interface PlanningShareSummary {
  id: number;
  planning_id: number;
  recipient_planning_id?: number | null;
  shared_with: number | null;
  status: "pending" | "active" | "revoked";
  planning?: { id: number; title: string; status: string };
  sharedBy?: { id: number; username: string; avatar_url?: string | null } | null;
  sharedWith?: { id: number; username: string; avatar_url?: string | null } | null;
  createdAt?: string;
}

export interface ExerciseOption {
  exercise_id: number | null;
  name: string;
  has_progress: boolean;
}

export interface FriendWorkoutLogData {
  id: number;
  routine_id: number;
  user_id: number;
  performed_at: string;
  duration_minutes?: number | null;
  notes?: string | null;
  mood?: string | null;
  energy_level?: string | null;
  week_number?: number | null;
  routine_snapshot: {
    routine: {
      id: number;
      title: string;
      description?: string | null;
      estimated_duration?: number | null;
      status: string;
      created_by: number;
      created_at: string;
      updated_at: string;
      planning_id?: number | null;
      planning_current_week?: number;
      planning_total_weeks?: number;
    };
    exercises: Array<{
      id: number;
      exercise_id?: number | null;
      variant_id?: number | null;
      exercise_name_at_log?: string | null;
      name: string;
      series: number;
      repetitions: number;
      weight_kg?: number | null;
      rir?: number | null;
      rest_time?: number | null;
      order_index: number;
      variant_order?: number;
      exercise_type?: string | null;
      is_warmup?: boolean;
      sets_data?: Array<Record<string, unknown>> | null;
      variables_config?: VariablesConfig | null;
    }>;
    assigned_users?: Array<{
      id: number;
      username: string;
    }>;
    workout_progress?: Array<{
      orderIndex: number;
      variantId: number | null;
      exerciseId?: number | null;
      setLogs: Array<{
        reps: number;
        weight: number;
        rir: number;
        completed: boolean;
        seconds?: number;
        alias?: string | null;
      }>;
    }> | null;
  };
  metrics_snapshot?: Record<string, unknown> | null;
  user: {
    id: number;
    username: string;
  };
  routine: {
    id: number;
    title: string;
  };
}

export interface FriendProfileWorkout {
  id: number;
  routine_id: number | null;
  routine_title: string | null;
  performed_at: string | null;
  duration_minutes?: number | null;
  muscle_groups?: string[];
}

export interface StreakLeaderboardEntry {
  user: FriendSummary;
  daily_streak_days: number;
  total_trainings: number;
}

export interface FriendsListResponse {
  items: FriendSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProfessorsListResponse {
  items: FriendSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export type RecentActivityEvent =
  | {
      type: "workout_completed";
      user: FriendSummary;
      routine: { id: number; title: string; planning_id: number | null; planning_title: string | null; planning_share_id?: number | null } | null;
      performed_at: string;
      message: string;
    }
  | {
      type: "currently_training";
      user: FriendSummary;
      gym_name: string | null;
      started_at: string;
      message: string;
    }
  | {
      type: "streak_broken";
      user: FriendSummary;
      message: string;
      date: string;
      performed_at?: string;
    }
  | {
      type: "achievement_earned";
      user: FriendSummary;
      achievement: {
        id: number;
        key: string;
        name: string;
        icon: string | null;
        category: string | null;
      };
      earned_at: string;
      performed_at: string;
      message: string;
    }
  | {
      type: "personal_record";
      user: FriendSummary;
      exercise: { id: number; name: string };
      weight: number;
      performed_at: string;
      message: string;
    };

export interface CoachRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: "pending" | "accepted" | "declined";
  createdAt?: string;
  responded_at?: string | null;
  sender?: FriendRequestUser;
  receiver?: FriendRequestUser;
}

export interface CoachRequestsResponse {
  incoming: CoachRequest[];
  outgoing: CoachRequest[];
}

export interface CoachesListResponse {
  items: FriendSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface StudentsListResponse {
  items: FriendSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CommunityUserSearchResult {
  id: number;
  username: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
}

export interface FriendProfileRoutine {
  id: number;
  title: string;
  status: string;
  estimated_duration?: number | null;
  createdAt?: string | null;
  created_by?: number;
  exercise_count: number;
}

export interface FriendProfileWeeklyEntry {
  week_start: string;
  label: string;
  workouts: number;
}

export interface FriendProfileData {
  friend: {
    id: number;
    username: string;
    email?: string;
    avatar_url?: string | null;
    role?: Role | null;
  };
  metrics: MetricsOverview;
  workouts_this_month: number | null;
  weekly_summary: FriendProfileWeeklyEntry[];
  routines: FriendProfileRoutine[];
  recent_workouts: FriendProfileWorkout[];
  exercise_names?: ExerciseOption[];
  active_workout?: ActiveWorkoutInfo | null;
  privacy?: {
    show_exercise_progression: boolean;
    show_weight_progression: boolean;
    show_completed_workouts: boolean;
  };
}

export interface RoutineComment {
  id: number;
  routine_id: number;
  user_id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; username: string; avatar_url: string | null };
}

export interface ExerciseComment {
  id: number;
  routine_exercise_id: number;
  user_id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; username: string; avatar_url: string | null };
}

export interface CommentCount {
  total: number;
  unread: number;
}

export interface RoutineCommentCounts {
  routine: CommentCount;
  exercises: Record<number, CommentCount>;
}

/** @deprecated use RoutineComment or ExerciseComment */
export interface SetComment {
  id: number;
  routine_exercise_id: number;
  set_index: number;
  user_id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
}

/** @deprecated use RoutineCommentCounts */
export type CommentCountsMap = Record<number, Record<number, CommentCount>>;

// ─── Templates ────────────────────────────────────────────────────────────────

export interface ProgramTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_days_per_week: number;
  program_data: {
    routines: Array<{
      title: string;
      day_of_week?: string[];
      exercises: Array<{
        name: string;
        series: number;
        repetitions: number;
        rir?: number;
        sets_data?: RoutineExerciseSet[];
      }>;
    }>;
  };
}

// ─── Coach Templates ─────────────────────────────────────────────────────────

export type TemplateType = 'system' | 'coach_routine' | 'coach_planning';
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CoachTemplate {
  id: number;
  created_by: number | null;
  name: string;
  description?: string | null;
  category?: string | null;
  difficulty_level?: TemplateDifficulty | null;
  type: TemplateType;
  is_active: boolean;
  estimated_days_per_week?: number | null;
  program_data?: {
    routines?: Array<{
      title: string;
      day_of_week?: string[];
      exercises: Array<{
        name: string;
        series: number;
        repetitions: number;
        rir?: number;
        sets_data?: RoutineExerciseSet[];
      }>;
    }>;
    weeks?: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export type TemplateSourceType = 'routine' | 'planning';

export interface CreateTemplateData {
  source_type: TemplateSourceType;
  source_id: number;
  name: string;
  description?: string;
  category?: string;
  difficulty_level?: TemplateDifficulty;
}

export interface ApplyTemplateResponse {
  message: string;
  applied_to: number[];
}

// ─── Bulk Assign ──────────────────────────────────────────────────────────────

export interface BulkAssignResult {
  student_id: number;
  success: boolean;
  planning_id?: number;
  error?: string;
}

export interface BulkAssignResponse {
  message: string;
  results: BulkAssignResult[];
}

// ─── Copy Week ────────────────────────────────────────────────────────────────

export interface CopyWeekResponse {
  message: string;
  exercises_copied: number;
  weight_adjustment_percent: number;
}

// ─── Progression Rules ────────────────────────────────────────────────────────

export type ProgressionConditionType =
  | 'rir_above'
  | 'completed_all_sets'
  | 'weight_threshold';

export type ProgressionActionType =
  | 'increase_weight_percent'
  | 'increase_weight_fixed'
  | 'increase_reps'
  | 'increase_sets';

export interface ProgressionRule {
  id: number;
  coach_id: number;
  student_id: number;
  planning_id?: number | null;
  exercise_name: string;
  condition_type: ProgressionConditionType;
  condition_value: Record<string, unknown>;
  action_type: ProgressionActionType;
  action_value: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProgressionRuleData {
  exercise_name: string;
  condition_type: ProgressionConditionType;
  condition_value: Record<string, unknown>;
  action_type: ProgressionActionType;
  action_value: number;
  planning_id?: number;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface AchievementWithStatus extends Achievement {
  earned: boolean;
  earned_at: string | null;
}

// ─── Body Measurements ────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: number;
  user_id: number;
  measurement_date: string;
  neck_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  left_arm_cm?: number | null;
  right_arm_cm?: number | null;
  left_thigh_cm?: number | null;
  right_thigh_cm?: number | null;
  left_calf_cm?: number | null;
  right_calf_cm?: number | null;
  shoulders_cm?: number | null;
  notes?: string | null;
  created_at: string;
}

// ─── Weekly Volume ─────────────────────────────────────────────────────────────

export interface WeeklyVolumeData {
  period: { start: string; end: string };
  total_sets?: number;
  total_reps?: number;
  total_volume_kg?: number;
  muscle_groups: Array<{
    name: string;
    total_sets: number;
    total_reps: number;
    workouts: number;
    exercises?: Array<{
      name: string;
      total_sets: number;
      total_reps: number;
      dates: string[];
    }>;
  }>;
}

// ─── Coach Dashboard ──────────────────────────────────────────────────────────

export interface CoachDashboardStudent {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  last_workout_at: string | null;
  current_streak: number;
  historical_weekly_average: number | null;
  workouts_this_week: number;
  workouts_this_month: number;
  active_routine_count: number;
  // v2 fields
  inactive_days: number | null;
  needs_attention: boolean;
  inactivity_threshold_days: number;
  weekly_adherence_percentage: number | null;
  monthly_adherence_percentage: number | null;
}

export interface CoachMetrics {
  avg_workouts_per_week: number;
  most_active_student: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    current_streak: number;
  } | null;
  least_active_student: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    current_streak: number;
  } | null;
  total_students: number;
  students_active_this_week: number;
  students_inactive_count: number;
}

export interface CoachCalendarWorkout {
  student_id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  routine_title: string;
  avatar_url: string | null;
}

export interface CoachCalendarResponse {
  days: Record<string, CoachCalendarWorkout[]>;
}

// ─── Training Groups ──────────────────────────────────────────────────────────

export interface TrainingGroup {
  id: number;
  name: string;
  description?: string | null;
  coach_id: number;
  member_count: number;
  created_at?: string;
  updated_at?: string;
  assigned_planning_id?: number | null;
  assigned_planning_title?: string | null;
  assigned_at?: string | null;
}

export interface TrainingGroupMember {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  joined_at: string;
}

export interface TrainingGroupDetail extends TrainingGroup {
  members: TrainingGroupMember[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  student_ids?: number[];
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
}

export interface AssignGroupPlanningPayload {
  planning_id?: number;
  template_id?: number;
}

export interface AssignGroupPlanningResult {
  student_id: number;
  success: boolean;
  error?: string;
}

export interface AssignGroupPlanningResponse {
  message: string;
  results: AssignGroupPlanningResult[];
}

// ─── Progress Charts ──────────────────────────────────────────────────────────

export type ProgressRange = "current_month" | "previous_month" | "3m" | "6m" | "12m";

export interface OneRMExerciseOption {
  exercise_id: number;
  name: string;
  log_count: number;
  last_logged_at: string;
}

export interface OneRMProgressionPoint {
  date: string;
  one_rm_kg: number;
  best_set: { weight_kg: number; reps: number; rir: number | null };
  routine_title: string | null;
  log_id: number;
}

export interface HeatmapWorkout {
  log_id: number;
  routine_title: string;
}

export interface ConsistencyHeatmapDay {
  date: string;
  trained: boolean;
  volume_kg: number;
  set_count: number;
  level: 0 | 1 | 2 | 3 | 4;
  workouts: HeatmapWorkout[];
}

export interface MuscleDistributionEntry {
  muscle_group: string;
  set_count: number;
  percentage: number;
}

export interface PlannedRoutineEntry {
  date: string;           // YYYY-MM-DD
  routine_id: number;
  routine_title: string;
  completed: boolean;
}

export interface PlanningAdherenceWeek {
  week_start: string;
  week_label: string;
  planning: { id: number; name: string } | null;
  planned_days: number;
  completed_days: number;
  adherence_percent: number | null;
  routines: PlannedRoutineEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  student: {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  workouts_count: number;
  current_streak: number;
  total_volume: number;
}

export interface GroupLeaderboardResponse {
  ranking: LeaderboardEntry[];
}

export interface PaginatedGroupsResponse {
  items: TrainingGroup[];
  pagination: PaginationMeta;
  totalMembers: number;
}

// ─── Notification Preferences ────────────────────────────────────────────────

export type NotificationType =
  | 'workout_started'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'coach_request_received'
  | 'coach_request_accepted'
  | 'routine_shared'
  | 'planning_shared'
  | 'routine_assigned'
  | 'planning_assigned'
  | 'training_reminder'
  | 'streak_milestone'
  | 'personal_record'
  | 'achievement_earned'
  | 'workout_auto_finish_warning'
  | 'workout_auto_finished';

export interface NotificationPreferences {
  id: number;
  user_id: number;
  workout_started: boolean;
  friend_request_received: boolean;
  friend_request_accepted: boolean;
  coach_request_received: boolean;
  coach_request_accepted: boolean;
  routine_shared: boolean;
  planning_shared: boolean;
  training_reminder: boolean;
  streak_milestone: boolean;
  personal_record: boolean;
  achievement_earned: boolean;
  workout_auto_finish: boolean;
}

export interface PrivacySettings {
  id: number;
  user_id: number;
  show_exercise_progression: boolean;
  show_weight_progression: boolean;
  show_achievements: boolean;
  show_completed_workouts: boolean;
  notify_friends_on_workout_start: boolean;
  show_active_workout_to_friends: boolean;
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

export interface DayDetailExerciseSet {
  reps: number | null;
  weight: number | null;
  rir: number | null;
  completed: boolean;
}

export interface DayDetailExercise {
  name: string;
  order_index: number;
  exercise_type: string;
  is_warmup?: boolean;
  sets: DayDetailExerciseSet[];
}

export interface DayDetailLog {
  id: number;
  routine_id: number | null;
  routine_title: string | null;
  performed_at: string;
  duration_minutes: number | null;
  mood: string | null;
  energy_level: string | null;
  notes: string | null;
  exercises: DayDetailExercise[];
}

export interface DayDetailResponse {
  date: string;
  day_of_week: string;
  logs: DayDetailLog[];
}

// ─── Payments / Subscriptions ─────────────────────────────────────────────────

export interface SubscriptionStatus {
  is_premium: boolean;
  plan_type: 'monthly' | 'annual' | null;
  status: 'active' | 'cancelled' | 'past_due' | 'pending' | null;
  current_period_end: string | null; // ISO date string
  cancelled_at: string | null;
}

export interface CreateSubscriptionResponse {
  init_point: string;
  mp_subscription_id?: string;
}

export interface CancelSubscriptionResponse {
  cancelled_at: string;
  current_period_end: string;
}

// ─── Exercise Media (reemplaza Exercise Videos) ───────────────────────────────

export interface ExerciseMedia {
  id: number;
  exerciseId: number;
  uploadedBy: number | null;
  mediaType: 'video' | 'image';
  isOfficial: boolean;
  title: string | null;
  isPrimary: boolean;
  status: 'pending' | 'ready' | 'failed';
  durationSeconds: number | null;  // null para imágenes
  sizeBytes: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  cdnUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  confirmedAt: string | null;
  // Campos para links externos
  sourceType: 'upload' | 'external_link';
  externalUrl: string | null;
  externalProvider: 'youtube' | 'tiktok' | 'drive' | 'other' | null;
  externalVideoId: string | null;
  processingError: string | null;
  updatedAt: string;
}

// Alias de compatibilidad para la migración — remover cuando todos los imports estén actualizados
export type ExerciseVideo = ExerciseMedia;

export interface ExerciseMediaInitPayload {
  mediaType: 'video' | 'image';
  mimeType: string;
  sizeBytes: number;
  title?: string;
  thumbnailMimeType?: string;  // solo para videos
  isPrimary?: boolean;
}

export interface ExerciseMediaInitResponse {
  mediaId: number;
  media: { uploadUrl: string; key: string };
  thumbnail?: { uploadUrl: string; key: string };  // solo para videos
  expiresIn: number;
}

export interface ExerciseMediaConfirmPayload {
  durationSeconds?: number;  // solo para videos
  width?: number;
  height?: number;
}

export interface ExerciseMediaUpdatePayload {
  title?: string;
  isPrimary?: boolean;
}

export interface ExerciseMediaListContext {
  routineId?: number;
  planningId?: number;
}

export interface ExerciseMediaMineResponse {
  media: ExerciseMedia[];
  remaining: number;
}

// Aliases legacy para no romper imports existentes durante la migración
export type ExerciseVideoInitPayload = ExerciseMediaInitPayload;
export type ExerciseVideoInitResponse = ExerciseMediaInitResponse;
export type ExerciseVideoConfirmPayload = ExerciseMediaConfirmPayload;
export type ExerciseVideoUpdatePayload = ExerciseMediaUpdatePayload;
export type ExerciseVideoListContext = ExerciseMediaListContext;

// ─── Coach Notes (Preguntas + Notas) ─────────────────────────────────────────

export interface CoachQuestion {
  id: number;
  text: string;
  is_default: boolean;
  answer: { id: number; text: string; updated_at: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CoachNote {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

// ─── Student Log List ─────────────────────────────────────────────────────────

export interface StudentLogListItem {
  id: number;
  performed_at: string;
  duration_minutes: number | null;
  routine_id: number | null;
  routine_title: string;
  planning_id: number | null;
  planning_title: string | null;
  week_number: number | null;
  mood: string | null;
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export interface MonthlyReport {
  month: string;
  summary: {
    total_workouts: number;
    total_duration_minutes: number;
    average_duration_minutes: number;
    workout_days: number;
    rest_days: number;
    unplanned_days: number | null;
  };
  volume: {
    total_sets: number;
    total_reps: number;
    total_volume_kg: number;
    top_muscle_group: { name: string; sets: number } | null;
    muscle_group_breakdown: Array<{
      name: string;
      sets: number;
      reps: number;
      exercises?: Array<{
        name: string;
        total_sets: number;
        total_reps: number;
        dates: string[];
      }>;
    }>;
  };
  personal_records: Array<{
    exercise_id: number;
    exercise_name: string;
    weight_kg: number;
    reps: number;
    date: string;
    day_of_week?: string;
    routine_name?: string | null;
    muscle_groups?: string[];
  }>;
  streak: {
    max_streak_this_month: number;
    current_streak: number;
  };
  comparison_with_previous: {
    workouts_delta: number;
    volume_sets_delta: number;
    duration_delta: number;
  } | null;
}

// ─── App Version Gate ─────────────────────────────────────────────────────────

export interface PlatformVersionInfo {
  min_version: string;
}

export interface AppVersionConfig {
  ios: PlatformVersionInfo;
  android: PlatformVersionInfo;
}
