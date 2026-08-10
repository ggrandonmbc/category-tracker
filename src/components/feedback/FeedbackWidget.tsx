"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Send, ImagePlus, Trash2, Camera, X } from "lucide-react"
import { toast } from "sonner"
import { procesarImagen, esImagen } from "@/lib/feedback/procesarImagen"
import { capturarPantalla, imagenDesdePaste } from "@/lib/feedback/screenshotUtils"
import { SeleccionCapturaOverlay } from "./SeleccionCapturaOverlay"

export const COMENTARIO_MAX = 2000

const MODULOS = [
  { id: "dashboard",    label: "Dashboard",    match: "/dashboard" },
  { id: "skus",         label: "SKUs",         match: "/skus" },
  { id: "categorias",   label: "Categorías",   match: "/categorias" },
  { id: "tiendas",      label: "Tiendas",      match: "/tiendas" },
  { id: "planogramas",  label: "Planogramas",  match: "/planogramas" },
  { id: "optimizacion", label: "Optimización", match: "/optimizacion" },
  { id: "tendencias",   label: "Tendencias",   match: "/tendencias" },
  { id: "alertas",      label: "Alertas",      match: "/alertas" },
]

function detectarModulo(pathname: string): string {
  for (const m of MODULOS) {
    if (pathname.startsWith(m.match)) return m.id
  }
  return "otra"
}

export function FeedbackWidget() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      {/* z-20: el velo del sidebar móvil es z-30, el widget no debe cubrir el drawer */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Enviar feedback"
        title="Enviar feedback"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-magenta)] text-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--brand-magenta)]"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </button>
      {abierto && <FeedbackModal onClose={() => setAbierto(false)} />}
    </>
  )
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()

  const [modulo, setModulo]       = useState(() => detectarModulo(pathname ?? ""))
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando]   = useState(false)
  const [archivo, setArchivo]     = useState<File | null>(null)
  const [procesada, setProcesada] = useState<{ full: string; thumb: string } | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [seleccionando, setSeleccionando] = useState(false)
  const [pasoFoto, setPasoFoto]   = useState<"inicio" | "ya-tomaste" | "pegar" | "como-antes">("inicio")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!archivo) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(archivo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  const procesarArchivoElegido = async (file: File | null) => {
    if (!file) return
    if (!esImagen(file)) { toast.error("El archivo debe ser una imagen"); return }
    setProcesando(true)
    try {
      const resultado = await procesarImagen(file)
      setArchivo(file)
      setProcesada(resultado)
    } catch (err) {
      toast.error((err as Error).message || "No se pudo procesar la imagen")
      setArchivo(null)
      setProcesada(null)
    } finally {
      setProcesando(false)
    }
  }

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ""
    procesarArchivoElegido(file)
  }

  const handleSeleccionCompleta = async (region: { x: number; y: number; width: number; height: number }) => {
    setSeleccionando(false)
    setCapturando(true)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    try {
      const file = await capturarPantalla(region)
      await procesarArchivoElegido(file)
    } catch (err) {
      toast.error((err as Error).message || "No se pudo capturar la pantalla")
    } finally {
      setCapturando(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const file = imagenDesdePaste(e)
    if (file) procesarArchivoElegido(file)
  }

  const quitarFoto = () => {
    setArchivo(null)
    setProcesada(null)
    setPasoFoto("como-antes")
  }

  const enviar = async () => {
    const texto = comentario.trim()
    if (!texto) return
    setEnviando(true)
    try {
      const payload: Record<string, unknown> = {
        comentario: texto,
        modulo: modulo === "otra" ? null : modulo,
      }
      if (procesada) {
        payload.imagen = procesada.full
        payload.imagenThumb = procesada.thumb
      }
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(error)
      }
      toast.success("¡Gracias! Tu feedback quedó registrado.")
      onClose()
    } catch (err) {
      toast.error((err as Error).message || "No se pudo enviar el feedback. Intenta de nuevo.")
    } finally {
      setEnviando(false)
    }
  }

  if (seleccionando) {
    return (
      <SeleccionCapturaOverlay
        onSeleccion={handleSeleccionCompleta}
        onCancelar={() => setSeleccionando(false)}
      />
    )
  }
  if (capturando) return null

  const texto = comentario.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={enviando ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Enviar feedback</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto p-5" style={{ maxHeight: "70vh" }} onPaste={handlePaste}>
          <p className="text-sm text-muted-foreground">
            Cuéntanos qué mejorar, qué no funciona o qué te gustaría que hiciera la app.
          </p>

          <div>
            <label htmlFor="fb-modulo" className="mb-1 block text-xs font-medium">
              ¿Sobre qué vista?
            </label>
            <select
              id="fb-modulo"
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              disabled={enviando}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-magenta)] disabled:opacity-50"
            >
              {MODULOS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
              <option value="otra">Otra / general</option>
            </select>
          </div>

          <div>
            <label htmlFor="fb-comentario" className="mb-1 block text-xs font-medium">
              Comentario
            </label>
            <textarea
              id="fb-comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={COMENTARIO_MAX}
              disabled={enviando}
              rows={5}
              placeholder="Escribe tu comentario…"
              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-magenta)] disabled:opacity-50"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {comentario.length} / {COMENTARIO_MAX}
            </p>
          </div>

          {/* Foto opcional */}
          <div>
            <span className="mb-1 block text-xs font-medium">
              Foto de respaldo{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </span>

            {previewUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Foto adjunta" className="h-24 w-24 rounded-lg border object-cover" />
                <button
                  type="button"
                  onClick={quitarFoto}
                  disabled={enviando}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Quitar
                </button>
              </div>
            ) : pasoFoto === "inicio" ? (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">¿Vas a mandar un screenshot?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPasoFoto("ya-tomaste")} disabled={enviando}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
                    Sí
                  </button>
                  <button type="button" onClick={() => setPasoFoto("como-antes")} disabled={enviando}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                    No
                  </button>
                </div>
              </div>
            ) : pasoFoto === "ya-tomaste" ? (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">¿Ya la tomaste?</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => setPasoFoto("pegar")} disabled={enviando}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
                    Sí, la pego
                  </button>
                  <button type="button" onClick={() => setSeleccionando(true)} disabled={enviando || procesando}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
                    <Camera className="h-3.5 w-3.5" />
                    {procesando ? "Capturando…" : "No, tómala ahora"}
                  </button>
                </div>
                <button type="button" onClick={() => setPasoFoto("inicio")} disabled={enviando}
                  className="mt-1.5 text-[11px] text-muted-foreground hover:underline">
                  ← Volver
                </button>
              </div>
            ) : pasoFoto === "pegar" ? (
              <div className="rounded-lg border-2 border-dashed px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">Pega la captura aquí con <strong>Ctrl+V</strong></p>
                <button type="button" onClick={() => setPasoFoto("ya-tomaste")} disabled={enviando}
                  className="mt-1.5 text-[11px] text-muted-foreground hover:underline">
                  ← Volver
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => inputFileRef.current?.click()}
                  disabled={enviando || procesando}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {procesando ? "Procesando…" : "Adjuntar foto"}
                </button>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Una captura ayuda a entender el comentario.
                </p>
              </>
            )}
            <input
              ref={inputFileRef}
              type="file"
              accept="image/*"
              onChange={elegirFoto}
              className="hidden"
              aria-label="Adjuntar foto al feedback"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando || !texto}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-magenta)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  )
}
