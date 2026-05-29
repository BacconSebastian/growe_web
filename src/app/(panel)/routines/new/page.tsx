"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RoutineEditor } from "@/components/routines/RoutineEditor";

/**
 * /routines/new — crear una nueva rutina del coach.
 */
export default function NewRoutinePage() {
  return (
    <div className="flex flex-col gap-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs">
        <Link
          href="/routines"
          className="flex items-center gap-xxs text-sm text-fg-secondary hover:text-fg transition-colors"
          style={{ textDecoration: "none" }}
        >
          <ChevronLeft size={14} />
          Rutinas
        </Link>
        <span className="text-sm text-fg-tertiary">/</span>
        <span className="text-sm text-fg">Nueva rutina</span>
      </div>

      <RoutineEditor mode="create-own" />
    </div>
  );
}
