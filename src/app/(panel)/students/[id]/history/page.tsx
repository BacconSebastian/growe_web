"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StudentHistoryTab } from "@/components/students/StudentHistoryTab";

export default function StudentHistoryPage() {
  const params = useParams();
  const studentId = Number(params.id);

  return (
    <div className="flex flex-col gap-xl">
      <Link
        href={`/students/${studentId}`}
        className="flex items-center gap-sm text-sm"
        style={{ color: "var(--fg-secondary)", textDecoration: "none" }}
      >
        <ChevronLeft size={16} /> Volver al perfil
      </Link>
      <StudentHistoryTab studentId={studentId} />
    </div>
  );
}
