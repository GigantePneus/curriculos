-- =====================================================
-- MIGRATION: Tabela de Currículos e Permissões
-- =====================================================

-- 1. Create Curriculos Table
CREATE TABLE IF NOT EXISTS curriculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT NOT NULL,
  cargo_desejado TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  arquivo_id TEXT, -- ID do Google Drive
  storage_tipo TEXT DEFAULT 'supabase', -- 'supabase' ou 'drive'
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE curriculos ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Allow ANYONE (including anon) to INSERT (Submit resume)
DROP POLICY IF EXISTS "Public insert curriculos" ON curriculos;
CREATE POLICY "Public insert curriculos" ON curriculos FOR INSERT WITH CHECK (true);

-- Allow Authenticated Users (Admins/Recruiters) to VIEW
DROP POLICY IF EXISTS "Authenticated read curriculos" ON curriculos;
CREATE POLICY "Authenticated read curriculos" ON curriculos FOR SELECT TO authenticated USING (true);
-- Note: Further refinement can be done here to restrict by Store/City if needed later.

-- Allow Admins to UPDATE/DELETE
DROP POLICY IF EXISTS "Admins manage curriculos" ON curriculos;
CREATE POLICY "Admins manage curriculos" ON curriculos FOR ALL TO authenticated USING (is_admin());

-- 4. Grant Permissions to Anon Role (Crucial for Public Form)
GRANT INSERT ON curriculos TO anon;
GRANT SELECT ON curriculos TO anon; -- Sometimes needed for returning data after insert

