import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Reservation, Client, Vehicle } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ContractEditorViewProps {
    reservation: Reservation;
    client: Client | undefined;
    vehicle: Vehicle | undefined;
    onClose: () => void;
}

const ContractEditorView: React.FC<ContractEditorViewProps> = ({ reservation, client, vehicle, onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const [useSimpleEditor, setUseSimpleEditor] = useState(false);

    const addLog = (msg: string) => {
        console.log(`[ContractDebug] ${msg}`);
        setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    useEffect(() => {
        const init = async () => {
            addLog('Iniciando carregamento do contrato...');
            addLog(`ID Reserva: ${reservation.id}`);
            addLog(`Cliente: ${client?.name || 'Não encontrado'}`);
            addLog(`Veículo: ${vehicle?.model || 'Não encontrado'}`);

            try {
                // 1. Verificar se a tabela existe e buscar contrato salvo
                addLog('Buscando contrato salvo no banco...');
                const { data: saved, error: fetchError } = await supabase
                    .from('rental_contracts')
                    .select('content')
                    .eq('rental_id', reservation.id)
                    .maybeSingle();

                if (fetchError) {
                    addLog(`Erro ao buscar: ${fetchError.message}`);
                    throw fetchError;
                }

                if (saved?.content) {
                    addLog('Contrato salvo encontrado. Carregando...');
                    setContent(saved.content);
                } else {
                    addLog('Nenhum contrato salvo. Buscando template padrão...');
                    const { data: template, error: tempError } = await supabase
                        .from('contract_templates')
                        .select('content')
                        .limit(1)
                        .maybeSingle();

                    if (tempError) addLog(`Erro template: ${tempError.message}`);

                    const baseContent = template?.content || getDefaultFallback();
                    addLog('Processando placeholders...');
                    setContent(fillPlaceholders(baseContent));
                }
            } catch (err: any) {
                addLog(`FALHA CRÍTICA: ${err.message}`);
                toast.error('Erro ao carregar dados. Verifique o console.');
                setContent(fillPlaceholders(getDefaultFallback()));
            } finally {
                setIsLoading(false);
                addLog('Carregamento finalizado.');
            }
        };

        init();
    }, [reservation.id]);

    const fillPlaceholders = (text: string) => {
        const data: Record<string, string> = {
            '{{CLIENT_NAME}}': client?.name || '___________________________',
            '{{CLIENT_CPF}}': client?.cpf || '___.___.___-__',
            '{{CLIENT_RG}}': client?.rg || '__________',
            '{{CLIENT_ADDRESS}}': client ? `${client.street || ''}, ${client.number || ''} - ${client.neighborhood || ''}, ${client.city || ''}/${client.state || ''}` : '___________________________',
            '{{VEHICLE_MODEL}}': vehicle?.model || '___________________________',
            '{{VEHICLE_PLATE}}': vehicle?.plate || '_______',
            '{{VEHICLE_COLOR}}': vehicle?.color || '__________',
            '{{VEHICLE_YEAR}}': vehicle?.year?.toString() || '____',
            '{{PICKUP_DATE}}': reservation.pickup_date ? new Date(reservation.pickup_date).toLocaleString('pt-BR') : '__/__/____',
            '{{RETURN_DATE}}': reservation.return_date ? new Date(reservation.return_date).toLocaleString('pt-BR') : '__/__/____',
            '{{DAYS}}': reservation.days?.toString() || '0',
            '{{TOTAL_VALUE}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.total_value || 0),
            '{{SECURITY_DEPOSIT}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.security_deposit || 0),
            '{{INSURANCE_VALUE}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle?.default_insurance_value || 0),
            '{{CURRENT_DATE}}': new Date().toLocaleDateString('pt-BR'),
        };

        let result = text;
        Object.entries(data).forEach(([key, value]) => {
            result = result.replaceAll(key, value);
        });
        return result;
    };

    const getDefaultFallback = () => `
        <h1 style="text-align: center;">CONTRATO DE LOCAÇÃO</h1>
        <p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}</p>
        <p><strong>VEÍCULO:</strong> {{VEHICLE_MODEL}} ({{VEHICLE_PLATE}})</p>
        <p><strong>VALOR:</strong> {{TOTAL_VALUE}}</p>
    `;

    const handleSave = async () => {
        setIsSaving(true);
        addLog('Iniciando salvamento...');
        try {
            const { error } = await supabase
                .from('rental_contracts')
                .upsert({ rental_id: reservation.id, content });
            
            if (error) throw error;
            addLog('Salvo com sucesso!');
            toast.success('Contrato salvo!');
        } catch (err: any) {
            addLog(`Erro ao salvar: ${err.message}`);
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col items-center justify-center p-10">
            <span className="animate-spin material-symbols-outlined text-4xl text-primary mb-4">progress_activity</span>
            <div className="w-full max-w-md bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-[10px] overflow-y-auto max-h-40">
                {debugInfo.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[110] bg-slate-100 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">arrow_back</span></button>
                    <h2 className="text-lg font-black uppercase">Editor de Contrato</h2>
                    <button 
                        onClick={() => setUseSimpleEditor(!useSimpleEditor)}
                        className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"
                    >
                        {useSimpleEditor ? 'Usar Editor Rico' : 'Usar Editor Simples (Segurança)'}
                    </button>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm">
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </header>
            
            <div className="flex-1 overflow-hidden flex justify-center p-4 md:p-8">
                <div className="w-full max-w-[210mm] bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200">
                    {useSimpleEditor ? (
                        <textarea 
                            className="flex-1 p-10 font-mono text-sm outline-none resize-none"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    ) : (
                        <ReactQuill 
                            theme="snow" 
                            value={content} 
                            onChange={setContent} 
                            className="flex-1 flex flex-col"
                            onError={(err) => {
                                addLog(`Erro no Quill: ${err}`);
                                setUseSimpleEditor(true);
                            }}
                        />
                    )}
                </div>
            </div>
            
            {/* Painel de Debug Oculto (Acessível via Console) */}
            <style>{`
                .ql-container.ql-snow{border:none!important;font-family:sans-serif;font-size:14px;}.ql-toolbar.ql-snow{border:none!important;border-bottom:1px solid #f1f5f9!important;background:#f8fafc;}.ql-editor{padding:50px 70px!important;min-height:100%;}
            `}</style>
        </div>
    );
};

export default ContractEditorView;