
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Curriculo, ConfigItem, KPIStats, UserRole, Cidade, Cargo, Loja, AccessLog } from '../types';
import { analyzeResumePitch } from '../geminiService';
import { logAccess } from '../googleDriveService';
import { getCurrentUserRole, getUserCities, fetchCidades, fetchCargos, fetchLojas } from '../userService';
import UserManagement from './UserManagement';
import {
  Filter, Download, Eye, Calendar, MapPin, Briefcase, X, Sparkles, Loader2,
  BarChart3, Settings, Users, Plus, Trash2, TrendingUp, HardDrive, ShieldCheck, Database, UserCog, Store, FileSpreadsheet, History
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'kpis' | 'settings' | 'users' | 'logs'>('list');
  const [curriculos, setCurriculos] = useState<Curriculo[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterLoja, setFilterLoja] = useState('');
  const [selectedResume, setSelectedResume] = useState<Curriculo | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [stats, setStats] = useState<KPIStats>({
    total: 0,
    porCidade: {},
    porCargo: {},
    porDia: {},
    storageStats: { drive: 0, supabase: 0 }
  });

  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [newItemCidade, setNewItemCidade] = useState('');
  const [newItemCargo, setNewItemCargo] = useState('');
  const [newItemLoja, setNewItemLoja] = useState('');

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [allowedCities, setAllowedCities] = useState<string[]>([]);
  const [allowedLojas, setAllowedLojas] = useState<string[]>([]);

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchData();
    }
  }, [filterCity, filterCargo, filterLoja, userRole, activeTab]);

  const loadUserRole = async () => {
    try {
      const role = await getCurrentUserRole();
      if (!role) {
        setLoading(false);
        return;
      }
      setUserRole(role);

      if (role?.role === 'recruiter') {
        const cities = await getUserCities();
        // TODO: Buscar lojas permitidas de forma similar, mas por enquanto assumimos que o filtro
        // será aplicado via RLS ou lógica de negócio futura
        setAllowedCities(cities);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch Curriculos
    let qRes = supabase.from('curriculos').select('*').order('created_at', { ascending: false });

    if (userRole?.role === 'recruiter' && allowedCities.length > 0) {
      qRes = qRes.in('cidade', allowedCities);
    }

    if (filterCity) qRes = qRes.eq('cidade', filterCity);
    if (filterCargo) qRes = qRes.eq('cargo_desejado', filterCargo);
    // if (filterLoja) ... (Implementar se tiver coluna loja_id em curriculos)

    const { data: cData } = await qRes;
    if (cData) setCurriculos(cData);

    // 2. Fetch Configs
    const cityData = await fetchCidades();
    const jobData = await fetchCargos();
    const lojaData = await fetchLojas();

    if (cityData) setCidades(cityData);
    if (jobData) setCargos(jobData);
    if (lojaData) setLojas(lojaData);

    // 3. Stats
    if (cData) { // Usando dados filtrados ou buscar tudo para stats gerais? Geralmente stats são globais ou filtrados.
      // Aqui simplificado para dados atuais
      const s: KPIStats = { total: cData.length, porCidade: {}, porCargo: {}, porDia: {}, storageStats: { drive: 0, supabase: 0 } };
      cData.forEach(curr => {
        s.porCidade[curr.cidade] = (s.porCidade[curr.cidade] || 0) + 1;
        s.porCargo[curr.cargo_desejado] = (s.porCargo[curr.cargo_desejado] || 0) + 1;
        s.storageStats[curr.storage_tipo || 'supabase']++;
        const dia = new Date(curr.created_at).toLocaleDateString('pt-BR');
        s.porDia[dia] = (s.porDia[dia] || 0) + 1;
      });
      setStats(s);
    }

    // 4. Fetch Logs (Only if Admin and Logs tab active)
    if (userRole?.role === 'admin' && activeTab === 'logs') {
      const { data: logData } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (logData) setLogs(logData);
    }

    setLoading(false);
  };

  const handleAddItem = async (table: 'cidades' | 'cargos' | 'lojas', value: string, setter: (v: string) => void) => {
    if (!value) return;
    const { error } = await supabase.from(table).insert([{ nome: value }]);
    if (!error) {
      setter('');
      fetchData();
    }
  };

  const handleDeleteItem = async (table: 'cidades' | 'cargos' | 'lojas', id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) fetchData();
  };

  const handleOpenResume = async (res: Curriculo) => {
    setSelectedResume(res);
    setAiAnalysis(null);

    // Log de Acesso
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAccess(user.id, user.email || 'anon', res.id, 'view');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResume) return;
    setAnalyzing(true);
    const result = await analyzeResumePitch(selectedResume.nome, selectedResume.descricao);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter leading-none">
            RH <span className="text-red-600">COMMAND CENTER</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-red-600" /> Monitoramento em Tempo Real
            {/* DEBUG INFO - REMOVER EM PRODUÇÃO */}
            <span className="ml-4 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-[9px] text-gray-500">
              Role: {loading ? '...' : (userRole?.role || 'Não detectado')}
            </span>
          </p>
        </div>

        <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
          <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon={<Users className="h-4 w-4" />} label="Currículos" />
          <TabButton active={activeTab === 'kpis'} onClick={() => setActiveTab('kpis')} icon={<BarChart3 className="h-4 w-4" />} label="Métricas" />
          {userRole?.role === 'admin' && (
            <>
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="h-4 w-4" />} label="Ajustes" />
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UserCog className="h-4 w-4" />} label="Usuários" />
              <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<History className="h-4 w-4" />} label="Logs" />
            </>
          )}
        </div>
      </div>

      {/* Tab: LIST */}
      {activeTab === 'list' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <select
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-black uppercase italic outline-none flex-grow md:flex-grow-0"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
            >
              <option value="">Todas as Cidades</option>
              {cidades.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <select
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-black uppercase italic outline-none flex-grow md:flex-grow-0"
              value={filterCargo}
              onChange={e => setFilterCargo(e.target.value)}
            >
              <option value="">Todos os Cargos</option>
              {cargos.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            {/* Filtro de Loja (Visual por enquanto) */}
            <select
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-black uppercase italic outline-none flex-grow md:flex-grow-0"
              value={filterLoja}
              onChange={e => setFilterLoja(e.target.value)}
            >
              <option value="">Todas as Lojas</option>
              {lojas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Candidato</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Cidade</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Storage</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto" /></td></tr>
                ) : curriculos.map(item => (
                  <tr key={item.id} className="hover:bg-red-50/20 dark:hover:bg-red-900/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-black text-gray-900 dark:text-white uppercase italic">{item.nome}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{item.cargo_desejado}</div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase italic">{item.cidade}</td>
                    <td className="px-8 py-5">
                      {item.storage_tipo === 'drive' ? (
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg w-fit">
                          <HardDrive className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase italic">Drive</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg w-fit">
                          <Database className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase italic">Internal</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleOpenResume(item)}
                        className="bg-red-600 text-white p-2.5 rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-90"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: KPIS */}
      {activeTab === 'kpis' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Total Talentos" value={stats.total} icon={<Users className="text-red-600 h-6 w-6" />} color="red" />
            <KPICard title="Lojas Atendidas" value={lojas.length} icon={<Store className="text-purple-600 h-6 w-6" />} color="purple" />
            <KPICard title="Cidades" value={cidades.length} icon={<MapPin className="text-orange-600 h-6 w-6" />} color="orange" />
            <KPICard title="Google Storage" value={stats.storageStats.drive} icon={<HardDrive className="text-blue-600 h-6 w-6" />} color="blue" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Distribuição por Cidade" data={stats.porCidade} total={stats.total} />
            <ChartCard title="Distribuição por Cargo" data={stats.porCargo} total={stats.total} />
          </div>
        </div>
      )}

      {/* Tab: SETTINGS */}
      {activeTab === 'settings' && userRole?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
          <ConfigCard
            title="Rede de Cidades"
            items={cidades}
            onAdd={() => handleAddItem('cidades', newItemCidade, setNewItemCidade)}
            onDelete={(id) => handleDeleteItem('cidades', id)}
            newItem={newItemCidade}
            setNewItem={setNewItemCidade}
          />
          <ConfigCard
            title="Unidades (Lojas)"
            items={lojas}
            onAdd={() => handleAddItem('lojas', newItemLoja, setNewItemLoja)}
            onDelete={(id) => handleDeleteItem('lojas', id)}
            newItem={newItemLoja}
            setNewItem={setNewItemLoja}
          />
          <ConfigCard
            title="Matriz de Cargos"
            items={cargos}
            onAdd={() => handleAddItem('cargos', newItemCargo, setNewItemCargo)}
            onDelete={(id) => handleDeleteItem('cargos', id)}
            newItem={newItemCargo}
            setNewItem={setNewItemCargo}
          />
        </div>
      )}

      {/* Tab: USERS */}
      {activeTab === 'users' && userRole?.role === 'admin' && (
        <UserManagement />
      )}

      {/* Tab: LOGS */}
      {activeTab === 'logs' && userRole?.role === 'admin' && (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b dark:border-gray-800">
            <h3 className="font-black text-2xl text-gray-900 dark:text-white italic uppercase tracking-tighter">Logs de Auditoria</h3>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Últimas 100 ações</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Data</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Usuário</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Ação</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto" /></td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-gray-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                    <td className="px-8 py-4 text-xs font-bold text-gray-900 dark:text-white">{log.user_email}</td>
                    <td className="px-8 py-4 text-xs font-bold text-blue-600 uppercase tracking-wider">{log.action}</td>
                    <td className="px-8 py-4 text-[10px] font-mono text-gray-500">{JSON.stringify(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/30">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Security File Access</h2>
              <button onClick={() => setSelectedResume(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-10 overflow-y-auto flex-grow space-y-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                <div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white italic leading-none uppercase tracking-tighter mb-4">{selectedResume.nome}</div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase italic">
                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 tracking-widest"><MapPin className="h-3.5 w-3.5" /> {selectedResume.cidade}</span>
                    <span className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl tracking-widest"><Briefcase className="h-3.5 w-3.5" /> {selectedResume.cargo_desejado}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) logAccess(user.id, user.email || 'anon', selectedResume.id, 'download');
                    window.open(selectedResume.arquivo_url, '_blank');
                  }}
                  className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-black italic uppercase flex items-center justify-center gap-3 transition-all shadow-xl text-sm group active:scale-95"
                >
                  <Download className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" /> Acessar Arquivo
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-widest italic flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-red-600" /> Histórico de Apresentação
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2rem] text-gray-700 dark:text-gray-300 italic border-l-[12px] border-red-600 font-bold text-lg leading-relaxed shadow-inner">
                  "{selectedResume.descricao || "Descrição não informada."}"
                </div>
              </div>

              <div className="space-y-5 bg-red-50 dark:bg-red-900/10 p-8 rounded-[2.5rem] border border-red-100 dark:border-red-900/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-black text-red-700 dark:text-red-400 text-xs uppercase italic tracking-widest">
                    <Sparkles className="h-5 w-5" /> Gemini Profile Analysis
                  </h3>
                  {!aiAnalysis && (
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="text-[10px] font-black bg-red-600 text-white px-4 py-2 rounded-full uppercase italic tracking-widest disabled:opacity-50 active:scale-90"
                    >
                      {analyzing ? "Thinking..." : "Generate Insights"}
                    </button>
                  )}
                </div>
                {analyzing ? (
                  <div className="flex items-center gap-3 text-red-600 py-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-black uppercase italic tracking-widest">Extraindo metadados comportamentais...</span>
                  </div>
                ) : aiAnalysis ? (
                  <p className="text-lg text-red-900 dark:text-red-200 leading-tight font-black italic">
                    {aiAnalysis}
                  </p>
                ) : (
                  <p className="text-[10px] text-red-700/50 dark:text-red-400/50 font-black uppercase italic tracking-widest">IA pronta para analisar fit cultural e motivação.</p>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <button
                onClick={() => setSelectedResume(null)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-black uppercase italic text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                Close Security Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase italic transition-all whitespace-nowrap ${active ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 translate-y-[-2px]' : 'text-gray-400 hover:text-red-600'}`}
  >
    {icon} {label}
  </button>
);

const KPICard = ({ title, value, icon, color }: any) => (
  <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl hover:translate-y-[-5px] transition-all group">
    <div className={`bg-${color}-100 dark:bg-${color}-900/30 p-3 rounded-2xl w-fit mb-6 group-hover:rotate-12 transition-transform`}>{icon}</div>
    <div className="text-4xl font-black text-gray-900 dark:text-white italic mb-1">{value}</div>
    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic leading-none">{title}</div>
  </div>
);

const ChartCard = ({ title, data, total }: any) => (
  <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl">
    <h3 className="font-black text-xs uppercase text-gray-400 dark:text-gray-500 mb-8 tracking-[0.2em] italic flex items-center gap-3">
      <BarChart3 className="h-4 w-4" /> {title}
    </h3>
    <div className="space-y-6">
      {Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([label, count]: any) => (
        <div key={label} className="group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase italic">{label}</span>
            <span className="text-xs font-black text-red-600 italic">{count}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all duration-1000" style={{ width: `${(count / total) * 100}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ConfigCard = ({ title, items, onAdd, onDelete, newItem, setNewItem }: any) => (
  <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl flex flex-col h-[600px]">
    <h3 className="font-black text-2xl text-gray-900 dark:text-white italic uppercase tracking-tighter mb-8">{title}</h3>
    <div className="flex gap-3 mb-8">
      <input
        type="text"
        className="flex-grow px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-800 outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 font-bold text-sm"
        placeholder="Adicionar..."
        value={newItem}
        onChange={e => setNewItem(e.target.value)}
      />
      <button onClick={onAdd} className="bg-red-600 text-white p-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-90"><Plus className="h-6 w-6" /></button>
    </div>
    <div className="overflow-y-auto flex-grow space-y-3 pr-2 custom-scrollbar">
      {items.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group transition-all hover:bg-red-50 dark:hover:bg-red-900/10">
          <span className="font-bold text-gray-700 dark:text-gray-300 text-sm italic uppercase tracking-tight">{item.nome}</span>
          <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-600 p-2 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  </div>
);

export default AdminDashboard;
