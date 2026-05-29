"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CANONICAL_VARIABLES,
  isCompatibleVariableSet,
} from "@/lib/exercise-presets";
import type { VariableDef, VariablesConfig } from "@/lib/api/types";

interface VariablesConfigModalProps {
  open: boolean;
  onClose: () => void;
  /** Config actual del ejercicio (ya resuelta — nunca null) */
  currentConfig: VariablesConfig;
  onSave: (config: VariablesConfig) => void;
}

/**
 * VariablesConfigModal — editor de variables de un ejercicio.
 * Permite agregar/quitar variables canónicas y custom.
 * Valida pares incompatibles, mínimo 1, máximo 6.
 */
export const VariablesConfigModal: React.FC<VariablesConfigModalProps> = ({
  open,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [vars, setVars] = useState<VariableDef[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sincronizar con la config al abrir
  useEffect(() => {
    if (open) {
      setVars(currentConfig.variables.map((v) => ({ ...v })));
      setCustomLabel("");
      setCustomUnit("");
      setError(null);
    }
  }, [open, currentConfig]);

  const selectedKeys = vars.map((v) => v.key);
  const { ok: compatible, conflicts } = isCompatibleVariableSet(selectedKeys);

  const canAddCanonical = (key: string) => {
    if (selectedKeys.includes(key)) return false;
    if (vars.length >= 6) return false;
    const testKeys = [...selectedKeys, key];
    const { ok } = isCompatibleVariableSet(testKeys);
    return ok;
  };

  const handleToggleCanonical = (def: VariableDef) => {
    if (selectedKeys.includes(def.key)) {
      // Quitar
      if (vars.length <= 1) return; // Mínimo 1
      setVars(vars.filter((v) => v.key !== def.key));
    } else {
      // Agregar
      if (!canAddCanonical(def.key)) return;
      setVars([...vars, { ...def }]);
    }
    setError(null);
  };

  const handleRemoveVar = (key: string) => {
    if (vars.length <= 1) {
      setError("Debe existir al menos 1 variable.");
      return;
    }
    setVars(vars.filter((v) => v.key !== key));
    setError(null);
  };

  const handleAddCustom = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) {
      setError("El nombre de la variable custom no puede estar vacío.");
      return;
    }
    if (trimmed.length > 24) {
      setError("El nombre no puede superar 24 caracteres.");
      return;
    }
    if (vars.length >= 6) {
      setError("Máximo 6 variables por ejercicio.");
      return;
    }
    // Generar slug
    const slug = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/, "")
      .replace(/^([^a-z])/, "v$1")
      .slice(0, 32);

    if (selectedKeys.includes(slug)) {
      setError("Ya existe una variable con ese nombre.");
      return;
    }

    const newVar: VariableDef = {
      key: slug,
      label: trimmed,
      unit: customUnit.trim() || undefined,
      type: "number",
      is_custom: true,
      default_value: 0,
    };
    setVars([...vars, newVar]);
    setCustomLabel("");
    setCustomUnit("");
    setError(null);
  };

  const handleSave = () => {
    if (vars.length === 0) {
      setError("Debe existir al menos 1 variable.");
      return;
    }
    if (vars.length > 6) {
      setError("Máximo 6 variables por ejercicio.");
      return;
    }
    if (!compatible) {
      const msg = conflicts.map(([a, b]) => `'${a}' y '${b}'`).join(", ");
      setError(`Variables incompatibles: ${msg}`);
      return;
    }
    onSave({ version: 1, variables: vars });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Personalizar variables" size="md">
      <div className="flex flex-col gap-lg">
        {/* Variables canónicas */}
        <div className="flex flex-col gap-sm">
          <p className="text-sm font-semibold text-fg m-0">Variables canónicas</p>
          <div className="flex flex-wrap gap-xs">
            {CANONICAL_VARIABLES.map((def) => {
              const isSelected = selectedKeys.includes(def.key);
              const couldAdd = canAddCanonical(def.key);
              const isCustom = vars.find((v) => v.key === def.key)?.is_custom ?? false;
              const disabled = !isSelected && (!couldAdd || isCustom);
              return (
                <button
                  key={def.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleCanonical(def)}
                  className={[
                    "px-md py-xs rounded-pill text-sm font-medium border transition-colors",
                    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    isSelected
                      ? {
                          background: "var(--primary-alpha-12)",
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }
                      : {
                          background: "var(--fill-tertiary)",
                          borderColor: "transparent",
                          color: "var(--fg-secondary)",
                        }
                  }
                  title={def.unit ? `${def.label} (${def.unit})` : def.label}
                >
                  {def.label ?? def.key}
                  {def.unit ? ` (${def.unit})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Variables seleccionadas (con opción de quitar) */}
        {vars.length > 0 && (
          <div className="flex flex-col gap-xs">
            <p className="text-sm font-semibold text-fg m-0">
              Variables activas ({vars.length}/6)
            </p>
            <div className="flex flex-col gap-xs">
              {vars.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between gap-md px-md py-sm rounded-md"
                  style={{ background: "var(--fill-tertiary)" }}
                >
                  <div className="flex items-center gap-sm min-w-0">
                    <span className="text-sm font-medium text-fg">
                      {v.label ?? v.key}
                    </span>
                    {v.unit && (
                      <span className="text-xs text-fg-tertiary">({v.unit})</span>
                    )}
                    {v.is_custom && (
                      <span
                        className="text-xs px-xs py-xxs rounded-pill font-semibold"
                        style={{
                          background: "var(--primary-alpha-12)",
                          color: "var(--primary)",
                        }}
                      >
                        custom
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVar(v.key)}
                    disabled={vars.length <= 1}
                    className="text-fg-tertiary hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label={`Quitar variable ${v.label ?? v.key}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agregar variable custom */}
        {vars.length < 6 && (
          <div className="flex flex-col gap-sm" style={{ borderTop: "1px solid var(--separator-subtle)", paddingTop: "var(--space-lg)" }}>
            <p className="text-sm font-semibold text-fg m-0">Agregar variable personalizada</p>
            <div className="flex gap-sm">
              <Input
                placeholder="Nombre (ej: Altura banco)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="flex-1"
                maxLength={24}
              />
              <Input
                placeholder="Unidad (opcional)"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                style={{ width: "100px" }}
                maxLength={6}
              />
              <Button
                variant="outline"
                size="md"
                onClick={handleAddCustom}
                iconLeft={<Plus size={14} />}
                type="button"
              >
                Agregar
              </Button>
            </div>
          </div>
        )}

        {/* Aviso de incompatibilidades */}
        {!compatible && (
          <div
            className="flex items-start gap-sm p-md rounded-md"
            style={{
              background: "var(--warning-alpha-20)",
              border: "1px solid var(--warning-alpha-40)",
              color: "var(--warning)",
            }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-px" />
            <span className="text-sm">
              Variables incompatibles:{" "}
              {conflicts.map(([a, b]) => `${a} + ${b}`).join(", ")}. Quitá una para continuar.
            </span>
          </div>
        )}

        {/* Error genérico */}
        {error && (
          <p className="text-sm text-destructive m-0">{error}</p>
        )}

        {/* Acciones */}
        <div className="flex gap-sm" style={{ borderTop: "1px solid var(--separator-subtle)", paddingTop: "var(--space-lg)" }}>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleSave}
            disabled={!compatible || vars.length === 0}
            type="button"
          >
            Guardar
          </Button>
          <Button variant="secondary" size="md" onClick={onClose} type="button">
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
