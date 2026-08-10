"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { MessageSquare, AlertCircle, User, LayoutGrid, Image as ImageIcon, CheckCircle2, Circle, RefreshCw } from "lucide-react"
import { ImageLightbox } from "@/components/feedback/ImageLightbox"

type FeedbackItem = {
  id: string
  autor: string | null
  email: string | null
  rol: string | null
  modulo: string | null
  comentario: string
  created_at: string
  completado: boolean
  completado_por: string | null
  imagen_url: string | null
  imagen_thumb_url: string | null
}

const MODULO_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  skus:         "SKUs",
  categorias:   "Categorías",
  tiendas:      "Tiendas",
  planogramas:  "Planogramas",
  optimizacion: "Optimización",
  tendencias:   "Tendencias",
  alertas:      "Alertas",
}

function moduloLabel(id: string | null) {
  if (!id) return "Otra / general"
  return MODULO_LABELS[id] ?? id
}

function fmtFecha(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function FeedbackClient() {
  const [items, setItems]       = useState<FeedbackItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filtroModulo, setFiltroModulo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<"pendientes" | "completados" | "todos">("pendientes")
  const [fotoAbierta, setFotoAbierta]   = useState<{ url: string; autor: string } | null>(null)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/feedback")
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(msg)
      }
      setItems(await res.json())
    } catch (err) {
      setError((err as Error).message || "No se pudo cargar el feedback")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const vistasPresentes = useMemo(() => {
    const labels = new Set(items.map((it) => moduloLabel(it.modulo)))
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [items])

  const toggleCompletado = useCallback(async (it: FeedbackItem) => {
    if (toggling.has(it.id)) return
    setToggling((prev) => new Set([...prev, it.id]))
    try {
      const res = await fetch(`/api/feedback?id=${it.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: !it.completado }),
      })
      if (res.ok) {
        setItems((prev) => prev.map((f) => f.id === it.id ? { ...f, completado: !it.completado } : f))
      }
    } catch { /* silencioso */ } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(it.id); return s })
    }
  }, [toggling])

  const porEstado = useMemo(() => {
    if (filtroEstado === "pendientes")  return items.filter((it) => !it.completado)
    if (filtroEstado === "completados") return items.filter((it) => it.completado)
    return items
  }, [items, filtroEstado])

  const visibles = filtroModulo
    ? porEstado.filter((it) => moduloLabel(it.modulo) === filtroModulo)
    : porEstado

  const pendientesCount  = useMemo(() => items.filter((it) => !it.completado).length, [items])
  const completadosCount = useMemo(() => items.filter((it) => it.completado).length, [items])
  const puedeHaberMas    = items.length >= 200

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Lo que el equipo envía desde el botón flotante de la app
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          {!loading && !error && items.length > 0 && (
            <>
              <div className="flex overflow-hidden rounded-lg border text-sm">
                {([
                  { key: "pendientes",  label: `Pendientes (${pendientesCount})` },
                  { key: "completados", label: `Completados (${completadosCount})` },
                  { key: "todos",       label: `Todos (${items.length})` },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFiltroEstado(key)}
                    className={`px-3 py-1.5 transition-colors ${
                      filtroEstado === key
                        ? "bg-[var(--brand-magenta)] text-white"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-magenta)]"
              >
                <option value="">Todas las vistas</option>
                {vistasPresentes.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Cargando feedback…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-card p-10 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={cargar} className="mt-3 text-xs text-[var(--brand-magenta)] underline">
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aún no hay feedback</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Aparecerá aquí cuando alguien lo envíe desde el botón flotante
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Sin resultados para este filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((it) => (
            <article
              key={it.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
                it.completado ? "border-emerald-200 bg-emerald-50" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-[var(--brand-magenta)]" />
                  <span className="truncate">{moduloLabel(it.modulo)}</span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <time className="text-xs text-muted-foreground/70">{fmtFecha(it.created_at)}</time>
                  <button
                    type="button"
                    onClick={() => toggleCompletado(it)}
                    disabled={toggling.has(it.id)}
                    title={it.completado ? "Marcar como pendiente" : "Marcar como completado"}
                    className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {it.completado
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-emerald-500" />
                    }
                  </button>
                </div>
              </div>

              <p className="break-words whitespace-pre-wrap text-sm">{it.comentario}</p>

              {(it.imagen_thumb_url || it.imagen_url) && (
                it.imagen_thumb_url ? (
                  <button
                    type="button"
                    onClick={() => setFotoAbierta({ url: it.imagen_url ?? it.imagen_thumb_url!, autor: it.autor || it.email || "" })}
                    className="self-start overflow-hidden rounded-lg border hover:brightness-95 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-magenta)]"
                    title="Ver la foto completa"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.imagen_thumb_url}
                      alt={`Foto de ${it.autor || it.email || "usuario"}`}
                      className="h-20 w-28 object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                    <ImageIcon className="h-3.5 w-3.5" /> Foto no disponible. Recarga la página.
                  </p>
                )
              )}

              <div className="mt-auto flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={it.email ?? undefined}>
                  {it.autor || it.email || "Anónimo"}
                </span>
                {it.rol && <span className="shrink-0 text-muted-foreground/60">· {it.rol}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && puedeHaberMas && (
        <p className="text-center text-xs text-muted-foreground/70">
          Se muestran los 200 comentarios más recientes.
        </p>
      )}

      {fotoAbierta && (
        <ImageLightbox
          url={fotoAbierta.url}
          alt={`Foto de ${fotoAbierta.autor || "usuario"}`}
          onClose={() => setFotoAbierta(null)}
        />
      )}
    </div>
  )
}
