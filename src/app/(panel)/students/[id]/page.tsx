"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStudent } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox, SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { StudentHeader } from "@/components/students/StudentHeader";
import { StudentSummaryTab } from "@/components/students/StudentSummaryTab";
import { StudentRoutinesTab } from "@/components/students/StudentRoutinesTab";
import { StudentPlanningsTab } from "@/components/students/StudentPlanningsTab";
import { StudentMonthlyReportTab } from "@/components/students/StudentMonthlyReportTab";
import { StudentHistoryTab } from "@/components/students/StudentHistoryTab";
import type { User } from "@/lib/api/types";

// ─── Tipos de tabs ─────────────────────────────────────────────────────────

type TabId = "resumen" | "rutinas" | "planificaciones" | "reporte" | "historial";

const TABS = [
  { id: "resumen" as TabId,           label: "Resumen" },
  { id: "rutinas" as TabId,           label: "Rutinas" },
  { id: "planificaciones" as TabId,   label: "Planificaciones" },
  { id: "reporte" as TabId,           label: "Reporte mensual" },
  { id: "historial" as TabId,         label: "Historial" },
];

// ─── Skeleton del header ──────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div
      className="flex flex-col gap-xl p-xxl rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div className="flex items-center gap-xl">
          <SkeletonCircle size={96} />
          <div className="flex flex-col gap-sm">
            <SkeletonLine width={200} height={24} />
            <SkeletonLine width={120} height={14} />
            <SkeletonLine width={160} height={14} />
          </div>
        </div>
        <div className="flex gap-sm">
          <SkeletonBox width={160} height={40} />
          <SkeletonBox width={150} height={40} />
        </div>
      </div>
    </div>
  );
}

// ─── Página del perfil del alumno ─────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = Number(params.id);
  const { user: coachUser } = useAuth();
  const coachId = coachUser?.id ?? 0;

  const [student, setStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("resumen");

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudent(studentId);
        if (!cancelled) setStudent(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudo cargar el perfil del alumno"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [studentId]);

  const handleShowReport = () => setActiveTab("reporte");

  return (
    <div className="flex flex-col gap-xl">
      {/* Header */}
      {loading ? (
        <HeaderSkeleton />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : student ? (
        <StudentHeader student={student} onShowReport={handleShowReport} />
      ) : null}

      {/* Tabs */}
      {!loading && !error && student && (
        <>
          <Tabs
            tabs={TABS}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />

          <div className="mt-sm">
            {activeTab === "resumen" && (
              <StudentSummaryTab studentId={studentId} coachId={coachId} />
            )}
            {activeTab === "rutinas" && (
              <StudentRoutinesTab studentId={studentId} coachId={coachId} />
            )}
            {activeTab === "planificaciones" && (
              <StudentPlanningsTab studentId={studentId} />
            )}
            {activeTab === "reporte" && (
              <StudentMonthlyReportTab studentId={studentId} />
            )}
            {activeTab === "historial" && (
              <StudentHistoryTab studentId={studentId} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
