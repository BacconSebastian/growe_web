"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PlanningEditor } from "@/components/plannings/PlanningEditor";

/**
 * /plannings/[id] — Editar planificación propia del coach.
 */
export default function PlanningDetailPage() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : undefined;

  return (
    <div className="flex flex-col gap-xxl">
      <PlanningEditor mode="edit-own" planningId={id} />
    </div>
  );
}
