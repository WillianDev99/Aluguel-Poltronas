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

    useEffect(() => {
        loadTemplate();
    }, [reservation.id]);

    const loadTemplate = async () => {
        setIsLoading(true);
        try {
            // 1. Tentar carregar contrato já salvo
            const { data: existingContract, error: fetchError } = await supabase
                .from('rental_contracts')
                .select('content')
                .eq('rental_id', reservation.id)
                .maybeSingle();

            if (existingContract?.content) {
                setContent(existingContract.content);
            } else {
                // 2. Se não existir, carregar o template padrão
                const { data: template } = await supabase
                    .from('contract_templates')
                    .select('content')
                    .limit(1)
                    .maybeSingle();

                if (template?.content) {
                    let filledContent = template.content;
                    
                    // Mapeamento completo de placeholders
                    const data = {
                        '{{CLIENT_NAME}}': client?.name || '---',
                        '{{CLIENT_CPF}}': client?.cpf || '---',
                        '{{CLIENT_RG}}': client?.rg || '---',
                        '{{CLIENT_ADDRESS}}': `${client?.street || ''}, ${client?.number || ''} - ${client?.neighborhood || ''}, ${client?.city || ''}/${client?.state || ''}`,
                        '{{VEHICLE_MODEL}}': vehicle?.model || '---',
                        '{{VEHICLE_PLATE}}': vehicle?.plate || '---',
                        '{{VEHICLE_COLOR}}': vehicle?.color || '---',
                        '{{VEHICLE_YEAR}}': vehicle?.year?.toString() || '---',
                        '{{PICKUP_DATE}}': new Date(reservation.pickup_date).toLocaleString('pt-BR'),
                        '{{RETURN_DATE}}': new Date(reservation.return_date).toLocaleString('pt-BR'),
                        '{{DAYS}}': reservation.days?.toString() || '---',
                        '{{TOTAL_VALUE}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.total_value),
                        '{{SECURITY_DEPOSIT}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.security_deposit),
                        '{{INSURANCE_VALUE}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle?.default_insurance_value || 0),
                        '{{CURRENT_DATE}}': new Date().toLocaleDateString('pt-BR'),
                    };

                    Object.entries(data).forEach(([key, value]) => {
                        filledContent = filledContent.replaceAll(key, value);
                    });

                    setContent(filledContent);
                } else {
                    setContent('<p>Modelo de contrato não encontrado. Por favor, verifique o banco de dados.</p>');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contrato:', error);
            toast.error('Erro ao carregar contrato. Verifique se as tabelas foram criadas.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('rental_contracts')
                .upsert({
                    rental_id: reservation.id,
                    content: content
                });

            if (error) throw error;
            toast.success('Contrato salvo com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Contrato Midas - ${client?.name}</title>
                        <style>
                            body { font-family: 'Public Sans', sans-serif; padding: 40px; line-height: 1.5; color: #333; }
                            h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 30px; }
                            p { margin-bottom: 10px; font-size: 12px; text-align: justify; }
                            table { width: 100%; margin-top: 50px; border-collapse: collapse; }
                            @media print { body { padding: 0; } .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        ${content}
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-md flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
                    <p className="text-xs font-black text-primary uppercase tracking-widest">Carregando Contrato...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] bg-slate-100 dark:bg-slate-950 flex flex-col animate-in fade-in duration-300">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Editor de Contrato</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Locatário: {client?.name || '---'} • Reserva: #{reservation.id.substring(0, 8)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">print</span>
                        Imprimir
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {isSaving ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">save</span>}
                        Salvar Alterações
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex justify-center p-4 md:p-8">
                <div className="w-full max-w-[210mm] bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200">
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent}
                        className="flex-1 flex flex-col"
                        modules={{
                            toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                [{ 'align': [] }],
                                ['clean']
                            ],
                        }}
                    />
                </div>
            </div>

            <style>{`
                .ql-container.ql-snow { border: none !important; font-family: 'Public Sans', sans-serif; font-size: 14px; }
                .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 12px 20px !important; }
                .ql-editor { padding: 50px 70px !important; min-height: 100%; }
                .ql-editor p { margin-bottom: 1em; line-height: 1.6; }
            `}</style>
        </div>
    );
};

export default ContractEditorView;