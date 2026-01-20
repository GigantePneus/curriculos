
import React, { useState, useEffect } from 'react';
import {
    createUser,
    listUsers,
    toggleUserStatus,
    updateUserCities,
    generateSecurePassword,
    fetchCidades,
    fetchLojas
} from '../userService';
import { UserWithAccess, Role, Cidade, Loja } from '../types';
import { supabase } from '../supabase';
import {
    Users,
    UserPlus,
    Shield,
    CheckCircle2,
    XCircle,
    Loader2,
    Copy,
    RefreshCw,
    MapPin,
    Building2,
    AlertCircle,
    X,
    Plus,
    Briefcase
} from 'lucide-react';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserWithAccess[]>([]);
    const [cidades, setCidades] = useState<Cidade[]>([]);
    const [lojas, setLojas] = useState<Loja[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editCities, setEditCities] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'recruiter' as Role,
        cities: [] as string[],
        lojas: [] as string[]
    });

    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const usersData = await listUsers();
        setUsers(usersData);

        // Carregar cidades e lojas
        const cidadesData = await fetchCidades();
        const lojasData = await fetchLojas();

        if (cidadesData) setCidades(cidadesData);
        if (lojasData) setLojas(lojasData);

        setLoading(false);
    };

    const handleGeneratePassword = () => {
        setFormData({ ...formData, password: generateSecurePassword() });
    };

    const handleCityToggle = (cityName: string) => {
        const newCities = formData.cities.includes(cityName)
            ? formData.cities.filter(c => c !== cityName)
            : [...formData.cities, cityName];
        setFormData({ ...formData, cities: newCities });
    };

    const handleLojaToggle = (lojaName: string) => {
        const newLojas = formData.lojas.includes(lojaName)
            ? formData.lojas.filter(l => l !== lojaName)
            : [...formData.lojas, lojaName];
        setFormData({ ...formData, lojas: newLojas });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setActionMessage(null);

        const result = await createUser(
            formData.email,
            formData.password,
            formData.role,
            formData.cities,
            formData.lojas
        );

        if (result.success) {
            setActionMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
            setFormData({
                email: '',
                password: '',
                role: 'recruiter',
                cities: [],
                lojas: []
            });
            loadData();
        } else {
            setActionMessage({ type: 'error', text: result.error || 'Erro ao criar usuário.' });
        }
        setCreating(false);
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        const success = await toggleUserStatus(userId, !currentStatus);
        if (success) loadData();
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Create User Form */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-2xl">
                        <UserPlus className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-900 dark:text-white italic uppercase tracking-tighter">Novo Usuário</h3>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Email Corporativo</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none font-bold text-gray-700 dark:text-white"
                                placeholder="nome@gigantepneus.com.br"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Senha de Acesso</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none font-bold text-gray-700 dark:text-white pr-12"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={handleGeneratePassword}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Gerar Senha Segura"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Role Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Nível de Permissão</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 cursor-pointer p-4 rounded-2xl border-2 transition-all ${formData.role === 'recruiter' ? 'border-red-600 new-stripe-bg' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="recruiter"
                                        className="hidden"
                                        checked={formData.role === 'recruiter'}
                                        onChange={() => setFormData({ ...formData, role: 'recruiter' })}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <Briefcase className={`h-6 w-6 ${formData.role === 'recruiter' ? 'text-red-600' : 'text-gray-400'}`} />
                                        <span className={`text-xs font-black uppercase italic ${formData.role === 'recruiter' ? 'text-red-900' : 'text-gray-400'}`}>Recrutador</span>
                                    </div>
                                </label>

                                <label className={`flex-1 cursor-pointer p-4 rounded-2xl border-2 transition-all ${formData.role === 'admin' ? 'border-red-600 bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="admin"
                                        className="hidden"
                                        checked={formData.role === 'admin'}
                                        onChange={() => setFormData({ ...formData, role: 'admin' })}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <Shield className={`h-6 w-6 ${formData.role === 'admin' ? 'text-red-600' : 'text-gray-400'}`} />
                                        <span className={`text-xs font-black uppercase italic ${formData.role === 'admin' ? 'text-red-900' : 'text-gray-400'}`}>Admin</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* City and Store Selection (Only for Recruiter) */}
                        <div className="md:col-span-2 space-y-6">
                            {formData.role === 'recruiter' && (
                                <>
                                    {/* Cidades */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Cidades Permitidas
                                        </label>

                                        <select
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none font-bold text-gray-700 dark:text-white appearance-none cursor-pointer"
                                            onChange={(e) => {
                                                if (e.target.value) handleCityToggle(e.target.value);
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Adicionar cidade à permissão...</option>
                                            {cidades.filter(c => !formData.cities.includes(c.nome)).map(c => (
                                                <option key={c.id} value={c.nome}>{c.nome}</option>
                                            ))}
                                        </select>

                                        {/* Selected Cities Tags */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {formData.cities.length > 0 ? (
                                                formData.cities.map(city => (
                                                    <div key={city} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 pl-3 pr-1 py-1.5 rounded-xl flex items-center gap-2 animate-in zoom-in duration-200">
                                                        <span className="text-xs font-black text-red-700 dark:text-red-300 uppercase italic">{city}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCityToggle(city)}
                                                            className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors text-red-500"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic font-medium pl-2">Nenhuma cidade selecionada.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lojas */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            Lojas Permitidas
                                        </label>

                                        <select
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none font-bold text-gray-700 dark:text-white appearance-none cursor-pointer"
                                            onChange={(e) => {
                                                if (e.target.value) handleLojaToggle(e.target.value);
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Adicionar loja à permissão...</option>
                                            {lojas.filter(l => !formData.lojas.includes(l.nome)).map(l => (
                                                <option key={l.id} value={l.nome}>{l.nome}</option>
                                            ))}
                                        </select>

                                        {/* Selected Lojas Tags */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {formData.lojas.length > 0 ? (
                                                formData.lojas.map(loja => (
                                                    <div key={loja} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 pl-3 pr-1 py-1.5 rounded-xl flex items-center gap-2 animate-in zoom-in duration-200">
                                                        <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase italic">{loja}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLojaToggle(loja)}
                                                            className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors text-blue-500"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic font-medium pl-2">Nenhuma loja selecionada.</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    {actionMessage && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                            {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            <span className="font-bold text-sm">{actionMessage.text}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase italic tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5" /> Criar Usuário</>}
                    </button>
                </form>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-8 border-b dark:border-gray-800">
                    <h3 className="font-black text-xl text-gray-900 dark:text-white italic uppercase tracking-tighter">Usuários Cadastrados</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Usuário</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Permissão</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">Lojas / Cidades</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {users.map(user => (
                            <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-8 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{user.email}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-1">ID: {user.user_id.slice(0, 8)}...</div>
                                </td>
                                <td className="px-8 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider ${user.role === 'admin' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-8 py-4">
                                    {user.role === 'admin' ? (
                                        <span className="text-xs text-gray-400 italic">Acesso Irrestrito</span>
                                    ) : (
                                        <div className="space-y-1">
                                            {user.cities && user.cities.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.cities.map(c => <span key={c} className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{c}</span>)}
                                                </div>
                                            )}
                                            {user.lojas && user.lojas.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.lojas.map(l => <span key={l} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{l}</span>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic transition-all ${user.is_active ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                    >
                                        {user.is_active ? 'Ativo' : 'Inativo'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
