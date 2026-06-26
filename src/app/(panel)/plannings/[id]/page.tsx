"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PlanningOverview } from "@/components/plannings/PlanningOverview";

/**
 * /plannings/[id] — Editar planificación propia del coach (modelo nuevo de semanas).
 */
export default function PlanningDetailPage() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : undefined;

  if (!id || isNaN(id)) {
    return (
      <div className="flex flex-col gap-xxl">
        <p className="text-sm text-fg-tertiary">ID de planificación inválido.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xxl">
      <PlanningOverview
        mode="own"
        planningId={id}
        trail={[{ label: "Planificaciones", href: "/plannings" }]}
      />
    </div>
  );
}
