import React, { useState, useEffect, useRef } from 'react';
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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const { data: savedContract } = await supabase
                    .from('rental_contracts')
                    .select('content')
                    .eq('rental_id', reservation.id)
                    .maybeSingle();

                let initialContent = '';
                if (savedContract?.content) {
                    initialContent = savedContract.content;
                } else {
                    const { data: template } = await supabase
                        .from('contract_templates')
                        .select('content')
                        .limit(1)
                        .maybeSingle();

                    const baseTemplate = template?.content || getDefaultFallback();
                    initialContent = fillPlaceholders(baseTemplate);
                }

                if (editorRef.current) {
                    editorRef.current.innerHTML = initialContent;
                }
            } catch (err) {
                console.error('Erro ao carregar:', err);
                if (editorRef.current) editorRef.current.innerHTML = fillPlaceholders(getDefaultFallback());
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
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

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    const handleSave = async () => {
        if (!editorRef.current) return;
        setIsSaving(true);
        try {
            const content = editorRef.current.innerHTML;
            const { error } = await supabase
                .from('rental_contracts')
                .upsert({ rental_id: reservation.id, content });
            if (error) throw error;
            toast.success('Contrato salvo com sucesso!');
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html>
                    <head>
                        <title>Contrato Midas - ${client?.name}</title>
                        <style>
                            body { font-family: sans-serif; padding: 40px; line-height: 1.5; color: #333; }
                            h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 30px; }
                            p { margin-bottom: 10px; font-size: 12px; text-align: justify; }
                            table { width: 100%; margin-top: 50px; border-collapse: collapse; }
                        </style>
                    </head>
                    <body>${content}</body>
                </html>
            `);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-100 flex flex-col animate-in fade-in duration-300">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight">Editor de Contrato</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{client?.name} • #{reservation.id.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all">
                        <span className="material-symbols-outlined text-lg">print</span>
                        Imprimir
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-lg disabled:opacity-50">
                        {isSaving ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">save</span>}
                        Salvar Contrato
                    </button>
                </div>
            </header>

            {/* Toolbar Customizada */}
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex items-center gap-2 overflow-x-auto">
                <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Negrito"><span className="material-symbols-outlined text-xl">format_bold</span></button>
                <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Itálico"><span className="material-symbols-outlined text-xl">format_italic</span></button>
                <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Sublinhado"><span className="material-symbols-outlined text-xl">format_underlined</span></button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_left</span></button>
                <button onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_center</span></button>
                <button onClick={() => execCommand('justifyFull')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_justify</span></button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_list_bulleted</span></button>
            </div>

            <div className="flex-1 overflow-y-auto flex justify-center p-4 md:p-8 bg-slate-100">
                <div 
                    ref={editorRef}
                    contentEditable
                    className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[20mm] outline-none prose prose-slate max-w-none"
                    style={{ fontFamily: 'serif' }}
                />
            </div>

            {isLoading && (
                <div className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
                </div>
            )}
        </div>
    );
};

export default ContractEditorView;