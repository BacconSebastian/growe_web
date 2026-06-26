"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { UserPlus, Users, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listStudents, type StudentListItem } from "@/lib/api/coaching";
import { getErrorMessage, getUserInitials, getDisplayName } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StudentBadges } from "@/components/coaching/StudentBadges";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { InviteStudentModal } from "@/components/students/InviteStudentModal";
import type { PaginationMeta } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Alto fijo de fila para filas uniformes. */
const ROW_HEIGHT = 68;
/** Alumnos por página. */
const STUDENTS_PER_PAGE = 7;

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ListSkeleton() {
  const rows = Array.from({ length: STUDENTS_PER_PAGE }, (_, i) => i);
  return (
    <GradientSurface>
      {/* Filas — misma minHeight total que el contenedor de filas real */}
      <div
        className="flex flex-col"
        style={{ minHeight: ROW_HEIGHT * STUDENTS_PER_PAGE }}
      >
        {rows.map((i) => (
          <div
            key={i}
            className="flex items-center gap-md px-xl"
            style={{
              height: ROW_HEIGHT,
              ...(i < STUDENTS_PER_PAGE - 1
                ? { borderBottom: "1px solid var(--separator-subtle)" }
                : {}),
            }}
          >
            <SkeletonCircle size={40} />
            <div className="flex flex-col gap-xs flex-1">
              <SkeletonLine width={140} height={14} />
              <div className="flex gap-xs">
                <SkeletonLine width={120} height={18} className="rounded-pill" />
                <SkeletonLine width={100} height={18} className="rounded-pill" />
              </div>
            </div>
            <SkeletonLine width={72} height={30} />
          </div>
        ))}
      </div>

      {/* Shell de paginación — espeja el padding/altura real de <Pagination> */}
      <div
        className="flex items-center justify-between gap-lg py-md px-lg"
        style={{ borderTop: "1px solid var(--separator-subtle)" }}
      >
        <SkeletonLine width={80} height={14} />
        <div className="flex items-center gap-sm">
          <SkeletonLine width={84} height={30} className="rounded-pill" />
          <SkeletonLine width={90} height={30} className="rounded-pill" />
        </div>
      </div>
    </GradientSurface>
  );
}

// ─── Fila de alumno ───────────────────────────────────────────────────────────

interface StudentRowProps {
  student: StudentListItem;
  isLast: boolean;
}

function StudentRow({ student, isLast }: StudentRowProps) {
  const displayName = getDisplayName({
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  });
  const initials = getUserInitials({
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  });

  return (
    <div
      className="flex items-center gap-md px-xl transition-colors duration-100 hover:bg-fill-tertiary"
      style={{
        minHeight: ROW_HEIGHT,
        ...(isLast
          ? {}
          : { borderBottom: "1px solid var(--separator-subtle)" }),
      }}
    >
      <Avatar src={student.avatar_url} initials={initials} size="md" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg m-0 truncate">{displayName}</p>
        <div className="mt-xxs">
          <StudentBadges
            lastWorkoutAt={student.last_workout_at}
            activePlanningTitle={student.active_planning_title ?? null}
          />
        </div>
      </div>

      {/* Stats — se ocultan en pantallas chicas */}
      <div className="hidden md:flex items-center gap-lg flex-shrink-0">
        {student.needs_attention && (
          <Badge variant="danger" size="sm">
            Atención
          </Badge>
        )}

        {student.current_streak > 0 && (
          <span
            className="text-sm font-medium text-fg-secondary tabular-nums"
            title="Racha actual"
          >
            🔥 {student.current_streak}
          </span>
        )}
      </div>

      <Link
        href={`/students/${student.id}`}
        className="no-underline flex-shrink-0"
      >
        <Button variant="secondary" size="sm" iconRight={<ChevronRight size={14} />}>
          Ver perfil
        </Button>
      </Link>
    </div>
  );
}

// ─── Página de alumnos ────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStudents = useCallback(async (searchQuery: string, currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({
        page: currentPage,
        search: searchQuery || undefined,
        limit: STUDENTS_PER_PAGE,
      });
      setStudents(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los alumnos"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce del buscador
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadStudents(search, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, loadStudents]);

  // Cambio de página
  useEffect(() => {
    loadStudents(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = !loading && students.length === 0;

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles: buscador + invitar, en una sola línea */}
      <div className="flex items-center gap-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o email..."
          className="w-72 flex-shrink-0"
        />

        <Button
          variant="primary"
          size="md"
          iconLeft={<UserPlus size={16} />}
          onClick={() => setInviteOpen(true)}
          className="ml-auto flex-shrink-0"
        >
          Invitar alumno
        </Button>
      </div>

      {/* Lista de alumnos */}
      {loading ? (
        <ListSkeleton />
      ) : (
        <GradientSurface>
          <div
            className="flex flex-col"
            style={{ minHeight: ROW_HEIGHT * STUDENTS_PER_PAGE }}
          >
            {isEmpty ? (
              <div
                className="flex flex-col items-center justify-center gap-sm px-xl text-center"
                style={{ minHeight: ROW_HEIGHT * STUDENTS_PER_PAGE }}
              >
                <Users size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-base font-medium text-fg m-0">
                  {search ? "Sin resultados" : "No tenés alumnos aún"}
                </p>
                <p className="text-sm text-fg-secondary m-0">
                  {search
                    ? "Probá con otro nombre o email."
                    : "Invitá a tus primeros alumnos para gestionarlos desde acá."}
                </p>
                {!search && (
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={<UserPlus size={16} />}
                    onClick={() => setInviteOpen(true)}
                    className="mt-sm"
                  >
                    Invitar alumno
                  </Button>
                )}
              </div>
            ) : (
              students.map((student, idx) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  isLast={idx === students.length - 1}
                />
              ))
            )}
          </div>

          {/* Paginación — mismo componente que el dashboard, siempre visible */}
          <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Pagination
              page={pagination.page}
              perPage={pagination.per_page}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        </GradientSurface>
      )}

      <InviteStudentModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          loadStudents(search, page);
        }}
      />
    </div>
  );
}
