-- =====================================================
-- MIGRATION: Sistema de Gerenciamento de Usuários
-- Gigante Pneus - Banco de Currículos
-- =====================================================

-- 1. Criar tabela de roles de usuários
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'recruiter')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id)
);

-- 2. Criar tabela de cidades permitidas por usuário (N:N)
CREATE TABLE IF NOT EXISTS user_cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cidade_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cidade_nome)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_cities_user_id ON user_cities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cities_cidade ON user_cities(cidade_nome);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;

-- Policy: Todos usuários autenticados podem ler user_roles
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON user_roles;
CREATE POLICY "Authenticated users can read user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem inserir/atualizar/deletar user_roles
DROP POLICY IF EXISTS "Admins can manage user_roles" ON user_roles;
CREATE POLICY "Admins can manage user_roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Policy: Todos usuários autenticados podem ler user_cities
DROP POLICY IF EXISTS "Authenticated users can read user_cities" ON user_cities;
CREATE POLICY "Authenticated users can read user_cities"
  ON user_cities FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem gerenciar user_cities
DROP POLICY IF EXISTS "Admins can manage user_cities" ON user_cities;
CREATE POLICY "Admins can manage user_cities"
  ON user_cities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- =====================================================
-- ATUALIZAR RLS DA TABELA CURRICULOS
-- =====================================================

-- Policy: Admins veem tudo, Recrutadores veem apenas suas cidades
DROP POLICY IF EXISTS "Users can view curriculos based on role" ON curriculos;
CREATE POLICY "Users can view curriculos based on role"
  ON curriculos FOR SELECT
  TO authenticated
  USING (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
    OR
    -- Recrutador vê apenas currículos das suas cidades
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_cities uc ON ur.user_id = uc.user_id
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'recruiter' 
        AND ur.is_active = true
        AND uc.cidade_nome = curriculos.cidade
    )
  );

-- Policy: Apenas usuários autenticados podem inserir currículos (formulário público usa anon key)
DROP POLICY IF EXISTS "Anyone can insert curriculos" ON curriculos;
CREATE POLICY "Anyone can insert curriculos"
  ON curriculos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- FUNÇÃO: Auto-promover primeiro usuário a Admin
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não existe nenhum admin ainda, torna o novo usuário admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
    INSERT INTO user_roles (user_id, email, role, is_active)
    VALUES (NEW.id, NEW.email, 'admin', true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Executar após inserção de novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_admin();

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE user_roles IS 'Armazena roles e permissões dos usuários do sistema';
COMMENT ON TABLE user_cities IS 'Relação N:N entre usuários recrutadores e cidades permitidas';
COMMENT ON COLUMN user_roles.role IS 'admin: acesso total | recruiter: acesso filtrado por cidade';
COMMENT ON COLUMN user_cities.cidade_nome IS 'Nome da cidade que o recrutador pode visualizar';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
