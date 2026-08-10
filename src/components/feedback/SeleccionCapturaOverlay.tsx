"use client"

import { useState, useEffect, useCallback } from "react"

type Region = { x: number; y: number; width: number; height: number }

export function SeleccionCapturaOverlay({
  onSeleccion,
  onCancelar,
}: {
  onSeleccion: (region: Region) => void
  onCancelar: () => void
}) {
  const [inicio, setInicio] = useState<{ x: number; y: number } | null>(null)
  const [actual, setActual] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancelar])

  const rect = inicio && actual ? {
    x: Math.min(inicio.x, actual.x),
    y: Math.min(inicio.y, actual.y),
    width: Math.abs(actual.x - inicio.x),
    height: Math.abs(actual.y - inicio.y),
  } : null

  const handleMouseUp = useCallback(() => {
    if (rect && rect.width > 5 && rect.height > 5) {
      onSeleccion(rect)
    } else {
      setInicio(null)
      setActual(null)
    }
  }, [rect, onSeleccion])

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-crosshair select-none"
      onMouseDown={(e) => { setInicio({ x: e.clientX, y: e.clientY }); setActual({ x: e.clientX, y: e.clientY }) }}
      onMouseMove={(e) => { if (inicio) setActual({ x: e.clientX, y: e.clientY }) }}
      onMouseUp={handleMouseUp}
    >
      {!rect && <div className="absolute inset-0 bg-black/30" />}
      {rect && (
        <div
          className="absolute border-2 border-[var(--brand-magenta)]"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
          }}
        />
      )}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg">
        Arrastra para elegir el área — Esc para cancelar
      </div>
      <button
        type="button"
        onClick={onCancelar}
        className="absolute right-4 top-4 rounded-lg bg-background px-3 py-2 text-xs font-medium shadow-lg hover:bg-muted transition-colors"
      >
        Cancelar
      </button>
    </div>
  )
}
