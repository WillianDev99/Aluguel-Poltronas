import React, { useState, useEffect, Suspense } from 'react';
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
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 1. Tentar buscar contrato já salvo
                const { data: savedContract } = await supabase
                    .from('rental_contracts')
                    .select('content')
                    .eq('rental_id', reservation.id)
                    .maybeSingle();

                if (savedContract?.content) {
                    setContent(savedContract.content);
                } else {
                    // 2. Se não houver salvo, buscar o template e preencher
                    const { data: template } = await supabase
                        .from('contract_templates')
                        .select('content')
                        .limit(1)
                        .maybeSingle();

                    const templateContent = template?.content || getDefaultFallbackTemplate();
                    setContent(fillPlaceholders(templateContent));
                }
            } catch (err) {
                console.error('Erro ao carregar contrato:', err);
                setContent(fillPlaceholders(getDefaultFallbackTemplate()));
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
            '{{CLIENT_ADDRESS}}': client ? `${client.street}, ${client.number} - ${client.neighborhood}, ${client.city}/${client.state}` : '___________________________',
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

    const getDefaultFallbackTemplate = () => `
        <h1 style="text-align: center;">CONTRATO DE LOCAÇÃO DE VEÍCULO</h1>
        <p><strong>LOCADORA:</strong> MIDAS RENT A CAR LTDA.</p>
        <p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}, CPF {{CLIENT_CPF}}, RG {{CLIENT_RG}}.</p>
        <p><strong>ENDEREÇO:</strong> {{CLIENT_ADDRESS}}.</p>
        <p><strong>VEÍCULO:</strong> {{VEHICLE_MODEL}}, PLACA {{VEHICLE_PLATE}}, COR {{VEHICLE_COLOR}}.</p>
        <p><strong>PERÍODO:</strong> {{PICKUP_DATE}} até {{RETURN_DATE}} ({{DAYS}} diárias).</p>
        <p><strong>VALOR TOTAL:</strong> {{TOTAL_VALUE}} | <strong>CAUÇÃO:</strong> {{SECURITY_DEPOSIT}}.</p>
        <br><br>
        <p style="text-align: center;">Tianguá-CE, {{CURRENT_DATE}}</p>
    `;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('rental_contracts')
                .upsert({ rental_id: reservation.id, content });
            if (error) throw error;
            toast.success('Contrato salvo!');
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Contrato Midas</title><style>body{font-family:sans-serif;padding:40px;line-height:1.5;}</style></head><body>${content}</body></html>`);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    if (isLoading) return (
        <div className="fixed inset-0 z-[120] bg-white/90 flex items-center justify-center">
            <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[110] bg-slate-100 dark:bg-slate-950 flex flex-col">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">arrow_back</span></button>
                    <h2 className="text-lg font-black uppercase">Editor de Contrato</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 rounded-lg font-bold text-sm">Imprimir</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg">
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </header>
            <div className="flex-1 overflow-hidden flex justify-center p-4 md:p-8">
                <div className="w-full max-w-[210mm] bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200">
                    <ReactQuill theme="snow" value={content} onChange={setContent} className="flex-1 flex flex-col" />
                </div>
            </div>
            <style>{`.ql-container.ql-snow{border:none!important;font-family:sans-serif;font-size:14px;}.ql-toolbar.ql-snow{border:none!important;border-bottom:1px solid #f1f5f9!important;background:#f8fafc;}.ql-editor{padding:50px 70px!important;min-height:100%;}`}</style>
        </div>
    );
};

export default ContractEditorView;