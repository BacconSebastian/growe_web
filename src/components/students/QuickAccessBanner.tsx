"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GradientSurface } from "@/components/ui/GradientSurface";

interface QuickAccessBannerBase {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

interface QuickAccessBannerLink extends QuickAccessBannerBase {
  href: string;
  onClick?: never;
}

interface QuickAccessBannerButton extends QuickAccessBannerBase {
  onClick: () => void;
  href?: never;
}

type QuickAccessBannerProps = QuickAccessBannerLink | QuickAccessBannerButton;

/** Contenido interno compartido entre versión Link y Button. */
const BannerContent: React.FC<QuickAccessBannerBase> = ({ icon, title, subtitle }) => (
  <div className="flex items-center justify-between w-full p-lg">
    <div className="flex items-center gap-md">
      <div
        className="flex items-center justify-center rounded-md flex-shrink-0"
        style={{
          width: 40,
          height: 40,
          background: "var(--primary-alpha-12)",
          color: "var(--primary)",
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-xs">
        <p className="text-sm font-medium m-0" style={{ color: "var(--fg)" }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs m-0" style={{ color: "var(--fg-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <ChevronRight size={16} style={{ color: "var(--fg-tertiary)", flexShrink: 0 }} />
  </div>
);

/**
 * QuickAccessBanner — card con gradiente que navega a una sub-sección (`href`)
 * o dispara una acción (`onClick`). Nunca ambos a la vez.
 */
export const QuickAccessBanner: React.FC<QuickAccessBannerProps> = (props) => {
  if (props.href) {
    return (
      <Link href={props.href} style={{ textDecoration: "none" }}>
        <GradientSurface className="transition-opacity hover:opacity-90 cursor-pointer">
          <BannerContent icon={props.icon} title={props.title} subtitle={props.subtitle} />
        </GradientSurface>
      </Link>
    );
  }

  return (
    <GradientSurface
      onClick={props.onClick}
      className="transition-opacity hover:opacity-90 cursor-pointer"
    >
      <BannerContent icon={props.icon} title={props.title} subtitle={props.subtitle} />
    </GradientSurface>
  );
};
