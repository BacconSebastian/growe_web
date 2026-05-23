export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

type DateInput = string | number | Date | null | undefined;

export type WeekdayKey = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const WEEKDAY_KEYS: WeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const toValidDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatInAppTimeZone = (
  value: DateInput,
  options: Intl.DateTimeFormatOptions,
  fallback: string,
  locale = "es-AR",
): string => {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

export const formatPerformedTime = (value: DateInput, fallback = "--:--"): string =>
  formatInAppTimeZone(
    value,
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    fallback,
  );

export const formatWeekdayShort = (value: DateInput, fallback = ""): string => {
  const date = toValidDate(value);
  if (!date) return fallback;

  const raw = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);

  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "") + ".";
};

export const formatPerformedDateShort = (value: DateInput, fallback = "Fecha desconocida"): string =>
  formatInAppTimeZone(
    value,
    {
      day: "numeric",
      month: "short",
    },
    fallback,
  );

export const formatPerformedDateLong = (
  value: DateInput,
  options: { includeYear?: boolean; capitalize?: boolean } = {},
): string => {
  const date = toValidDate(value);
  if (!date) return "Fecha desconocida";

  const formatter = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(options.includeYear ? { year: "numeric" as const } : {}),
    timeZone: APP_TIME_ZONE,
  });

  const formatted = formatter.format(date);
  if (options.capitalize === false || !formatted.length) return formatted;
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const startOfWeekMonday = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const daysFromMonday = (day + 6) % 7;
  result.setDate(result.getDate() - daysFromMonday);
  return result;
};

export const toARDateKey = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const getActiveCalendarWeeks = (since: string | null | undefined, referenceDate: Date = new Date()): number => {
  if (!since) return 1;
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return 1;
  const startWeek = startOfWeekMonday(sinceDate);
  const endWeek = startOfWeekMonday(referenceDate);
  const diffMs = endWeek.getTime() - startWeek.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
};

export const formatSubscriptionDate = (value: DateInput, fallback = "Fecha desconocida"): string =>
  formatInAppTimeZone(
    value,
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
    fallback,
  );

export const getWeekdayKey = (value: DateInput): WeekdayKey | null => {
  const date = toValidDate(value);
  if (!date) return null;

  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .toLowerCase();

  return WEEKDAY_KEYS.find((weekday) => weekday === weekdayLabel) ?? null;
};
