"use client";

import React from "react";
import { PlanningEditor } from "@/components/plannings/PlanningEditor";

/**
 * /plannings/new — Crear nueva planificación del coach.
 */
export default function NewPlanningPage() {
  return (
    <div className="flex flex-col gap-xxl">
      <PlanningEditor mode="create-own" />
    </div>
  );
}
