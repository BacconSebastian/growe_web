"use client";

import React from "react";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { getUserInitials, getDisplayName } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";

/**
 * Información mínima del alumno que necesita el header.
 * Cubre tanto el tipo User completo como el friend de FriendProfileData.
 */
export interface StudentInfo {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  is_premium?: boolean;
}

interface StudentHeaderProps {
  student: StudentInfo;
}

/**
 * StudentHeader — avatar grande, nombre y badges de identidad del alumno.
 * Sin botones de acción (accesibles como banners debajo del header).
 */
export const StudentHeader: React.FC<StudentHeaderProps> = ({ student }) => {
  const { aliases } = useAliases();
  const displayName = getDisplayName({
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  }, aliases);
  const initials = getUserInitials({
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  });

  return (
    <GradientSurface>
      <div className="flex items-center gap-xl p-xxl">
        <Avatar src={student.avatar_url ?? null} initials={initials} size="xl" />
        <div className="flex flex-col gap-sm">
          <h1 className="text-xxl font-bold text-fg" style={{ margin: 0 }}>
            {displayName}
          </h1>
          <p className="text-sm text-fg-secondary m-0">@{student.username}</p>
          {student.email && (
            <p className="text-sm text-fg-tertiary m-0">{student.email}</p>
          )}
          <div className="flex items-center gap-sm flex-wrap mt-xs">
            <Badge variant="primary" size="sm">Alumno</Badge>
            {student.is_premium && (
              <Badge variant="purple" size="sm">Premium</Badge>
            )}
          </div>
        </div>
      </div>
    </GradientSurface>
  );
};
