
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
const supabase = createClient(url, key);

async function run() {
    console.log("🔍 Iniciando Diagnóstico do Supabase...\n");

    // 1. Check Tables via RPC (if possible) or just simple selects
    const tables = ['curriculos', 'user_roles', 'user_cities', 'cidades', 'cargos', 'lojas', 'access_logs'];

    console.log("--- Verificando Tabelas ---");
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            // If table doesn't exist, code is usually '42P01' or similar
            console.log(`❌ Tabela [${table}]: ERRO (${error.code}) - ${error.message}`);
        } else {
            console.log(`✅ Tabela [${table}]: OK (Linhas: ${count})`);
        }
    }

    // 2. Check for 'is_admin' function availability
    // We can't easily check information_schema with supabase-js client unless we use rpc with a custom function,
    // but we can try to CALL the function via rpc if it was exposed, or just try an operation that DEPENDS on it if we were admin.
    // Since we are likely anon/service_role here (Wait, we are using anon key), we can't see everything.
    // BUT the user issue is likely run-time.

    // Let's try to query 'cidades' which uses is_admin() in its policies?
    // Actually, 'cidades' SELECT policy is "Enable read access for all users" USING (true), so SELECT should work even if is_admin is missing (unless used in SELECT policy).
    // The INSERT/DELETE policies use is_admin().

    console.log("\n--- Verificando Função 'is_admin' ---");
    // We'll try to invoke it directly via RPC. If it doesn't exist, it throws.
    const { data, error: rpcError } = await supabase.rpc('is_admin');

    if (rpcError) {
        if (rpcError.message.includes('Could not find the function')) {
            console.log("❌ Função [is_admin]: NÃO ENCONTRADA. Isso quebrará as permissões de insert/delete.");
            console.log("   (Políticas em 'cidades', 'cargos' e 'lojas' dependem dela)");
        } else {
            console.log(`⚠️ Função [is_admin]: Erro ao chamar (${rpcError.message}) - Talvez ela exista mas requeira auth.`);
        }
    } else {
        console.log(`✅ Função [is_admin]: ENCONTRADA (Retorno: ${data})`);
    }

    // 3. User Roles check (if table exists)
    console.log("\n--- Verificando Admins ---");
    const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
    if (rolesError) {
        console.log("❌ Erro ao ler user_roles:", rolesError.message);
    } else {
        const admins = roles.filter((r: any) => r.role === 'admin');
        console.log(`ℹ️ Total de usuários com role: ${roles.length}`);
        console.log(`ℹ️ Total de ADMINS: ${admins.length}`);
        if (admins.length === 0) console.log("⚠️ AVISO: Nenhum admin configurado. Você pode ficar trancado para fora das edições.");
    }
}

run();
