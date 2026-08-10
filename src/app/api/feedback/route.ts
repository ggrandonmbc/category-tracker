/**
 * POST /api/feedback  — Registra un comentario. Abierto a cualquier usuario
 *   autenticado que tenga ficha en la tabla usuarios.
 *
 * GET  /api/feedback  — Bandeja (solo admin). Devuelve hasta 200 items con
 *   signed URLs de las fotos (bucket privado, vigencia 1 h).
 *
 * PATCH /api/feedback?id=<uuid>  — Marca/desmarca completado (solo admin).
 */

import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const BUCKET = "feedback"
const SIGNED_URL_TTL = 3600
const LIMITE = 200
const COMENTARIO_MAX = 2000

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

function decodificarDataUrl(dataUrl: string) {
  const coma = dataUrl.indexOf(",")
  const contentType = dataUrl.slice(5, dataUrl.indexOf(";"))
  return { buffer: Buffer.from(dataUrl.slice(coma + 1), "base64"), contentType }
}

async function subirFoto(
  sb: ReturnType<typeof createServiceRoleClient>,
  usuarioId: string,
  imagen: string,
  imagenThumb: string
) {
  const base = `${usuarioId}/${randomUUID()}`
  const full = { path: `${base}.jpg`, ...decodificarDataUrl(imagen) }
  const thumb = { path: `${base}_thumb.jpg`, ...decodificarDataUrl(imagenThumb) }

  const subir = (o: { path: string; buffer: Buffer; contentType: string }) =>
    sb.storage.from(BUCKET).upload(o.path, o.buffer, { contentType: o.contentType, upsert: false })

  const { error: errFull } = await subir(full)
  if (errFull) return { paths: null, error: errFull.message }

  const { error: errThumb } = await subir(thumb)
  if (errThumb) {
    await sb.storage.from(BUCKET).remove([full.path])
    return { paths: null, error: errThumb.message }
  }

  return { paths: { imagen_path: full.path, imagen_thumb_path: thumb.path }, error: null }
}

async function getAuthenticatedUser() {
  const ssrClient = await createClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return json({ error: "No autenticado" }, 401)

  const sb = createServiceRoleClient()

  const { data: perfil } = await (sb as any)
    .from("usuarios")
    .select("id, nombre, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!perfil) {
    return json({ error: "Tu cuenta no está asociada a un usuario de DBS CatMan" }, 403)
  }

  let body: { comentario?: string; modulo?: string; imagen?: string; imagenThumb?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: "Body inválido" }, 400)
  }

  const comentario = body.comentario?.trim() ?? ""
  if (!comentario) return json({ error: "Comentario requerido" }, 400)
  if (comentario.length > COMENTARIO_MAX) return json({ error: "Comentario demasiado largo" }, 400)

  const fila: Record<string, unknown> = {
    usuario_id: perfil.id,
    autor:      perfil.nombre,
    email:      user.email ?? null,
    rol:        perfil.rol,
    modulo:     body.modulo ?? null,
    comentario,
  }

  if (body.imagen && body.imagenThumb) {
    const { paths, error: errFoto } = await subirFoto(sb, perfil.id, body.imagen, body.imagenThumb)
    if (errFoto) {
      console.error("[feedback] falló la subida de la foto:", errFoto)
      return json({ error: "No se pudo subir la foto. Intenta de nuevo." }, 500)
    }
    Object.assign(fila, paths)
  }

  const { data, error } = await (sb as any).from("feedback").insert(fila).select("id").single()
  if (error) {
    console.error("[feedback] falló el insert:", error.message)
    if (fila.imagen_path) {
      await sb.storage.from(BUCKET).remove([fila.imagen_path as string, fila.imagen_thumb_path as string])
    }
    return json({ error: "No se pudo enviar el feedback. Intenta de nuevo." }, 500)
  }

  return json({ id: data.id }, 201)
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return json({ error: "No autenticado" }, 401)

  const sb = createServiceRoleClient()

  const { data: perfil } = await (sb as any)
    .from("usuarios")
    .select("rol")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (perfil?.rol !== "admin") {
    return json({ error: "Solo los admins pueden ver el feedback" }, 403)
  }

  const { data, error } = await (sb as any)
    .from("feedback")
    .select("id, autor, email, rol, modulo, comentario, created_at, imagen_path, imagen_thumb_path, completado, completado_por")
    .order("created_at", { ascending: false })
    .limit(LIMITE)

  if (error) {
    console.error("[feedback] falló la consulta:", error.message)
    return json({ error: "No se pudo cargar el feedback." }, 500)
  }

  const filas = (data ?? []) as Array<{
    id: string; autor: string | null; email: string | null; rol: string | null
    modulo: string | null; comentario: string; created_at: string
    imagen_path: string | null; imagen_thumb_path: string | null
    completado: boolean; completado_por: string | null
  }>

  const paths = filas.flatMap((f) => [f.imagen_thumb_path, f.imagen_path].filter(Boolean)) as string[]
  const urlPorPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: firmadas, error: errFirma } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    if (errFirma) console.error("[feedback] no se pudieron firmar las fotos:", errFirma.message)
    for (const it of firmadas ?? []) {
      if (it.path && it.signedUrl) urlPorPath.set(it.path, it.signedUrl)
    }
  }

  const conUrls = filas.map(({ imagen_path, imagen_thumb_path, ...f }) => ({
    ...f,
    imagen_url:       imagen_path ? urlPorPath.get(imagen_path) ?? null : null,
    imagen_thumb_url: imagen_thumb_path ? urlPorPath.get(imagen_thumb_path) ?? null : null,
  }))

  return json(conUrls)
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return json({ error: "No autenticado" }, 401)

  const sb = createServiceRoleClient()

  const { data: perfil } = await (sb as any)
    .from("usuarios")
    .select("nombre, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (perfil?.rol !== "admin") {
    return json({ error: "Solo los admins pueden marcar feedback" }, 403)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return json({ error: "Falta el id" }, 400)

  let body: { completado?: boolean }
  try {
    body = await request.json()
  } catch {
    return json({ error: "Body inválido" }, 400)
  }

  if (typeof body.completado !== "boolean") return json({ error: "completado debe ser boolean" }, 400)

  const completado_por = body.completado ? (perfil.nombre || user.email || null) : null

  const { error } = await (sb as any)
    .from("feedback")
    .update({ completado: body.completado, completado_por })
    .eq("id", id)

  if (error) {
    console.error("[feedback] falló el update:", error.message)
    return json({ error: "No se pudo actualizar el feedback" }, 500)
  }

  return json({ ok: true })
}
