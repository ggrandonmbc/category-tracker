/**
 * Helpers para adjuntar un screenshot al feedback sin salir de la app.
 * Solo se puede usar desde componentes cliente (usa html2canvas y browser APIs).
 * El caller debe sacar el modal del DOM antes de invocar capturarPantalla().
 */

import html2canvas from "html2canvas"

export function imagenDesdePaste(clipboardEvent: React.ClipboardEvent): File | null {
  const items = clipboardEvent.clipboardData?.items
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.type?.startsWith("image/")) return item.getAsFile()
  }
  return null
}

type Region = { x: number; y: number; width: number; height: number }

export async function capturarPantalla(region?: Region): Promise<File> {
  const opciones: Parameters<typeof html2canvas>[1] = { logging: false, useCORS: true }
  if (region) {
    opciones.x = Math.round(region.x + window.scrollX)
    opciones.y = Math.round(region.y + window.scrollY)
    opciones.width = Math.round(region.width)
    opciones.height = Math.round(region.height)
  }
  const canvas = await html2canvas(document.body, opciones)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("No se pudo generar la captura")
  return new File([blob], "captura-pantalla.png", { type: "image/png" })
}
