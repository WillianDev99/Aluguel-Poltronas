import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShippingRate } from '../types';
import toast from 'react-hot-toast';

const ShippingRatesView: React.FC = () => {
    const [rates, setRates] = useState<ShippingRate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
    const [regionName, setRegionName] = useState('');
    const [cepStart, setCepStart] = useState('');
    const [cepEnd, setCepEnd] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('shipping_rates')
                .select('*')
                .order('region_name', { ascending: true });
            
            if (error) throw error;
            setRates(data || []);
        } catch (err: any) {
            console.error('Erro ao buscar fretes:', err);
            toast.error('Não foi possível carregar a tabela de fretes.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCEP = (val: string) => {
        return val.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
    };

    const cleanCEP = (val: string) => {
        return val.replace(/\D/g, '');
    };

    const handleCepStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCepStart(formatCEP(e.target.value));
    };

    const handleCepEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCepEnd(formatCEP(e.target.value));
    };

    const openAddModal = () => {
        setEditingRate(null);
        setRegionName('');
        setCepStart('');
        setCepEnd('');
        setPrice('');
        setIsModalOpen(true);
    };

    const openEditModal = (rate: ShippingRate) => {
        setEditingRate(rate);
        setRegionName(rate.region_name);
        setCepStart(formatCEP(rate.cep_start));
        setCepEnd(formatCEP(rate.cep_end));
        setPrice(rate.price.toString());
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const cleanStart = cleanCEP(cepStart);
        const cleanEnd = cleanCEP(cepEnd);

        if (!regionName.trim()) {
            toast.error('Informe o nome da região.');
            return;
        }

        if (cleanStart.length !== 8 || cleanEnd.length !== 8) {
            toast.error('Os CEPs inicial e final devem conter 8 dígitos.');
            return;
        }

        if (cleanStart > cleanEnd) {
            toast.error('O CEP inicial não pode ser maior que o CEP final.');
            return;
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            toast.error('Informe um valor de frete válido.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                region_name: regionName.trim(),
                cep_start: cleanStart,
                cep_end: cleanEnd,
                price: numericPrice
            };

            if (editingRate) {
                const { error } = await supabase
                    .from('shipping_rates')
                    .update(payload)
                    .eq('id', editingRate.id);
                if (error) throw error;
                toast.success('Frete atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('shipping_rates')
                    .insert(payload);
                if (error) throw error;
                toast.success('Região de frete cadastrada com sucesso!');
            }

            setIsModalOpen(false);
            fetchRates();
        } catch (err: any) {
            console.error('Erro ao salvar frete:', err);
            toast.error('Erro ao salvar dados: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta faixa de frete?')) return;
        try {
            const { error } = await supabase
                .from('shipping_rates')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Faixa de frete excluída!');
            fetchRates();
        } catch (err: any) {
            console.error('Erro ao excluir:', err);
            toast.error('Erro ao excluir: ' + err.message);
        }
    };

    return (
        <div className="flex-1 p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight">Tabela de Fretes</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">Configure o valor da entrega por faixa de CEP</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:brightness-110 text-white rounded-xl font-bold text-sm transition-all shadow-md self-start sm:self-auto uppercase"
                >
                    <span className="material-symbols-outlined text-lg">add_location</span>
                    Nova Região de Frete
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="size-10 border-4 border-slate-200 dark:border-slate-850 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold text-xs uppercase animate-pulse">Buscando tabela de fretes...</p>
                </div>
            ) : rates.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto space-y-4">
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl">local_shipping</span>
                    <h3 className="font-display font-bold text-slate-700 dark:text-slate-350 text-base uppercase tracking-wider">Nenhum frete cadastrado</h3>
                    <p className="text-xs text-slate-400">Cadastre as faixas de CEP e valores de entrega para ativar o cálculo automático nas reservas.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Região / Zona</th>
                                    <th className="px-6 py-4">CEP Inicial</th>
                                    <th className="px-6 py-4">CEP Final</th>
                                    <th className="px-6 py-4">Valor do Frete</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-semibold">
                                {rates.map((rate, idx) => {
                                    const isOdd = idx % 2 !== 0;
                                    return (
                                        <tr 
                                            key={rate.id}
                                            className={`${
                                                isOdd 
                                                    ? 'bg-slate-50/40 dark:bg-slate-800/10' 
                                                    : 'bg-white dark:bg-slate-900'
                                            } hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors`}
                                        >
                                            <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{rate.region_name}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500 dark:text-slate-400">{formatCEP(rate.cep_start)}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500 dark:text-slate-400">{formatCEP(rate.cep_end)}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-500">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rate.price)}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                <button
                                                    onClick={() => openEditModal(rate)}
                                                    className="inline-flex items-center justify-center p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rate.id)}
                                                    className="inline-flex items-center justify-center p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cadastro / Edição Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-display font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                {editingRate ? 'Editar Região' : 'Nova Região de Frete'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </header>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nome da Região / Zona</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                    value={regionName}
                                    onChange={e => setRegionName(e.target.value)}
                                    placeholder="Ex: Aldeota / Meireles"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">CEP Inicial</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                        value={cepStart}
                                        onChange={handleCepStartChange}
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">CEP Final</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                        value={cepEnd}
                                        onChange={handleCepEndChange}
                                        placeholder="00000-000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Valor do Frete (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0,00"
                                    min="0"
                                />
                            </div>

                            <footer className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-primary hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1 shadow-md disabled:opacity-50"
                                >
                                    {isSubmitting && <span className="animate-spin material-symbols-outlined text-xs">progress_activity</span>}
                                    Salvar Região
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingRatesView;
