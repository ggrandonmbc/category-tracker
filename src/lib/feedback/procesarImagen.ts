/**
 * Reducción de imágenes en el navegador, sin dependencias (solo Web APIs).
 * Solo se puede usar desde componentes cliente (usa canvas, createImageBitmap).
 */

export const FULL_MAX_EDGE = 1920
export const THUMB_MAX_EDGE = 320
export const JPEG_QUALITY = 0.8
export const MIME_SALIDA = "image/jpeg"

export function calcularDimensiones(ancho: number, alto: number, ladoMaximo: number) {
  const mayor = Math.max(ancho, alto)
  if (mayor <= ladoMaximo) return { ancho, alto }
  const escala = ladoMaximo / mayor
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  }
}

export function esImagen(file: File) {
  return !!file && typeof file.type === "string" && file.type.startsWith("image/")
}

async function decodificar(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
      return {
        src: bitmap as CanvasImageSource,
        ancho: bitmap.width,
        alto: bitmap.height,
        liberar: () => (bitmap as ImageBitmap).close?.(),
      }
    } catch { /* fallback */ }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("No se pudo leer la imagen"))
      el.src = url
    })
    return {
      src: img as CanvasImageSource,
      ancho: img.naturalWidth,
      alto: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

function dibujarReducido(src: CanvasImageSource, ancho: number, alto: number, ladoMaximo: number) {
  const destino = calcularDimensiones(ancho, alto, ladoMaximo)
  const canvas = document.createElement("canvas")
  canvas.width = destino.ancho
  canvas.height = destino.alto
  canvas.getContext("2d")!.drawImage(src, 0, 0, destino.ancho, destino.alto)
  return canvas
}

export async function procesarImagen(file: File) {
  if (!esImagen(file)) throw new Error("El archivo debe ser una imagen")
  const fuente = await decodificar(file)
  try {
    const canvasFull = dibujarReducido(fuente.src, fuente.ancho, fuente.alto, FULL_MAX_EDGE)
    const canvasThumb = dibujarReducido(canvasFull, canvasFull.width, canvasFull.height, THUMB_MAX_EDGE)
    return {
      full: canvasFull.toDataURL(MIME_SALIDA, JPEG_QUALITY),
      thumb: canvasThumb.toDataURL(MIME_SALIDA, JPEG_QUALITY),
      ancho: canvasFull.width,
      alto: canvasFull.height,
    }
  } finally {
    fuente.liberar()
  }
}
