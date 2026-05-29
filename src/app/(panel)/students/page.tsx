"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { listStudents, type StudentListItem } from "@/lib/api/coaching";
import { getErrorMessage, getUserInitials, getDisplayName } from "@/lib/utils";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Chip } from "@/components/ui/Chip";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { InviteStudentModal } from "@/components/students/InviteStudentModal";
import type { PaginationMeta } from "@/lib/api/types";

// ─── Skeleton de tabla ────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <tr>
          <TableCell as="th">Alumno</TableCell>
          <TableCell as="th">Última actividad</TableCell>
          <TableCell as="th">Planning activo</TableCell>
          <TableCell as="th">Adherencia</TableCell>
          <TableCell as="th">Racha</TableCell>
          <TableCell as="th" />
        </tr>
      </TableHeader>
      <tbody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-md">
                <SkeletonCircle size={36} />
                <div className="flex flex-col gap-xs">
                  <SkeletonLine width={120} height={14} />
                  <SkeletonLine width={80} height={11} />
                </div>
              </div>
            </TableCell>
            <TableCell><SkeletonLine width={90} height={14} /></TableCell>
            <TableCell><SkeletonLine width={110} height={14} /></TableCell>
            <TableCell><SkeletonLine width={50} height={14} /></TableCell>
            <TableCell><SkeletonLine width={40} height={14} /></TableCell>
            <TableCell><SkeletonLine width={60} height={30} /></TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}

// ─── Fila de alumno ───────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Sin entrenos";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
  return `Hace ${Math.floor(days / 30)} mes(es)`;
}

interface StudentRowProps {
  student: StudentListItem;
}

function StudentRow({ student }: StudentRowProps) {
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
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-md">
          <Avatar src={student.avatar_url} initials={initials} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-fg">{displayName}</span>
            {student.email && (
              <span className="text-xs text-fg-tertiary">{student.email}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-xs">
          <span className="text-sm text-fg">
            {formatTimeAgo(student.last_workout_at)}
          </span>
          {student.needs_attention && (
            <Badge variant="warning" size="sm">Necesita atención</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-fg">
          {student.active_planning_title ?? (
            <span className="text-fg-tertiary">Sin planning</span>
          )}
        </span>
      </TableCell>
      <TableCell>
        {student.weekly_adherence_percentage !== null ? (
          <span
            className="text-sm font-semibold"
            style={{
              color:
                student.weekly_adherence_percentage >= 70
                  ? "var(--success)"
                  : student.weekly_adherence_percentage >= 40
                  ? "var(--warning)"
                  : "var(--destructive)",
            }}
          >
            {Math.round(student.weekly_adherence_percentage)}%
          </span>
        ) : (
          <span className="text-sm text-fg-tertiary">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-fg">
          {student.current_streak > 0 ? `${student.current_streak}🔥` : "0"}
        </span>
      </TableCell>
      <TableCell align="right">
        <Link href={`/students/${student.id}`}>
          <Button variant="outline" size="sm">
            Ver
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

// ─── Filtros chip ─────────────────────────────────────────────────────────────

type FilterChip = "todos" | "activos" | "atencion";

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
  const [filter, setFilter] = useState<FilterChip>("todos");
  const [inviteOpen, setInviteOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStudents = useCallback(async (searchQuery: string, currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({ page: currentPage, search: searchQuery || undefined });
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

  // Filtrado client-side según chip
  const filteredStudents = students.filter((s) => {
    if (filter === "activos") return s.workouts_this_week > 0;
    if (filter === "atencion") return s.needs_attention;
    return true;
  });

  const isEmpty = !loading && filteredStudents.length === 0;

  return (
    <div className="flex flex-col gap-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Alumnos
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Gestioná tu plantel de alumnos
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<UserPlus size={16} />}
          onClick={() => setInviteOpen(true)}
        >
          Invitar alumno
        </Button>
      </div>

      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles */}
      <div className="flex items-center gap-md flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o email..."
          className="w-full max-w-xs"
        />
        <div className="flex items-center gap-sm">
          <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>
            Todos
          </Chip>
          <Chip active={filter === "activos"} onClick={() => setFilter("activos")}>
            Activos esta semana
          </Chip>
          <Chip active={filter === "atencion"} onClick={() => setFilter("atencion")}>
            Necesitan atención
          </Chip>
        </div>
      </div>

      {/* Tabla / estados */}
      {loading ? (
        <TableSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={<Users size={24} />}
          title={search ? "Sin resultados" : "No tenés alumnos aún"}
          description={
            search
              ? "Probá con otro nombre o email."
              : "Invitá a tus primeros alumnos para empezar a gestionarlos desde acá."
          }
          action={
            !search ? (
              <Button
                variant="primary"
                iconLeft={<UserPlus size={16} />}
                onClick={() => setInviteOpen(true)}
              >
                Invitar alumno
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableCell as="th">Alumno</TableCell>
                <TableCell as="th">Última actividad</TableCell>
                <TableCell as="th">Planning activo</TableCell>
                <TableCell as="th">Adherencia</TableCell>
                <TableCell as="th">Racha</TableCell>
                <TableCell as="th" />
              </tr>
            </TableHeader>
            <tbody>
              {filteredStudents.map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}
            </tbody>
          </Table>

          {pagination.total_pages > 1 && (
            <Pagination
              page={pagination.page}
              perPage={pagination.per_page}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
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
