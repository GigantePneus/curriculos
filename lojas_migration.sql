-- =====================================================
-- MIGRATION: Lojas, Logs e Regras de Negócio
-- =====================================================

-- 1. Tabela de Lojas
CREATE TABLE IF NOT EXISTS lojas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  cidade_id UUID REFERENCES cidades(id) ON DELETE CASCADE, -- Opcional: Vincular loja à cidade
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Permissões de Loja (N:N)
CREATE TABLE IF NOT EXISTS user_lojas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_nome TEXT NOT NULL, -- Usando nome para facilitar, pode ser ID se preferir rigidez
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, loja_nome)
);

-- 3. Tabela de Logs de Acesso
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  resource_id TEXT, -- ID do currículo ou página
  action TEXT NOT NULL, -- 'view', 'download', 'login', 'create_user'
  details JSONB, -- Metadados extras
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS para Lojas
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for lojas" ON lojas;
CREATE POLICY "Public read for lojas" ON lojas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage lojas" ON lojas;
CREATE POLICY "Admins manage lojas" ON lojas FOR ALL TO authenticated USING (is_admin());

-- 4.1 RLS para User Lojas
ALTER TABLE user_lojas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read user_lojas" ON user_lojas;
CREATE POLICY "Auth read user_lojas" ON user_lojas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage user_lojas" ON user_lojas;
CREATE POLICY "Admins manage user_lojas" ON user_lojas FOR ALL TO authenticated USING (is_admin());

-- 4.2 RLS para Logs
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read logs" ON access_logs;
CREATE POLICY "Admins read logs" ON access_logs FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "System insert logs" ON access_logs;
CREATE POLICY "System insert logs" ON access_logs FOR INSERT TO authenticated WITH CHECK (true); -- Qualquer autnticado pode logar ações

-- 5. Atualizar Trigger de Auto-Admin
CREATE OR REPLACE FUNCTION auto_assign_admin_logic()
RETURNS TRIGGER AS $$
BEGIN
  -- Regra 1: Se for alexignaciomkt@gmail.com, SEMPRE será Admin
  IF NEW.email = 'alexignaciomkt@gmail.com' THEN
    INSERT INTO user_roles (user_id, email, role, is_active)
    VALUES (NEW.id, NEW.email, 'admin', true)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true;
    
  -- Regra 2: Se não houver nenhum admin no banco, o primeiro vira Admin
  ELSIF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
    INSERT INTO user_roles (user_id, email, role, is_active)
    VALUES (NEW.id, NEW.email, 'admin', true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger para usar a nova função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_logic();

-- 6. Adicionar colunas em Curriculos se necessário
-- ALTER TABLE curriculos ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES lojas(id);

-- 7. [CORREÇÃO IMEDIATA] Forçar Admin para usuário existente
DO $$
BEGIN
  -- Se o usuário já existe na tabela de auth, garante que ele seja admin na user_roles
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'alexignaciomkt@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, email, role, is_active)
    SELECT id, email, 'admin', true
    FROM auth.users
    WHERE email = 'alexignaciomkt@gmail.com'
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true;
  END IF;
END $$;
