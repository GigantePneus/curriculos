-- =====================================================
-- MIGRATION: Tabelas Auxiliares (Cidades e Cargos)
-- =====================================================

-- 1. Tabela de Cidades
CREATE TABLE IF NOT EXISTS cidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Cargos
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

-- 4. Policies para Cidades
-- Leitura pública (para login/filtros) ou autenticada
CREATE POLICY "Enable read access for all users" ON cidades FOR SELECT USING (true);

-- Escrita apenas Admin (usando a função is_admin criada anteriormente)
CREATE POLICY "Admins can insert cidades" ON cidades FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can delete cidades" ON cidades FOR DELETE TO authenticated USING (is_admin());

-- 5. Policies para Cargos
CREATE POLICY "Enable read access for all users" ON cargos FOR SELECT USING (true);

CREATE POLICY "Admins can insert cargos" ON cargos FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can delete cargos" ON cargos FOR DELETE TO authenticated USING (is_admin());

-- 6. Inserir dados iniciais (Opcional)
INSERT INTO cidades (nome) VALUES 
('São Paulo'), 
('Rio de Janeiro'), 
('Belo Horizonte'), 
('Curitiba')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO cargos (nome) VALUES 
('Vendedor'), 
('Mecânico'), 
('Gerente'), 
('Auxiliar Administrativo')
ON CONFLICT (nome) DO NOTHING;
