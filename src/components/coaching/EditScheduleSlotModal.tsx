"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  getCoachSchedule,
  createScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
} from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { CoachScheduleSlot } from "@/lib/api/types";

// ─── Días ─────────────────────────────────────────────────────────────────────

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

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface TimeRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

function defaultRange(afterRange?: TimeRange): TimeRange {
  if (afterRange) {
    const [h, m] = afterRange.end.split(":").map(Number);
    const newStart = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const endH = Math.min(23, h + 1);
    const newEnd = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { start: newStart, end: newEnd };
  }
  return { start: "08:00", end: "09:00" };
}

function isRangeValid(r: TimeRange): boolean {
  if (!r.start || !r.end) return false;
  return r.start < r.end;
}

function slotToRange(s: CoachScheduleSlot): TimeRange {
  const start = s.start_time.slice(0, 5);
  const end = s.end_time
    ? s.end_time.slice(0, 5)
    : (() => {
        const h = parseInt(start.slice(0, 2), 10);
        return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${start.slice(3, 5)}`;
      })();
  return { start, end };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditScheduleSlotModalProps {
  open: boolean;
  studentId: number;
  studentName?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export const EditScheduleSlotModal: React.FC<EditScheduleSlotModalProps> = ({
  open,
  studentId,
  onClose,
  onSaved,
}) => {
  const [slots, setSlots] = useState<CoachScheduleSlot[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([todayDayKey()]);
  const [ranges, setRanges] = useState<TimeRange[]>([defaultRange()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapa día → slots del día
  const slotsByDay = useMemo(() => {
    const map = new Map<string, CoachScheduleSlot[]>();
    for (const s of slots) {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, []);
      map.get(s.day_of_week)!.push(s);
    }
    return map;
  }, [slots]);

  // Cargar slots al abrir
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getCoachSchedule();
        if (!cancelled) {
          const filtered = (res.slots ?? []).filter((s) => s.student_id === studentId);
          setSlots(filtered);
          // Preseleccionar hoy
          const day = todayDayKey();
          setSelectedDays([day]);
          const daySlots = filtered
            .filter((s) => s.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          setRanges(daySlots.length ? daySlots.map(slotToRange) : [defaultRange()]);
        }
      } catch {
        // silencioso — si falla la carga, el usuario puede seguir trabajando con estado vacío
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, studentId]);

  const toggleDay = useCallback(
    (day: string) => {
      const isSelected = selectedDays.includes(day);
      if (isSelected) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
        return;
      }
      const next = [...selectedDays, day];
      setSelectedDays(next);
      // Si queda un único día seleccionado y tiene turnos, precargar sus rangos
      if (next.length === 1) {
        const daySlots = (slotsByDay.get(day) ?? [])
          .slice()
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        if (daySlots.length) setRanges(daySlots.map(slotToRange));
      }
    },
    [selectedDays, slotsByDay]
  );

  const updateRange = (idx: number, field: "start" | "end", value: string) => {
    setRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const removeRange = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRange = () => {
    setRanges((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, defaultRange(last)];
    });
  };

  const allValid = ranges.length > 0 && ranges.every(isRangeValid);
  const canSave = selectedDays.length > 0 && allValid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      // Para cada día seleccionado, calcular diff contra slots existentes
      const desired = ranges.map((r) => ({ start: r.start, end: r.end }));
      const desiredStarts = new Set(desired.map((r) => r.start));

      const ops: Promise<unknown>[] = [];
      for (const day of selectedDays) {
        const existing = slotsByDay.get(day) ?? [];
        const existingByStart = new Map(
          existing.map((s) => [s.start_time.slice(0, 5), s])
        );
        // Borrar los que ya no están
        for (const s of existing) {
          if (!desiredStarts.has(s.start_time.slice(0, 5))) {
            ops.push(deleteScheduleSlot(s.id));
          }
        }
        // Crear o actualizar
        for (const { start, end } of desired) {
          const ex = existingByStart.get(start);
          if (ex) {
            ops.push(
              updateScheduleSlot(ex.id, {
                day_of_week: day,
                start_time: start,
                end_time: end,
              })
            );
          } else {
            ops.push(
              createScheduleSlot({
                student_id: studentId,
                day_of_week: day,
                start_time: start,
                end_time: end,
              })
            );
          }
        }
      }

      const results = await Promise.allSettled(ops);
      const firstError = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );

      onSaved(); // siempre refrescar

      if (firstError) {
        setError(
          getErrorMessage(
            firstError.reason,
            "Algunos turnos no se guardaron. Revisá que no se superpongan horarios."
          )
        );
        // No cerramos el modal para que el usuario vea el error
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const count = selectedDays.length;
  const saveLabel = count > 1 ? `Guardar ${count} días` : "Guardar";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar turnos"
      size="md"
      dismissable={!saving}
    >
      <div className="flex flex-col gap-xl">
        {error && <ErrorBanner message={error} dismissible />}

        {/* Tira de días — multi-select */}
        <div className="flex flex-col gap-sm">
          <p className="text-sm font-semibold m-0" style={{ color: "var(--fg)" }}>
            Días
          </p>
          <div className="flex gap-xs">
            {DAYS.map((d) => {
              const hasTurno = (slotsByDay.get(d.key)?.length ?? 0) > 0;
              const isSelected = selectedDays.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
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
                      hasTurno || isSelected
                        ? "var(--primary)"
                        : "var(--fg-tertiary)",
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: "0.875rem",
                  }}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
          {/* Leyenda */}
          <div className="flex gap-md flex-wrap">
            <div className="flex items-center gap-xs">
              <div
                className="rounded-sm"
                style={{
                  width: 12,
                  height: 12,
                  background: "var(--primary-alpha-12)",
                }}
              />
              <span className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                Con turno
              </span>
            </div>
            <div className="flex items-center gap-xs">
              <div
                className="rounded-sm"
                style={{
                  width: 12,
                  height: 12,
                  border: "1.5px solid var(--primary)",
                  background: "transparent",
                }}
              />
              <span className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                Seleccionado
              </span>
            </div>
            <div className="flex items-center gap-xs">
              <div
                className="rounded-sm"
                style={{
                  width: 12,
                  height: 12,
                  background: "var(--bg-secondary)",
                }}
              />
              <span className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                Sin turno
              </span>
            </div>
          </div>
        </div>

        {/* Filas de horario */}
        <div className="flex flex-col gap-sm">
          <p className="text-sm font-semibold m-0" style={{ color: "var(--fg)" }}>
            Horarios
          </p>

          {ranges.map((r, i) => {
            const valid = isRangeValid(r);
            return (
              <div key={i} className="flex items-center gap-sm">
                <div className="flex items-center gap-xs flex-1">
                  <input
                    type="time"
                    value={r.start}
                    onChange={(e) => updateRange(i, "start", e.target.value)}
                    className="flex-1 rounded-md px-md py-sm text-sm"
                    style={{
                      background: "var(--bg-secondary)",
                      border: `1px solid ${valid ? "var(--separator-subtle)" : "var(--destructive)"}`,
                      color: "var(--fg)",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                  <span
                    className="text-sm flex-shrink-0"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    –
                  </span>
                  <input
                    type="time"
                    value={r.end}
                    onChange={(e) => updateRange(i, "end", e.target.value)}
                    className="flex-1 rounded-md px-md py-sm text-sm"
                    style={{
                      background: "var(--bg-secondary)",
                      border: `1px solid ${valid ? "var(--separator-subtle)" : "var(--destructive)"}`,
                      color: "var(--fg)",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRange(i)}
                  disabled={ranges.length <= 1}
                  className="flex-shrink-0 rounded-md flex items-center justify-center transition-colors"
                  style={{
                    width: 36,
                    height: 36,
                    background: "transparent",
                    color:
                      ranges.length <= 1
                        ? "var(--fg-quaternary, var(--fg-tertiary))"
                        : "var(--destructive)",
                    cursor: ranges.length <= 1 ? "not-allowed" : "pointer",
                    opacity: ranges.length <= 1 ? 0.4 : 1,
                    border: "none",
                  }}
                  aria-label="Quitar horario"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          {!allValid && ranges.some((r) => !isRangeValid(r)) && (
            <p className="text-xs m-0" style={{ color: "var(--destructive)" }}>
              El horario de fin debe ser posterior al de inicio.
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            iconLeft={<Plus size={16} />}
            onClick={addRange}
          >
            Agregar entrenamiento
          </Button>
        </div>

        {/* Footer */}
        <div className="flex gap-sm pt-sm">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
            className="flex-1"
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
