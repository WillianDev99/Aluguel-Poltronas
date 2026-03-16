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
        const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        
        const data: Record<string, string> = {
            '{{CLIENT_NAME}}': client?.name || '___________________________',
            '{{CLIENT_CPF}}': client?.cpf || '___.___.___-__',
            '{{CLIENT_RG}}': client?.rg || '__________',
            '{{CLIENT_ADDRESS}}': client ? `${client.street || ''}, ${client.number || ''} - ${client.neighborhood || ''}, ${client.city || ''}/${client.state || ''}` : '___________________________',
            '{{CLIENT_PHONE}}': client?.phone || '___________________________',
            '{{VEHICLE_MODEL}}': vehicle?.model || '___________________________',
            '{{VEHICLE_BRAND}}': vehicle?.brand || '___________________________',
            '{{VEHICLE_PLATE}}': vehicle?.plate || '_______',
            '{{VEHICLE_COLOR}}': vehicle?.color || '__________',
            '{{VEHICLE_YEAR}}': vehicle?.year?.toString() || '____',
            '{{VEHICLE_CATEGORY}}': vehicle?.category || '__________',
            '{{PICKUP_DATE}}': reservation.pickup_date ? new Date(reservation.pickup_date).toLocaleString('pt-BR') : '__/__/____, __:__',
            '{{RETURN_DATE}}': reservation.return_date ? new Date(reservation.return_date).toLocaleString('pt-BR') : '__/__/____, __:__',
            '{{DAYS}}': reservation.days?.toString() || '0',
            '{{DAILY_RATE}}': money(reservation.daily_rate),
            '{{TOTAL_VALUE}}': money(reservation.total_value),
            '{{SECURITY_DEPOSIT}}': money(reservation.security_deposit),
            '{{INSURANCE_VALUE}}': money(vehicle?.default_insurance_value || 0),
            '{{CURRENT_DATE}}': new Date().toLocaleDateString('pt-BR'),
        };

        let result = text;
        Object.entries(data).forEach(([key, value]) => {
            result = result.replaceAll(key, value);
        });
        return result;
    };

    const getDefaultFallback = () => `
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">CONTRATO DE LOCAÇÃO DE VEÍCULOS</div>
        
        <p><strong>LOCADORA:</strong> MIDAS RENT A CAR, inscrita no CNPJ nº 35.449.945/0001-70, com sede à AVENIDA PREFEITO JAQUES NUNES, 2200, neste ato representada por ________________________________________________.</p>
        
        <p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}, portador do CPF {{CLIENT_CPF}} e RG {{CLIENT_RG}}, residente em {{CLIENT_ADDRESS}}, telefone: {{CLIENT_PHONE}}.</p>
        
        <p><strong>CONDUTOR(ES) AUTORIZADO(S):</strong><br>
        Nome: ________________________________________________ CNH: ________________________<br>
        Categoria: ______ Validade: ____/____/_______<br>
        <span style="font-size: 10px;">(Outros condutores somente com autorização expressa da locadora.)</span></p>
        
        <div style="font-weight: bold; margin-top: 20px;">CLÁUSULA 1 – DO OBJETO</div>
        <p>O presente contrato tem por objeto a locação do veículo:<br>
        Marca/Modelo: {{VEHICLE_BRAND}} / {{VEHICLE_MODEL}}<br>
        Categoria: {{VEHICLE_CATEGORY}}<br>
        Placa: {{VEHICLE_PLATE}} &nbsp;&nbsp;&nbsp; Ano/Modelo: {{VEHICLE_YEAR}} &nbsp;&nbsp;&nbsp; Cor: {{VEHICLE_COLOR}}<br>
        Quilometragem inicial: ________________________ km</p>
        
        <div style="font-weight: bold; margin-top: 20px;">CLÁUSULA 2 – DO PRAZO</div>
        <p>O prazo de locação será de {{DAYS}} dias, iniciando-se em {{PICKUP_DATE}} e encerrando-se em {{RETURN_DATE}}, podendo ser prorrogado mediante autorização expressa da LOCADORA.</p>
        
        <div style="font-weight: bold; margin-top: 20px;">CLÁUSULA 3 – DO VALOR</div>
        <p>O valor da locação será de {{DAILY_RATE}} por dia, com limite de 2.000 km durante o prazo de locação que for de 10 até 29 dias, acima disso o limite será de 3.000 km, abaixo de 10 dias não tem limite.<br>
        Excedente de quilometragem: R$ ____________ por km excedido.<br>
        O pagamento será realizado 50% do total da locação no ato da reserva e 50% + caução na retirada do veículo.<br>
        ( ) Dinheiro (espécie)<br>
        ( ) Cartão de crédito/débito<br>
        ( ) PIX</p>
        
        <div style="font-weight: bold; margin-top: 20px;">CLÁUSULA 4 – DA CAUÇÃO</div>
        <p>Será exigida caução no valor de {{SECURITY_DEPOSIT}}, podendo ser realizada por:<br>
        • Cartão de crédito (pré-autorização)<br>
        • PIX<br>
        • Transferência bancária<br>
        A caução será retida até conferência do veículo e multas.</p>
        
        <div style="font-weight: bold; margin-top: 20px;">CLÁUSULA 7 – SEGURO</div>
        <p>O veículo está segurado com cobertura:<br>
        • Colisão<br>
        • Roubo/furto<br>
        • Danos a terceiros (RCF)<br>
        • APP (acidentes pessoais de passageiros)<br>
        Franquia do seguro: {{INSURANCE_VALUE}}<br>
        Em caso de colisão, qualquer valor inferior à franquia é responsabilidade total do LOCATÁRIO.<br>
        Roubo ou furto com negligência (ex.: chave no contato, carro destrancado) será responsabilidade integral do LOCATÁRIO.</p>
        
        <div style="text-align: center; font-weight: bold; margin-top: 40px; margin-bottom: 30px;">ASSINATURA DAS PARTES</div>
        
        <div style="margin-top: 20px;">
            LOCADORA: MIDAS RENT A CAR<br>
            Nome: ________________________________________________<br>
            Data: ____/____/_______
        </div>
        
        <div style="margin-top: 30px;">
            LOCATÁRIO: {{CLIENT_NAME}}<br>
            Nome: ________________________________________________<br>
            Data: ____/____/_______
        </div>
        
        <div style="margin-top: 30px;">
            CONDUTOR(ES): ________________________________________________<br>
            Assinatura: ________________________________________________
        </div>
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
                            body { font-family: serif; padding: 40px; line-height: 1.4; color: #000; font-size: 12px; }
                            p { margin-bottom: 8px; text-align: justify; }
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

            <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex items-center gap-2 overflow-x-auto">
                <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Negrito"><span className="material-symbols-outlined text-xl">format_bold</span></button>
                <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Itálico"><span className="material-symbols-outlined text-xl">format_italic</span></button>
                <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200" title="Sublinhado"><span className="material-symbols-outlined text-xl">format_underlined</span></button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_left</span></button>
                <button onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_center</span></button>
                <button onClick={() => execCommand('justifyFull')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200"><span className="material-symbols-outlined text-xl">format_align_justify</span></button>
            </div>

            <div className="flex-1 overflow-y-auto flex justify-center p-4 md:p-8 bg-slate-100">
                <div 
                    ref={editorRef}
                    contentEditable
                    className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[20mm] outline-none prose prose-slate max-w-none"
                    style={{ fontFamily: 'serif', fontSize: '12px' }}
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