"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { Planning } from "@/lib/api/types";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "purple";

const STATUS_CONFIG: Record<
  Planning["status"],
  { label: string; variant: BadgeVariant }
> = {
  active:    { label: "Activa",     variant: "success"  },
  draft:     { label: "Borrador",   variant: "warning"  },
  scheduled: { label: "Programada", variant: "primary"  },
  completed: { label: "Completada", variant: "neutral"  },
  archived:  { label: "Archivada",  variant: "neutral"  },
};

interface PlanningStatusBadgeProps {
  status: Planning["status"];
  size?: "sm" | "md";
}

export const PlanningStatusBadge: React.FC<PlanningStatusBadgeProps> = ({
  status,
  size = "sm",
}) => {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "neutral" as BadgeVariant };
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
