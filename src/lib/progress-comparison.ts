/**
 * progress-comparison.ts — helper espejo del backend (1:1).
 *
 * TWIN FILE: backend/src/utils/progress-comparison.js
 * Mantener 1:1. Cualquier cambio aquí debe replicarse en el espejo JS.
 */

export type ProgressStatus = -1 | 0 | 1;

import { compareToRange } from "./range";
import type { VariablesConfig } from "@/lib/api/types";

export const PRIORITY_TABLE: ReadonlyArray<{ key: string; direction: 1 | -1 }> = Object.freeze([
  { key: 'weight_kg',  direction:  1 },
  { key: 'reps',       direction:  1 },
  { key: 'seconds',    direction:  1 },
  { key: 'distance_m', direction:  1 },
  { key: 'rir',        direction:  1 },
  { key: 'rpe',        direction: -1 },
  { key: 'bricks',     direction:  1 },
  { key: 'calories',   direction:  1 },
] as const);

function _compareField(
  actual: number | undefined,
  baseMin: number | undefined,
  baseMax?: number | null,
): ProgressStatus {
  if (actual == null || baseMin == null) return 0;
  return compareToRange(Number(actual), Number(baseMin), baseMax ?? null);
}

export function compareSets(
  actual: { weight: number; reps: number; rir: number },
  baseline: {
    weight: number;
    weight_kg_max?: number | null;
    reps: number;
    reps_max?: number | null;
    rir: number;
    rir_max?: number | null;
  },
): ProgressStatus {
  const dw = _compareField(actual.weight, baseline.weight, baseline.weight_kg_max);
  if (dw !== 0) return dw;
  const dr = _compareField(actual.reps, baseline.reps, baseline.reps_max);
  if (dr !== 0) return dr;
  const drir = _compareField(actual.rir, baseline.rir, baseline.rir_max);
  if (drir !== 0) return drir;
  return 0;
}

export function compareSetsByConfig(
  actual: Record<string, unknown>,
  baseline: Record<string, unknown>,
  config: VariablesConfig,
): ProgressStatus {
  if (!config || !Array.isArray(config.variables)) return 0;

  const canonicalKeys = new Set(
    config.variables
      .filter((v) => !v.is_custom)
      .map((v) => v.key),
  );

  if (canonicalKeys.size === 0) return 0;

  for (const { key, direction } of PRIORITY_TABLE) {
    if (!canonicalKeys.has(key)) continue;

    const aRaw = actual != null ? actual[key] : undefined;
    const bRaw = baseline != null ? baseline[key] : undefined;

    const a = (aRaw == null || aRaw === '') ? 0 : Number.parseFloat(String(aRaw)) || 0;
    const b = (bRaw == null || bRaw === '') ? 0 : Number.parseFloat(String(bRaw)) || 0;

    if (a !== b) {
      const sign: ProgressStatus = a > b ? 1 : -1;
      return (direction === 1 ? sign : (sign === 1 ? -1 : 1)) as ProgressStatus;
    }
  }

  return 0;
}

export function pickMoreChallengingSet<
  T extends { weight: number; reps: number; rir: number },
>(
  planned: T,
  executed: (T & { completed?: boolean }) | null | undefined,
  config?: VariablesConfig | null,
): T {
  if (!executed || executed.completed === false) return planned;
  if (config) {
    const cmp = compareSetsByConfig(
      executed as Record<string, unknown>,
      planned as Record<string, unknown>,
      config,
    );
    return cmp > 0 ? executed : planned;
  }
  return compareSets(executed, planned) > 0 ? executed : planned;
}

interface SetWithAlias {
  weight: number;
  reps: number;
  rir: number;
  alias?: string | null;
  completed?: boolean;
  [key: string]: unknown;
}

export function compareSupersets(
  actual: SetWithAlias[],
  baseline: SetWithAlias[],
  config?: VariablesConfig | null,
): ProgressStatus[] {
  const actualHasAliases = actual.some((s) => s.alias != null && s.alias !== "");
  const baselineHasAliases = baseline.some((s) => s.alias != null && s.alias !== "");

  if (!actualHasAliases || !baselineHasAliases) {
    const len = Math.min(actual.length, baseline.length);
    return Array.from({ length: len }, (_, i) => _compareOneSet(actual[i], baseline[i], config));
  }

  const groupByAlias = (sets: SetWithAlias[]): Map<string, SetWithAlias[]> => {
    const map = new Map<string, SetWithAlias[]>();
    for (const set of sets) {
      const key = set.alias ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(set);
    }
    return map;
  };

  const baselineGroups = groupByAlias(baseline);
  const actualCounters = new Map<string, number>();

  return actual.map((actualSet) => {
    const alias = actualSet.alias ?? "";
    const occurrence = actualCounters.get(alias) ?? 0;
    actualCounters.set(alias, occurrence + 1);
    const baselineGroup = baselineGroups.get(alias);
    if (!baselineGroup || occurrence >= baselineGroup.length) {
      return 0;
    }
    return _compareOneSet(actualSet, baselineGroup[occurrence], config);
  });
}

function _compareOneSet(
  actualSet: SetWithAlias,
  baselineSet: SetWithAlias,
  config?: VariablesConfig | null,
): ProgressStatus {
  if (config != null) {
    return compareSetsByConfig(
      actualSet as Record<string, unknown>,
      baselineSet as Record<string, unknown>,
      config,
    );
  }
  return compareSets(actualSet, baselineSet);
}

export function pickMoreChallengingSuperset<T extends SetWithAlias>(
  planned: T[],
  executed: (T & { completed?: boolean })[] | null | undefined,
  config?: VariablesConfig | null,
): T[] {
  if (!executed || executed.length === 0) return planned;

  const executedHasAliases = executed.some((s) => s.alias != null && s.alias !== "");
  const plannedHasAliases = planned.some((s) => s.alias != null && s.alias !== "");

  if (!executedHasAliases || !plannedHasAliases) {
    const len = Math.max(planned.length, executed.length);
    return Array.from({ length: len }, (_, i) => {
      const p = planned[i];
      const e = executed[i];
      if (!p) return e as T;
      if (!e || e.completed === false) return p;
      return _compareOneSet(e, p, config) > 0 ? e : p;
    });
  }

  const groupByAlias = (sets: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const set of sets) {
      const key = set.alias ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(set);
    }
    return map;
  };

  const executedGroups = groupByAlias(executed as T[]);
  const countByAlias = new Map<string, number>();

  return planned.map((plannedSet) => {
    const alias = plannedSet.alias ?? "";
    const occurrence = countByAlias.get(alias) ?? 0;
    countByAlias.set(alias, occurrence + 1);
    const executedSetsForAlias = executedGroups.get(alias) ?? [];
    const executedSet = executedSetsForAlias[occurrence] as (T & { completed?: boolean }) | undefined;
    if (!executedSet || executedSet.completed === false) return plannedSet;
    return _compareOneSet(executedSet, plannedSet, config) > 0 ? executedSet : plannedSet;
  });
}
