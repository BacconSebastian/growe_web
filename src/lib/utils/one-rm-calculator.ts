// 1RM calculator — Epley formula with common percentage table.
// TWIN FILE: mobile/lib/utils/one-rm-calculator.ts / backend/src/utils/one-rm-calculator.js
// Mantener 1:1.

export interface PercentageEntry {
  percent: number;
  weight: number;
  estimatedReps: string;
}

export interface OneRMResult {
  oneRM: number;
  percentages: PercentageEntry[];
}

const PERCENTAGE_REPS: Record<number, string> = {
  95: "1-2",
  90: "3",
  85: "4-5",
  80: "6-8",
  75: "9-10",
  70: "11-12",
  65: "13-15",
  60: "16-20",
};

const PERCENTAGES = [95, 90, 85, 80, 75, 70, 65, 60] as const;

/**
 * Calcula el 1RM estimado usando la fórmula Epley: 1RM = weight × (1 + reps / 30)
 */
export function calculate1RM(weight: number, reps: number): OneRMResult {
  const raw = weight * (1 + reps / 30);
  const oneRM = Math.round(raw * 100) / 100;

  const percentages: PercentageEntry[] = PERCENTAGES.map((percent) => ({
    percent,
    weight: Math.round((oneRM * percent) / 100 * 4) / 4, // round to nearest 0.25 kg
    estimatedReps: PERCENTAGE_REPS[percent],
  }));

  return { oneRM, percentages };
}
