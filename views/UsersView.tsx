
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const UsersView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
    const [isCreating, setIsCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
    const [isSaving, setIsSaving] = useState(false);

    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setMessage(null);

        try {
            // Create a temporary Supabase client with persistSession: false
            // to register the user without altering the administrator session.
            const tempSupabase = createClient(
                "https://jqkujyqinviwpkbdabya.supabase.co",
                "sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd",
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } = await tempSupabase.auth.signUp({
                email: newEmail,
                password: newPassword,
                options: {
                    data: {
                        full_name: newName
                    }
                }
            });

            if (error) {
                let errorMsg = error.message;
                if (error.message.includes('Password should be at least 6 characters')) {
                    errorMsg = 'A senha deve ter no mínimo 6 caracteres.';
                } else if (error.message.includes('already registered')) {
                    errorMsg = 'Este e-mail já está cadastrado no sistema.';
                }
                throw new Error(errorMsg);
            }

            // Immediately update profile to set correct full_name and role
            if (data?.user?.id) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: newName,
                        role: newRole
                    })
                    .eq('id', data.user.id);
                if (profileError) throw profileError;
            }

            setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('user');
            
            // Allow trigger a moment to insert the profile row, then refresh the list
            setTimeout(() => {
                fetchUsers();
            }, 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName,
                    role: editRole
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao atualizar usuário.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            // 1. Tentar remover via RPC se o banco tiver a função
            const { error: rpcError } = await supabase.rpc('delete_user_by_id', {
                target_user_id: deletingUser.id
            });

            if (rpcError) {
                console.warn('RPC delete_user_by_id falhou, tentando deletar apenas perfil:', rpcError);
                // 2. Fallback: Deletar apenas da tabela profiles
                const { error: deleteProfileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', deletingUser.id);

                if (deleteProfileError) throw deleteProfileError;
            }

            setMessage({ type: 'success', text: 'Usuário excluído com sucesso!' });
            setDeletingUser(null);
            fetchUsers();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao excluir usuário.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciar Usuários</h2>
                    <p className="text-slate-500 dark:text-slate-400">Controle quem tem acesso ao sistema administrativo.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registration Form */}
                <div className="lg:col-span-1">
                    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-900 dark:text-white">Novo Usuário</h3>
                        </div>
                        <form className="p-6 space-y-4" onSubmit={handleCreateUser}>
                            {message && (
                                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${message.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                    {message.text}
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="Ex: João Silva"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="email@posleve.com.br"
                                    required
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Senha Provisória</label>
                                <input
                                    type="password"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Perfil de Acesso</label>
                                <select
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value as 'admin' | 'user')}
                                    disabled={isCreating}
                                >
                                    <option value="user">Funcionário Padrão</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                        <span>Criar usuário</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </section>
                </div>

                {/* User List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nível de Acesso</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastrado em</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center">
                                                <span className="animate-spin material-symbols-outlined text-primary text-3xl">progress_activity</span>
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm italic">Nenhum usuário encontrado.</td>
                                        </tr>
                                    ) : users.map((u, index) => {
                                        const rowBg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/10';
                                        return (
                                            <tr key={u.id} className={`${rowBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/25 transition-colors`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                                                            }`}>
                                                            {(u.full_name || u.email)[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{u.full_name || 'Funcionário'}</span>
                                                            <span className="text-xs text-slate-450 dark:text-slate-400">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                                                        }`}>
                                                        {u.role === 'admin' ? 'Gerente' : 'Operador'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-550 dark:text-slate-400 whitespace-nowrap">
                                                    {new Date(u.created_at).toLocaleDateString('pt-BR')} {new Date(u.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(u);
                                                            setEditName(u.full_name || '');
                                                            setEditRole(u.role || 'user');
                                                        }}
                                                        className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-secondary transition-colors"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-lg leading-none">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingUser(u)}
                                                        className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-lg leading-none">delete</span>
                                                    </button>
                                                    </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">Editar Usuário</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-450 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg leading-none">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-750 dark:bg-slate-900 text-sm p-3 text-slate-400 bg-slate-50 dark:bg-slate-950 cursor-not-allowed"
                                    value={editingUser.email}
                                    disabled
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="Ex: João Silva"
                                    required
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Nível de Acesso</label>
                                <select
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
                                    disabled={isSaving}
                                >
                                    <option value="user">Operador (user)</option>
                                    <option value="admin">Gerente (admin)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors"
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                    ) : (
                                        <span>Salvar</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">warning</span>
                                Confirmar Exclusão
                            </h3>
                            <button onClick={() => setDeletingUser(null)} className="text-slate-450 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg leading-none">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-350">
                                Tem certeza de que deseja excluir o usuário <strong className="text-slate-900 dark:text-white">{deletingUser.full_name || deletingUser.email}</strong>?
                            </p>
                            <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-lg font-semibold leading-relaxed">
                                Esta ação removerá os privilégios administrativos deste usuário imediatamente.
                            </p>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setDeletingUser(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors"
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                    ) : (
                                        <span>Confirmar Exclusão</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersView;
