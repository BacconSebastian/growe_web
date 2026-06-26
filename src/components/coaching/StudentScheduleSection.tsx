"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CalendarOff, Clock, Pencil } from "lucide-react";
import { getCoachSchedule } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Button } from "@/components/ui/Button";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import { EditScheduleSlotModal } from "@/components/coaching/EditScheduleSlotModal";
import type { CoachScheduleSlot } from "@/lib/api/types";

// ─── Días de la semana ────────────────────────────────────────────────────────

const DAYS: Array<{ key: string; short: string }> = [
  { key: "monday",    short: "L" },
  { key: "tuesday",   short: "M" },
  { key: "wednesday", short: "X" },
  { key: "thursday",  short: "J" },
  { key: "friday",    short: "V" },
  { key: "saturday",  short: "S" },
  { key: "sunday",    short: "D" },
];

const JS_DAY_TO_KEY: Record<number, string> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

function todayDayKey(): string {
  return JS_DAY_TO_KEY[new Date().getDay()] ?? "monday";
}

function slotLabel(slot: CoachScheduleSlot): string {
  const start = slot.start_time.slice(0, 5);
  return slot.end_time ? `${start} – ${slot.end_time.slice(0, 5)}` : start;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentScheduleSectionProps {
  studentId: number;
  studentName?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <GradientSurface>
      <div className="flex flex-col gap-md p-xl">
        <SkeletonLine width={120} height={18} />
        <div className="flex gap-xs">
          {DAYS.map((d) => (
            <SkeletonBox key={d.key} height={44} className="flex-1" />
          ))}
        </div>
        <div className="flex flex-col gap-sm">
          <SkeletonBox height={40} />
          <SkeletonBox height={40} />
        </div>
      </div>
    </GradientSurface>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const StudentScheduleSection: React.FC<StudentScheduleSectionProps> = ({
  studentId,
  studentName,
}) => {
  const [slots, setSlots] = useState<CoachScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(todayDayKey);
  const [editing, setEditing] = useState(false);
  // Marca que la auto-selección inicial ya ocurrió; nunca se resetea.
  const didInitDayRef = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCoachSchedule();
      setSlots((data.slots ?? []).filter((s) => s.student_id === studentId));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la agenda"));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCoachSchedule();
        if (!cancelled) {
          setSlots((data.slots ?? []).filter((s) => s.student_id === studentId));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudo cargar la agenda"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  // Auto-selección inicial: si hoy no tiene turnos, ir al primer día L→D que tenga.
  // Solo ocurre una vez (didInitDayRef evita pisar selecciones manuales posteriores).
  useEffect(() => {
    if (loading) return;
    if (didInitDayRef.current) return;
    didInitDayRef.current = true;

    const today = todayDayKey();
    const hasToday = slots.some((s) => s.day_of_week === today);
    if (!hasToday) {
      const firstWithSlot = DAYS.find((d) => slots.some((s) => s.day_of_week === d.key));
      if (firstWithSlot) setSelectedDay(firstWithSlot.key);
    }
  }, [loading, slots]);

  // Mapa día → slots
  const slotsByDay = useMemo(() => {
    const map = new Map<string, CoachScheduleSlot[]>();
    for (const s of slots) {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, []);
      map.get(s.day_of_week)!.push(s);
    }
    return map;
  }, [slots]);

  // Slots del día seleccionado, ordenados por start_time
  const daySlots = useMemo(
    () =>
      (slotsByDay.get(selectedDay) ?? [])
        .slice()
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slotsByDay, selectedDay]
  );

  if (loading) return <ScheduleSkeleton />;
  if (error) return null; // Error silencioso en sección secundaria

  return (
    <>
      <GradientSurface>
        <div className="flex flex-col gap-md p-xl">
          {/* Header de sección */}
          <div className="flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <Calendar size={16} style={{ color: "var(--primary)" }} />
              <div>
                <p className="text-sm font-semibold m-0" style={{ color: "var(--fg)" }}>
                  Turnos
                </p>
                <p className="text-xs m-0" style={{ color: "var(--fg-secondary)" }}>
                  Horarios de entrenamiento del alumno
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Pencil size={14} />}
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          </div>

          {/* Picker de día — single-select */}
          <div className="flex gap-xs">
            {DAYS.map((d) => {
              const hasTurno = (slotsByDay.get(d.key)?.length ?? 0) > 0;
              const isSelected = selectedDay === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(d.key)}
                  className="flex-1 flex items-center justify-center rounded-md transition-colors"
                  style={{
                    height: 44,
                    background: hasTurno
                      ? "var(--primary-alpha-12)"
                      : "var(--bg-secondary)",
                    border: isSelected
                      ? "1.5px solid var(--primary)"
                      : "1.5px solid transparent",
                    cursor: "pointer",
                    color:
                      hasTurno || isSelected ? "var(--primary)" : "var(--fg-tertiary)",
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: "0.875rem",
                  }}
                >
                  {d.short}
                </button>
              );
            })}
          </div>

          {/* Horarios del día seleccionado */}
          {daySlots.length === 0 ? (
            <div
              className="flex items-center gap-sm px-md py-sm rounded-md"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--separator-subtle)",
                color: "var(--fg-tertiary)",
              }}
            >
              <CalendarOff size={16} style={{ flexShrink: 0 }} />
              <p className="text-sm m-0">No hay turnos configurados para este día.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-xs">
              {daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-sm px-md py-sm rounded-md"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--separator-subtle)",
                  }}
                >
                  <Clock size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: "var(--fg)" }}>
                    {slotLabel(slot)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </GradientSurface>

      {/* Modal editor */}
      <EditScheduleSlotModal
        open={editing}
        studentId={studentId}
        studentName={studentName}
        onClose={() => setEditing(false)}
        onSaved={reload}
      />
    </>
  );
};
