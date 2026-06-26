"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  BarChart2,
  CalendarDays,
  FileText,
  History,
  StickyNote,
  TrendingUp,
} from "lucide-react";
import { getFriendProfile } from "@/lib/api/community";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { SkeletonBox, SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { StudentHeader } from "@/components/students/StudentHeader";
import { StudentRoutinesTab } from "@/components/students/StudentRoutinesTab";
import { StudentPlanningsTab } from "@/components/students/StudentPlanningsTab";
import { CoachNotesModal } from "@/components/coaching/CoachNotesModal";
import { StudentScheduleSection } from "@/components/coaching/StudentScheduleSection";
import { QuickAccessBanner } from "@/components/students/QuickAccessBanner";
import type { FriendProfileData } from "@/lib/api/types";
import type { StudentInfo } from "@/components/students/StudentHeader";

// ─── Skeleton del header ──────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <GradientSurface>
      <div className="flex items-center gap-xl p-xxl">
        <SkeletonCircle size={96} />
        <div className="flex flex-col gap-sm">
          <SkeletonLine width={200} height={24} />
          <SkeletonLine width={120} height={14} />
          <SkeletonLine width={160} height={14} />
          <SkeletonLine width={80} height={20} />
        </div>
      </div>
    </GradientSurface>
  );
}

// ─── Skeleton de un banner de acceso rápido ───────────────────────────────────

function QuickAccessBannerSkeleton() {
  return (
    <GradientSurface>
      <div className="flex items-center justify-between w-full p-lg">
        <div className="flex items-center gap-md">
          <SkeletonBox width={40} height={40} />
          <div className="flex flex-col gap-xs">
            <SkeletonLine width={140} height={14} />
            <SkeletonLine width={180} height={12} />
          </div>
        </div>
        <SkeletonBox width={16} height={16} />
      </div>
    </GradientSurface>
  );
}

// ─── Skeleton del cuerpo del perfil ───────────────────────────────────────────

function BodySkeleton() {
  return (
    <>
      {/* Banners de acceso rápido (6 en grid de 2 columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {Array.from({ length: 6 }).map((_, i) => (
          <QuickAccessBannerSkeleton key={i} />
        ))}
      </div>

      {/* Agenda / rutinas / planificaciones */}
      {Array.from({ length: 3 }).map((_, i) => (
        <GradientSurface key={i}>
          <div className="flex flex-col gap-md p-xxl">
            <SkeletonLine width={180} height={18} />
            <SkeletonBox height={64} />
            <SkeletonBox height={64} />
          </div>
        </GradientSurface>
      ))}
    </>
  );
}

// ─── Página del perfil del alumno ─────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = Number(params.id);
  const { user: coachUser } = useAuth();
  const coachId = coachUser?.id ?? 0;

  const [profile, setProfile] = useState<FriendProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFriendProfile(studentId);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled)
          setError(getErrorMessage(err, "No se pudo cargar el perfil del alumno"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [studentId]);

  // Mapear friend → StudentInfo (sin as any)
  const studentInfo: StudentInfo | null = profile
    ? {
        id: profile.friend.id,
        username: profile.friend.username,
        email: profile.friend.email ?? null,
        avatar_url: profile.friend.avatar_url ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-xl">
      {/* Header */}
      {loading ? (
        <HeaderSkeleton />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : studentInfo ? (
        <StudentHeader student={studentInfo} />
      ) : null}

      {/* Skeleton del cuerpo mientras carga el perfil */}
      {loading && <BodySkeleton />}

      {!loading && !error && profile && (
        <>
          {/* Banners de acceso rápido (6 en grid de 2 columnas = 3 filas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <QuickAccessBanner
              icon={<StickyNote size={20} />}
              title="Notas del alumno"
              subtitle="Preguntas y notas privadas del coach"
              onClick={() => setNotesOpen(true)}
            />
            <QuickAccessBanner
              icon={<CalendarDays size={20} />}
              title="Progreso por semanas"
              subtitle="Adherencia semana a semana"
              href={`/students/${studentId}/weekly`}
            />
            <QuickAccessBanner
              icon={<BarChart2 size={20} />}
              title="Progreso general"
              subtitle="Métricas y adherencia"
              href={`/students/${studentId}/progress`}
            />
            <QuickAccessBanner
              icon={<History size={20} />}
              title="Entrenamientos finalizados"
              subtitle="Historial de sesiones"
              href={`/students/${studentId}/history`}
            />
            <QuickAccessBanner
              icon={<FileText size={20} />}
              title="Reporte mensual"
              subtitle="Resumen detallado del mes"
              href={`/students/${studentId}/report`}
            />
            <QuickAccessBanner
              icon={<TrendingUp size={20} />}
              title="Progresión"
              subtitle="Reglas de progreso"
              href={`/students/${studentId}/progression`}
            />
          </div>

          {/* Agenda semanal del alumno */}
          <StudentScheduleSection
            studentId={studentId}
            studentName={profile.friend.username}
          />

          {/* Rutinas del alumno */}
          <StudentRoutinesTab studentId={studentId} coachId={coachId} />

          {/* Planificaciones del alumno */}
          <StudentPlanningsTab studentId={studentId} />
        </>
      )}

      {/* Modal de notas y preguntas del coach */}
      {profile && (
        <CoachNotesModal
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          studentId={studentId}
          studentName={profile.friend.username}
        />
      )}

    </div>
  );
}
