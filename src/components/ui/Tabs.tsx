"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Tabs — lista horizontal con active state subrayado en primary.
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  className = "",
}) => {
  return (
    <div
      className={["flex border-b", className].filter(Boolean).join(" ")}
      style={{ borderColor: "var(--separator-subtle)" }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              "relative px-lg py-md text-base font-medium transition-colors duration-150",
              "border-b-2 -mb-px whitespace-nowrap",
              "focus:outline-none",
              isActive
                ? "text-primary border-primary"
                : "text-fg-secondary border-transparent hover:text-fg",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
