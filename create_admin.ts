
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
let envVars: Record<string, string> = {};

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
          const key = line.substring(0, idx).trim();
          const value = line.substring(idx + 1).trim();
          envVars[key] = value;
      }
  });
} catch (e) {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error("Missing headers in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log("Usage: npx tsx create_admin.ts <email> <password>");
  process.exit(1);
}

async function run() {
  console.log(`Tentando criar usuário: ${email}...`);
  
  // 1. Sign Up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("❌ Erro ao criar usuário:", error.message);
    return;
  }

  console.log(`✅ Usuário criado/identificado: ${data.user?.id}`);

  if (data.user && !data.session) {
    console.log("\n⚠️ ATENÇÃO: O usuário foi criado, mas o Supabase aguarda confirmação de email.");
    console.log("👉 Verifique sua caixa de entrada ou vá no Supabase > Auth > Users e confirme manualmente.");
  } else if (data.session) {
    console.log("\n✅ Usuário autenticado com sucesso! O login deve funcionar agora.");
  }
}

run();
