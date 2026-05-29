"use client";

import React from "react";

// ─── Primitivas de tabla ──────────────────────────────────────────────────────

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className = "",
}) => (
  <thead
    className={["border-b", className].filter(Boolean).join(" ")}
    style={{ borderColor: "var(--separator-subtle)" }}
  >
    {children}
  </thead>
);

interface TableCellProps {
  children?: React.ReactNode;
  className?: string;
  as?: "th" | "td";
  align?: "left" | "center" | "right";
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = "",
  as: Tag = "td",
  align = "left",
}) => {
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[align];
  const baseClass =
    Tag === "th"
      ? "px-lg py-md text-xs font-semibold uppercase tracking-wider text-fg-tertiary"
      : "px-lg py-md text-base text-fg";

  return (
    <Tag
      className={[baseClass, alignClass, className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className = "",
  onClick,
}) => (
  <tr
    className={[
      "border-b transition-colors duration-100",
      onClick ? "cursor-pointer" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    style={{ borderColor: "var(--separator-subtle)" }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) (e.currentTarget as HTMLTableRowElement).style.background = "var(--fill-quaternary)";
    }}
    onMouseLeave={(e) => {
      if (onClick) (e.currentTarget as HTMLTableRowElement).style.background = "";
    }}
  >
    {children}
  </tr>
);

// ─── Componente Table completo ────────────────────────────────────────────────

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table — wrapper con bg card, border, overflow-x-auto.
 * Usar en conjunto con TableHeader, TableRow, TableCell.
 */
export const Table: React.FC<TableProps> = ({ children, className = "" }) => (
  <div
    className={["rounded-lg overflow-hidden overflow-x-auto", className]
      .filter(Boolean)
      .join(" ")}
    style={{
      background: "var(--card)",
      border: "1px solid var(--card-border)",
      boxShadow: "var(--shadow-card)",
    }}
  >
    <table className="w-full border-collapse">
      {children}
    </table>
  </div>
);
