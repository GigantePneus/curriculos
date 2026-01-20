
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // DEBUG: Verificar se a URL está sendo carregada
    const sbUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("Supabase Configured URL:", sbUrl ? "Carregada (Começa com " + sbUrl.substring(0, 8) + ")" : "NÃO CARREGADA / UNDEFINED");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16"></div>

          <div className="text-center mb-10 relative">
            <div className="bg-red-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Área do RH</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-xs mt-2 uppercase tracking-widest">Identifique-se para gerenciar currículos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-red-700 dark:text-red-300 text-xs font-black uppercase italic">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-700 dark:text-gray-400 uppercase italic tracking-widest">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  required
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 outline-none transition-all font-bold"
                  placeholder="rh@gigantepneus.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-700 dark:text-gray-400 uppercase italic tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  required
                  type="password"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 outline-none transition-all font-bold"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase italic text-xl shadow-xl hover:shadow-red-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Acessar Painel"}
            </button>
          </form>

          <p className="mt-10 text-center text-[10px] text-gray-400 uppercase tracking-widest font-black italic">
            Gigante Pneus &copy; Proteção de Dados de RH
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
