/**
 * exercise-presets.ts — Fuente de verdad de variables por tipo de ejercicio (web).
 *
 * TWIN FILE: backend/src/utils/exercise-presets.js / mobile/lib/exercise-presets.ts
 * Mantener 1:1. Cualquier cambio aquí debe replicarse en los espejos.
 */

import type { ExerciseType, CanonicalVariableKey, VariableDef, VariablesConfig } from '@/lib/api/types';

export const CANONICAL_VARIABLES: ReadonlyArray<VariableDef> = Object.freeze([
  { key: 'reps',       label: 'Reps',       unit: undefined,  type: 'int',    is_custom: false, default_value: 8 },
  { key: 'weight_kg',  label: 'Peso',       unit: 'kg',       type: 'number', is_custom: false, default_value: 0 },
  { key: 'rir',        label: 'RIR',        unit: undefined,  type: 'int',    is_custom: false, default_value: 2 },
  { key: 'seconds',    label: 'Segundos',   unit: 's',        type: 'int',    is_custom: false, default_value: 30 },
  { key: 'distance_m', label: 'Distancia',  unit: 'm',        type: 'number', is_custom: false, default_value: 0 },
  { key: 'calories',   label: 'Calorías',   unit: 'kcal',     type: 'int',    is_custom: false, default_value: 0 },
  { key: 'bricks',     label: 'Ladrillos',  unit: undefined,  type: 'int',    is_custom: false, default_value: 1 },
  { key: 'rpe',        label: 'RPE',        unit: undefined,  type: 'int',    is_custom: false, default_value: 7 },
] as VariableDef[]);

const CANONICAL_KEYS = new Set(CANONICAL_VARIABLES.map((v) => v.key));

export const INCOMPATIBILITIES: ReadonlyArray<[CanonicalVariableKey, CanonicalVariableKey]> = Object.freeze([
  ['weight_kg', 'seconds'],
  ['weight_kg', 'distance_m'],
  ['weight_kg', 'calories'],
  ['seconds',   'reps'],
  ['rir',       'rpe'],
  ['bricks',    'weight_kg'],
] as Array<[CanonicalVariableKey, CanonicalVariableKey]>);

const PRESET_CONFIGS = new Map<string, VariablesConfig>();

(function buildPresets() {
  const pick = (keys: string[]): VariablesConfig => ({
    version: 1,
    variables: keys.map((k) => {
      const def = CANONICAL_VARIABLES.find((v) => v.key === k)!;
      return { ...def };
    }),
  });

  PRESET_CONFIGS.set('weight',   pick(['reps', 'weight_kg']));
  PRESET_CONFIGS.set('timed',    pick(['seconds']));
  PRESET_CONFIGS.set('superset', pick(['reps', 'weight_kg', 'rir']));
})();

export function getPresetVariablesConfig(exerciseType: ExerciseType | string): VariablesConfig {
  const canonical = _mapLegacyType(exerciseType);
  const config = PRESET_CONFIGS.get(canonical);
  if (!config) {
    throw new Error(
      `No existe preset canónico para el tipo de ejercicio '${exerciseType}'. Tipos válidos: weight, timed, superset.`,
    );
  }
  return JSON.parse(JSON.stringify(config)) as VariablesConfig;
}

function _mapLegacyType(type: string): string {
  if (type === 'normal' || type === 'warmup') return 'weight';
  if (type === 'warmup_timed') return 'timed';
  return type;
}

function _slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([^a-z])/, 'v$1')
    .slice(0, 32);
}

export function normalizeVariablesConfig(input: unknown): VariablesConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('variables_config debe ser un objeto');
  }

  const raw = input as Record<string, unknown>;

  if (raw['version'] !== 1) {
    throw new Error('variables_config.version no soportada — solo se soporta version: 1');
  }

  if (!Array.isArray(raw['variables'])) {
    throw new Error('variables_config.variables debe ser un array');
  }

  const vars = raw['variables'] as unknown[];

  if (vars.length < 1) throw new Error('Debe existir al menos 1 variable');
  if (vars.length > 6) throw new Error('Máximo 6 variables por ejercicio');

  const usedKeys = new Set<string>();
  const normalized: VariableDef[] = [];

  for (let i = 0; i < vars.length; i++) {
    const v = vars[i];
    if (!v || typeof v !== 'object') {
      throw new Error(`variables_config.variables[${i}] debe ser un objeto`);
    }

    const vRaw = v as Record<string, unknown>;
    const isCustom = Boolean(vRaw['is_custom']);

    if (vRaw['type'] !== 'int' && vRaw['type'] !== 'number') {
      throw new Error(`variables_config.variables[${i}].type inválido — debe ser "int" o "number"`);
    }

    let key: string;

    if (!isCustom) {
      key = String(vRaw['key'] ?? '');
      if (!CANONICAL_KEYS.has(key)) {
        throw new Error(`'${key}' no es una variable canónica válida`);
      }
    } else {
      const label = String(vRaw['label'] ?? '').trim();
      if (!label) {
        throw new Error(`variables_config.variables[${i}].label es requerido para variables custom`);
      }
      if (label.length > 24) {
        throw new Error(`variables_config.variables[${i}].label demasiado largo (max 24 chars)`);
      }

      const existingKey = typeof vRaw['key'] === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(vRaw['key'])
        ? vRaw['key']
        : undefined;

      let slugBase = existingKey ?? _slugify(label);

      if (CANONICAL_KEYS.has(slugBase)) {
        throw new Error(
          `La variable personalizada '${label}' genera una key ('${slugBase}') que colisiona con una canónica`,
        );
      }

      if (usedKeys.has(slugBase)) {
        let suffix = 2;
        let candidate = `${slugBase.slice(0, 30)}_${suffix}`;
        while (usedKeys.has(candidate)) {
          suffix++;
          candidate = `${slugBase.slice(0, 30)}_${suffix}`;
        }
        slugBase = candidate;
      }

      key = slugBase;
    }

    if (usedKeys.has(key)) {
      throw new Error(`Variable duplicada: '${key}'`);
    }
    usedKeys.add(key);

    const canonicalDef = !isCustom ? CANONICAL_VARIABLES.find((cv) => cv.key === key) : undefined;
    const unit = (vRaw['unit'] as string | undefined) ?? canonicalDef?.unit;
    const defaultVal = vRaw['default_value'] !== undefined
      ? Number(vRaw['default_value'])
      : (canonicalDef?.default_value ?? 0);

    normalized.push({
      key,
      label: (vRaw['label'] as string | undefined) ?? canonicalDef?.label ?? key,
      ...(unit !== undefined ? { unit } : {}),
      type: vRaw['type'] as 'int' | 'number',
      is_custom: isCustom,
      default_value: defaultVal,
    });
  }

  const compat = isCompatibleVariableSet([...usedKeys]);
  if (!compat.ok) {
    const conflictMsgs = compat.conflicts.map(([a, b]) => `'${a}' y '${b}'`).join(', ');
    throw new Error(`Variables incompatibles: ${conflictMsgs}`);
  }

  return { version: 1, variables: normalized };
}

export function isCompatibleVariableSet(keys: string[]): {
  ok: boolean;
  conflicts: Array<[string, string]>;
} {
  const keySet = new Set(keys);
  const conflicts: Array<[string, string]> = [];

  for (const [a, b] of INCOMPATIBILITIES) {
    if (keySet.has(a) && keySet.has(b)) {
      conflicts.push([a, b]);
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

export function matchesPreset(config: VariablesConfig, exerciseType: ExerciseType | string): boolean {
  if (exerciseType === 'custom') return false;
  const canonical = _mapLegacyType(exerciseType);
  const preset = PRESET_CONFIGS.get(canonical);
  if (!preset) return false;

  if (!config || !Array.isArray(config.variables)) return false;
  if (config.variables.length !== preset.variables.length) return false;

  for (let i = 0; i < preset.variables.length; i++) {
    if (config.variables[i]?.key !== preset.variables[i]?.key) return false;
    if (Boolean(config.variables[i]?.is_custom) !== Boolean(preset.variables[i]?.is_custom)) return false;
  }

  return true;
}

export function buildEmptySet(config: VariablesConfig): Record<string, string | Record<string, string>> {
  const set: Record<string, string | Record<string, string>> = {};
  const customFields: Record<string, string> = {};

  for (const varDef of (config?.variables ?? [])) {
    const val = String(varDef.default_value !== undefined ? varDef.default_value : 0);
    if (varDef.is_custom) {
      customFields[varDef.key] = val;
    } else {
      set[varDef.key] = val;
    }
  }

  if (Object.keys(customFields).length > 0) {
    set['custom'] = customFields;
  }

  return set;
}

export function getCanonicalCatalog(): ReadonlyArray<VariableDef> {
  return CANONICAL_VARIABLES;
}

export function resolveVariablesConfig(
  storedConfig: VariablesConfig | null | undefined,
  exerciseType: ExerciseType | string,
): VariablesConfig {
  if (storedConfig && typeof storedConfig === 'object' && Array.isArray(storedConfig.variables)) {
    return storedConfig;
  }

  if (exerciseType === 'custom') {
    return { version: 1, variables: [] };
  }

  return getPresetVariablesConfig(exerciseType);
}

export function getVariableDisplayLabel(varDef: VariableDef): string {
  if (varDef.unit) {
    return `${varDef.label ?? varDef.key} (${varDef.unit})`;
  }
  return varDef.label ?? varDef.key;
}
