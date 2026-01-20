
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { uploadToGoogleDrive } from '../googleDriveService';
import { exportToGoogleSheets } from '../googleSheetsService';
import { Upload, CheckCircle2, AlertCircle, Loader2, Briefcase, MapPin, HardDrive } from 'lucide-react';
import { Cidade, Cargo } from '../types';
import { fetchCidades, fetchCargos } from '../userService';


const alertUserFriendlyError = (errorMsg?: string) => {
  if (!errorMsg) return null;
  if (errorMsg.includes("Failed to fetch")) return "Erro de Conexão: O navegador bloqueou o acesso ao Script Google. Verifique se o script está publicado como 'Qualquer Pessoa' (Anyone).";
  if (errorMsg.includes("Folder ID")) return "Erro de Configuração: O ID da pasta não foi colocado no Script Google.";
  return `Erro no Drive: ${errorMsg}`;
};

const PublicForm: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    cargoDesired: '',
    pitch: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      const cData = await fetchCidades();
      const jData = await fetchCargos();
      if (cData) setCidades(cData);
      if (jData) setCargos(jData);
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!file) {
      setError("Por favor, anexe seu currículo em PDF ou Word.");
      setLoading(false);
      return;
    }

    try {
      // 1. Upload para Google Drive (Fake Backend Service)
      // Em produção, isso retornaria o ID e URL do arquivo no Drive
      const driveResponse = await uploadToGoogleDrive(file, formData.nome, formData.cidade, formData.cargoDesired);

      if (!driveResponse.success) {
        throw new Error(alertUserFriendlyError(driveResponse.error) || "Falha no upload do arquivo.");
      }

      // 2. Salvar no Supabase (Metadados + Link do Arquivo)
      const { error: dbError } = await supabase.from('curriculos').insert([
        {
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          cidade: formData.cidade,
          cargo_desejado: formData.cargoDesired,
          arquivo_url: driveResponse.url,
          arquivo_id: driveResponse.id,
          descricao: formData.pitch,
          storage_tipo: 'drive', // Flag para indicar onde está o arquivo
          status: 'novo'
        }
      ]);

      if (dbError) throw dbError;

      // 3. Exportar para Sheets (Opcional / Client-side)
      await exportToGoogleSheets({
        ...formData,
        cargo: formData.cargoDesired,
        arquivo_url: driveResponse.url
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao enviar currículo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 animate-in zoom-in duration-300">
          <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 italic uppercase">Sucesso!</h2>
          <p className="text-gray-500 font-medium">
            Seu currículo foi enviado para nosso banco de talentos.
            <br />
            Boa sorte! 🚀
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-black text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors w-full"
          >
            Enviar Novo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-3xl animate-in slide-in-from-bottom-8 duration-700">

        <div className="text-center mb-10 space-y-2">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-gray-100 italic uppercase tracking-tighter leading-none">
            Gigante <span className="text-red-600">Carreiras</span>
          </h1>
          <p className="text-gray-400 uppercase tracking-[0.3em] text-xs font-bold">Banco de Talentos & Oportunidades</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                  placeholder="SEU NOME"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1">Email Profissional</label>
                <input
                  type="email"
                  required
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  required
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Cidade de Interesse
                </label>
                <select
                  required
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none appearance-none cursor-pointer"
                  value={formData.cidade}
                  onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                >
                  <option value="">Selecione a cidade...</option>
                  {cidades.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> Vaga de Interesse
                </label>
                <select
                  required
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none appearance-none cursor-pointer"
                  value={formData.cargoDesired}
                  onChange={e => setFormData({ ...formData, cargoDesired: e.target.value })}
                >
                  <option value="">Selecione o cargo...</option>
                  {cargos.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1">Pitch Pessoal / Resumo (Opcional)</label>
              <textarea
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-red-500/10 transition-all outline-none min-h-[100px]"
                placeholder="Fale um pouco sobre você e seus objetivos..."
                value={formData.pitch}
                onChange={e => setFormData({ ...formData, pitch: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                <Upload className="h-3 w-3" /> Currículo (PDF/DOCX)
              </label>
              <div
                className={`border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center transition-all cursor-pointer hover:border-red-500/50 hover:bg-red-50/50 dark:hover:bg-red-900/10 ${file ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : ''}`}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg">
                    {file ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-red-600" />}
                  </div>
                  <span className="font-bold text-gray-600 dark:text-gray-300 italic">
                    {file ? file.name : "Clique para selecionar seu arquivo"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black text-lg uppercase italic tracking-wider shadow-xl shadow-red-600/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Enviar Candidatura"}
            </button>

          </form>
        </div>

        <p className="text-center text-gray-300 dark:text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-8">
          &copy; Gigante Pneus • Recrutamento Inteligente
        </p>
      </div>
    </div>
  );
};

export default PublicForm;
