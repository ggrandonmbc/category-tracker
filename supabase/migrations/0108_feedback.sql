-- 0108_feedback.sql
-- Modulo de feedback (portado desde el HUB Montblanc, adaptado a CatMan):
-- widget flotante donde cualquier usuario autenticado puede comentar sobre
-- cualquier vista, con foto opcional, y una bandeja solo-admin para revisar
-- y marcar como completado.
--
-- A diferencia de compliance_fotos/notificaciones (que usan RPCs SECURITY
-- DEFINER), este modulo usa el patron de "mutaciones solo via service role"
-- de 0003_rls.sql: toda la logica vive en server actions de Next.js que
-- generan signed URLs de Storage (algo que un RPC SQL no puede hacer). Por
-- eso la tabla queda con RLS habilitado pero SIN policies -- deny-all para
-- authenticated/anon, el service role bypasea RLS igual.

CREATE TABLE IF NOT EXISTS public.feedback (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor              TEXT,
  email              TEXT,
  rol                TEXT,
  modulo             TEXT,
  comentario         TEXT NOT NULL,
  imagen_path        TEXT,
  imagen_thumb_path  TEXT,
  completado         BOOLEAN NOT NULL DEFAULT false,
  completado_por     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
-- Sin policies a proposito: solo el service role (server actions) lee/escribe.

-- Bucket privado para las fotos de respaldo -- sin policy publica, las fotos
-- se sirven solo como signed URLs generadas por el server action de la bandeja.
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback', 'feedback', false)
ON CONFLICT (id) DO NOTHING;
