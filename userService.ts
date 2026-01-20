
import { supabase } from './supabase';
import { UserRole, UserCity, UserWithAccess, Role, Cidade, Cargo, Loja } from './types';

/**
 * Gera uma senha segura aleatória
 */
export const generateSecurePassword = (): string => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';

    // Garantir pelo menos 1 de cada tipo
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%&*'[Math.floor(Math.random() * 7)];

    // Preencher o resto
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Embaralhar
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Registra um log de acesso/auditoria
 */
export const registerLog = async (action: string, details: any = {}, resourceId?: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('access_logs').insert([{
            user_id: user.id,
            user_email: user.email,
            action,
            details,
            resource_id: resourceId
        }]);
    } catch (err) {
        console.error("Erro ao registrar log:", err);
    }
};

/**
 * Obtém o role do usuário atual
 */
export const getCurrentUserRole = async (): Promise<UserRole | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    if (error) {
        console.error('Error fetching user role:', error);
        return null;
    }

    console.log("DEBUG: User Role Fetched:", data);
    return data;
};

/**
 * Verifica se o usuário atual é admin
 */
export const isAdmin = async (): Promise<boolean> => {
    const role = await getCurrentUserRole();
    return role?.role === 'admin';
};

/**
 * Cria um novo usuário no sistema
 */
export const createUser = async (
    email: string,
    password: string,
    role: Role,
    cities: string[] = [],
    lojas: string[] = []
): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
        // Verificar se usuário atual é admin
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'Apenas administradores podem criar usuários' };
        }

        // Criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        if (!authData.user) {
            return { success: false, error: 'Falha ao criar usuário' };
        }

        const userId = authData.user.id;
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        // Inserir role do usuário
        const { error: roleError } = await supabase
            .from('user_roles')
            .insert([{
                user_id: userId,
                email,
                role,
                created_by: currentUser?.id,
                is_active: true
            }]);

        if (roleError) {
            console.error('Error creating user role:', roleError);
            return { success: false, error: 'Erro ao atribuir permissões' };
        }

        // Se for recrutador, inserir cidades e lojas permitidas
        if (role === 'recruiter') {
            if (cities.length > 0) {
                const cityInserts = cities.map(cidade => ({
                    user_id: userId,
                    cidade_nome: cidade
                }));
                await supabase.from('user_cities').insert(cityInserts);
            }

            if (lojas.length > 0) {
                const lojaInserts = lojas.map(loja => ({
                    user_id: userId,
                    loja_nome: loja
                }));
                await supabase.from('user_lojas').insert(lojaInserts);
            }
        }

        // Log de Criação
        await registerLog('create_user', { target_email: email, role, cities, lojas });

        return { success: true, userId };
    } catch (error: any) {
        console.error('Error in createUser:', error);
        return { success: false, error: error.message || 'Erro desconhecido' };
    }
};

/**
 * Lista todos os usuários do sistema
 */
export const listUsers = async (): Promise<UserWithAccess[]> => {
    try {
        // Buscar todos os usuários
        const { data: users, error: usersError } = await supabase
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.error('Error fetching users:', usersError);
            return [];
        }

        if (!users) return [];

        // Buscar dados complementares
        const usersWithAccess: UserWithAccess[] = await Promise.all(
            users.map(async (user) => {
                // Cidades
                const { data: cities } = await supabase
                    .from('user_cities')
                    .select('cidade_nome')
                    .eq('user_id', user.user_id);

                // Lojas
                const { data: lojas } = await supabase
                    .from('user_lojas')
                    .select('loja_nome')
                    .eq('user_id', user.user_id);

                return {
                    ...user,
                    cities: cities?.map(c => c.cidade_nome) || [],
                    lojas: lojas?.map(l => l.loja_nome) || []
                };
            })
        );

        return usersWithAccess;
    } catch (error) {
        console.error('Error in listUsers:', error);
        return [];
    }
};

/**
 * Ativa/Desativa um usuário
 */
export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('user_roles')
            .update({ is_active: isActive })
            .eq('user_id', userId);

        if (error) {
            console.error('Error toggling user status:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in toggleUserStatus:', error);
        return false;
    }
};

/**
 * Atualiza as cidades de um recrutador
 */
export const updateUserCities = async (userId: string, cities: string[]): Promise<boolean> => {
    try {
        // Remover cidades antigas
        await supabase
            .from('user_cities')
            .delete()
            .eq('user_id', userId);

        // Inserir novas cidades
        if (cities.length > 0) {
            const cityInserts = cities.map(cidade => ({
                user_id: userId,
                cidade_nome: cidade
            }));

            const { error } = await supabase
                .from('user_cities')
                .insert(cityInserts);

            if (error) {
                console.error('Error updating cities:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error in updateUserCities:', error);
        return false;
    }
};

/**
 * Obtém as cidades permitidas para o usuário atual
 */
export const getUserCities = async (): Promise<string[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: cities } = await supabase
            .from('user_cities')
            .select('cidade_nome')
            .eq('user_id', user.id);

        return cities?.map(c => c.cidade_nome) || [];
    } catch (error) {
        console.error('Error in getUserCities:', error);
        return [];
    }
};

/**
 * Busca todas as cidades cadastradas
 */
export const fetchCidades = async (): Promise<Cidade[]> => {
    const { data } = await supabase.from('cidades').select('*').order('nome');
    return data || [];
};

/**
 * Busca todos os cargos cadastrados
 */
export const fetchCargos = async (): Promise<Cargo[]> => {
    const { data } = await supabase.from('cargos').select('*').order('nome');
    return data || [];
};

/**
 * Busca todas as lojas cadastradas
 */
export const fetchLojas = async (): Promise<Loja[]> => {
    const { data } = await supabase.from('lojas').select('*').order('nome');
    return data || [];
};

/**
 * Atualiza as lojas de um usuário
 */
export const updateUserLojas = async (userId: string, lojas: string[]): Promise<boolean> => {
    try {
        await supabase.from('user_lojas').delete().eq('user_id', userId);

        if (lojas.length > 0) {
            const inserts = lojas.map(nome => ({ user_id: userId, loja_nome: nome }));
            await supabase.from('user_lojas').insert(inserts);
        }

        await registerLog('update_user_lojas', { target_id: userId, lojas });
        return true;
    } catch (err) {
        console.error("Erro ao atualizar lojas:", err);
        return false;
    }
};
