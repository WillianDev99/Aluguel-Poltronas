import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { APIKey } from '../types';
import toast from 'react-hot-toast';

const IntegrationsView: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newClientName, setNewClientName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
      toast.error('Erro ao buscar chaves de API');
    } finally {
      setIsLoading(false);
    }
  };

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setIsGenerating(true);
    try {
      // Generate a simple secure random string as key
      const keyValue = `comfortcare_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          key_value: keyValue,
          client_name: newClientName,
          is_active: true
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setKeys([data[0], ...keys]);
        setNewClientName('');
        toast.success('Chave de API gerada com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating key:', error);
      toast.error('Erro ao gerar chave de API');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleKeyStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setKeys(keys.map(k => k.id === id ? { ...k, is_active: !currentStatus } : k));
      toast.success(`Chave ${!currentStatus ? 'ativada' : 'desativada'}`);
    } catch (error) {
      toast.error('Erro ao atualizar status da chave');
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta chave?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setKeys(keys.filter(k => k.id !== id));
      toast.success('Chave excluída permanentemente');
    } catch (error) {
      toast.error('Erro ao excluir chave');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Chave copiada para a área de transferência!');
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/5 space-y-6">
        <h3 className="text-lg font-bold text-primary dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-accent-sunshine">add_circle</span>
          Gerar Nova Chave de Integração
        </h3>
        <p className="text-sm text-slate-500 dark:text-white/60">
          Crie chaves de API para permitir que sistemas de terceiros consultem a disponibilidade da sua frota.
        </p>
        
        <form onSubmit={generateKey} className="flex gap-4">
          <input
            required
            type="text"
            placeholder="Nome do cliente/sistema (ex: Hotel X, Agência Y)"
            className="flex-1 h-12 bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <button
            type="submit"
            disabled={isGenerating || !newClientName.trim()}
            className="px-6 h-12 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">key</span>
            )}
            Gerar Chave
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-primary dark:text-white flex items-center gap-2 px-2">
          <span className="material-symbols-outlined text-accent-sunshine">list</span>
          Chaves Ativas
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="animate-spin material-symbols-outlined text-4xl text-primary/20">progress_activity</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/2 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-4">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-white/10">api</span>
            <p className="text-slate-500 dark:text-white/40 font-medium">Nenhuma chave de integração gerada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {keys.map((key) => (
              <div key={key.id} className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-primary/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-primary dark:text-white">{key.client_name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      key.is_active 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}>
                      {key.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 font-medium">
                    <span className="material-symbols-outlined text-xs">calendar_today</span>
                    Criada em {new Date(key.created_at).toLocaleDateString('pt-BR')}
                    <span className="mx-2">•</span>
                    <span className="material-symbols-outlined text-xs">history</span>
                    Último uso: {key.last_used_at ? new Date(key.last_used_at).toLocaleString('pt-BR') : 'Nunca usada'}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <code className="bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-lg text-primary dark:text-accent-sunshine font-mono text-sm break-all">
                      {key.key_value}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(key.key_value)}
                      className="p-2 text-slate-400 hover:text-primary dark:hover:text-white transition-colors"
                      title="Copiar Chave"
                    >
                      <span className="material-symbols-outlined text-lg">content_copy</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKeyStatus(key.id, key.is_active)}
                    className={`p-2 rounded-xl transition-all ${
                      key.is_active 
                        ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' 
                        : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                    title={key.is_active ? 'Desativar Chave' : 'Ativar Chave'}
                  >
                    <span className="material-symbols-outlined">{key.is_active ? 'block' : 'check_circle'}</span>
                  </button>
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Excluir Permanentemente"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-primary/5 dark:bg-white/2 p-6 rounded-3xl border border-primary/10 dark:border-white/5 space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-black text-primary dark:text-white uppercase tracking-widest">
          <span className="material-symbols-outlined text-accent-sunshine">info</span>
          Como usar a API
        </h4>
        <div className="space-y-2 text-sm text-slate-600 dark:text-white/60 leading-relaxed font-medium">
          <p>Envie as requisições para o endpoint de disponibilidade incluindo a chave no header <code className="bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded text-primary dark:text-accent-sunshine">x-api-key</code>.</p>
          <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-xs overflow-x-auto">
            GET /functions/v1/chair-availability?chair_id=ID_DA_POLTRONA<br/>
            Header: x-api-key: SUA_CHAVE
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsView;
