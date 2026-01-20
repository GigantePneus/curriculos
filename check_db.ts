
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually since we don't have dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseAnonKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('🔍 Verificando tabelas no Supabase...');

    // Check Cidades
    const { error: cidadesError } = await supabase.from('cidades').select('count', { count: 'exact', head: true });

    if (cidadesError) {
        console.error('❌ Tabela "cidades" NÃO ENCONTRADA ou erro de acesso:', cidadesError.message);
    } else {
        console.log('✅ Tabela "cidades" ENCONTRADA.');
    }

    // Check Cargos
    const { error: cargosError } = await supabase.from('cargos').select('count', { count: 'exact', head: true });

    if (cargosError) {
        console.error('❌ Tabela "cargos" NÃO ENCONTRADA ou erro de acesso:', cargosError.message);
    } else {
        console.log('✅ Tabela "cargos" ENCONTRADA.');
    }

    if (cidadesError || cargosError) {
        console.log('\n⚠️  CONCLUSÃO: A migração NÃO foi aplicada corretamente.');
        console.log('👉 Por favor, vá ao Supabase > SQL Editor e rode o script "cidades_cargos_migration.sql".');
    } else {
        console.log('\n🎉 CONCLUSÃO: O banco de dados está pronto!');
    }
}

check();
