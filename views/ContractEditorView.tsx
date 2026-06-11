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
    const [contractStatus, setContractStatus] = useState<'pendente' | 'assinado'>('pendente');
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [signedAt, setSignedAt] = useState<string | null>(null);
    const [signedInfo, setSignedInfo] = useState<{ name?: string, cpf?: string, ip?: string } | null>(null);
    const [sendEmail, setSendEmail] = useState(!!client?.email);
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch Landlord Signature first
                const { data: landlordData } = await supabase
                    .from('profiles')
                    .select('signature_url')
                    .not('signature_url', 'is', null)
                    .limit(1)
                    .maybeSingle();
                const landlordSigUrl = landlordData?.signature_url || null;

                const { data: savedContract } = await supabase
                    .from('rental_contracts')
                    .select('content, status, signature_url, signed_at, client_name, client_cpf, client_ip')
                    .eq('rental_id', reservation.id)
                    .maybeSingle();

                let initialContent = '';
                if (savedContract) {
                    setContractStatus(savedContract.status || 'pendente');
                    setSignatureUrl(savedContract.signature_url || null);
                    setSignedAt(savedContract.signed_at || null);
                    if (savedContract.status === 'assinado') {
                        setSignedInfo({
                            name: savedContract.client_name,
                            cpf: savedContract.client_cpf,
                            ip: savedContract.client_ip
                        });
                    }

                    let dbContent = savedContract.content;
                    const containerRegex = /<div\s+[^>]*id=["']client-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
                    const oldDivRegex = /<div\s+style="height:\s*50px;?\s*">([\s\S]*?)<\/div>/i;
                    const locatarioRegex = /(<div\s+style="text-align:\s*center;\s*width:\s*45%;?"\s*>\s*)(<div\s+style="border-top:\s*1px\s+solid\s+black;[^>]*><\/div>\s*<div[^>]*>(?:(?!<\/div>\s*<div)[\s\S])*?<\/div>\s*<div[^>]*>\s*Locat[áa]rio\s*<\/div>)/i;

                    const landlordContainerRegex = /<div\s+[^>]*id=["']landlord-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
                    const locadoraRegex = /(<div\s+style="text-align:\s*center;\s*width:\s*45%;?"\s*>\s*)(<div\s+style="border-top:\s*1px\s+solid\s+black;[^>]*><\/div>\s*<div[^>]*>(?:(?!<\/div>\s*<div)[\s\S])*?<\/div>\s*<div[^>]*>\s*Locadora\s*<\/div>)/i;

                    // Process client signature
                    if (savedContract.signature_url) {
                        const imgTag = `<img src="${savedContract.signature_url}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />`;
                        
                        if (containerRegex.test(dbContent)) {
                            dbContent = dbContent.replace(containerRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>`);
                        } else if (oldDivRegex.test(dbContent)) {
                            dbContent = dbContent.replace(oldDivRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>`);
                        } else if (dbContent.includes('{{CLIENT_SIGNATURE_PLACEHOLDER}}')) {
                            dbContent = dbContent.replace('{{CLIENT_SIGNATURE_PLACEHOLDER}}', `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>`);
                        } else if (locatarioRegex.test(dbContent)) {
                            dbContent = dbContent.replace(locatarioRegex, `$1<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>$2`);
                        }
                    } else {
                        if (containerRegex.test(dbContent)) {
                            dbContent = dbContent.replace(containerRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
                        } else if (locatarioRegex.test(dbContent)) {
                            dbContent = dbContent.replace(locatarioRegex, `$1<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>$2`);
                        }
                    }

                    // Process landlord signature
                    if (landlordSigUrl) {
                        const landlordImgTag = `<img src="${landlordSigUrl}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />`;
                        if (landlordContainerRegex.test(dbContent)) {
                            dbContent = dbContent.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>`);
                        } else if (locadoraRegex.test(dbContent)) {
                            dbContent = dbContent.replace(locadoraRegex, `$1<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>$2`);
                        }
                    } else {
                        if (landlordContainerRegex.test(dbContent)) {
                            dbContent = dbContent.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
                        }
                    }

                    initialContent = dbContent;
                } else {
                    const { data: template } = await supabase
                        .from('contract_templates')
                        .select('content')
                        .limit(1)
                        .maybeSingle();

                    const baseTemplate = template?.content || getDefaultFallback();
                    let filled = fillPlaceholders(baseTemplate);

                    // Inject landlord signature
                    const landlordContainerRegex = /<div\s+[^>]*id=["']landlord-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
                    const locadoraRegex = /(<div\s+style="text-align:\s*center;\s*width:\s*45%;?"\s*>\s*)(<div\s+style="border-top:\s*1px\s+solid\s+black;[^>]*><\/div>\s*<div[^>]*>(?:(?!<\/div>\s*<div)[\s\S])*?<\/div>\s*<div[^>]*>\s*Locadora\s*<\/div>)/i;

                    if (landlordSigUrl) {
                        const landlordImgTag = `<img src="${landlordSigUrl}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />`;
                        if (landlordContainerRegex.test(filled)) {
                            filled = filled.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>`);
                        } else if (locadoraRegex.test(filled)) {
                            filled = filled.replace(locadoraRegex, `$1<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>$2`);
                        }
                    } else {
                        if (landlordContainerRegex.test(filled)) {
                            filled = filled.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
                        } else if (locadoraRegex.test(filled)) {
                            filled = filled.replace(locadoraRegex, `$1<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>$2`);
                        }
                    }

                    initialContent = filled;
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
            '{{VEHICLE_MODEL}}': vehicle?.model || '___________________________',
            '{{VEHICLE_PLATE}}': vehicle?.plate || '_______',
            '{{VEHICLE_COLOR}}': vehicle?.color || '__________',
            '{{VEHICLE_YEAR}}': vehicle?.year?.toString() || '____',
            '{{PICKUP_DATE}}': reservation.pickup_date ? new Date(reservation.pickup_date).toLocaleDateString('pt-BR') : '__/__/____',
            '{{PICKUP_TIME}}': reservation.pickup_date ? new Date(reservation.pickup_date).toLocaleTimeString('pt-BR') : '__:__:__',
            '{{RETURN_DATE}}': reservation.return_date ? new Date(reservation.return_date).toLocaleDateString('pt-BR') : '__/__/____',
            '{{RETURN_TIME}}': reservation.return_date ? new Date(reservation.return_date).toLocaleTimeString('pt-BR') : '__:__:__',
            '{{TOTAL_VALUE}}': money(reservation.total_value),
            '{{SECURITY_DEPOSIT}}': money(reservation.security_deposit),
            '{{INSURANCE_VALUE}}': money(vehicle?.default_insurance_value || 0),
            '{{CURRENT_DATE}}': new Date().toLocaleDateString('pt-BR'),
            '{{CLIENT_SIGNATURE_PLACEHOLDER}}': signatureUrl 
                ? `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"><img src="${signatureUrl}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" /></div>`
                : `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`
        };

        let result = text;
        Object.entries(data).forEach(([key, value]) => {
            result = result.replaceAll(key, value);
        });
        return result;
    };

    const getDefaultFallback = () => `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 30px; text-decoration: underline;">CONTRATO DE LOCAÇÃO DE POLTRONA E EQUIPAMENTO PÓS-CIRÚRGICO</div>
        
        <p><strong>LOCADORA:</strong> PÓS LEVE LTDA, com sede em Fortaleza - CE.</p>
        
        <p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}, portador do CPF {{CLIENT_CPF}} e RG {{CLIENT_RG}}, residente em {{CLIENT_ADDRESS}}.</p>
        
        <p><strong>EQUIPAMENTO:</strong> {{VEHICLE_MODEL}}, Série/Patrimônio {{VEHICLE_PLATE}}, Cor {{VEHICLE_COLOR}}, Ano {{VEHICLE_YEAR}}.</p>
        
        <p><strong>PERÍODO DE LOCAÇÃO:</strong> A poltrona será entregue e instalada no endereço do locatário em {{PICKUP_DATE}}, {{PICKUP_TIME}} e a coleta realizada em {{RETURN_DATE}}, {{RETURN_TIME}}.</p>
        
        <p><strong>VALORES E CAUÇÃO:</strong> O valor total da locação do período é de {{TOTAL_VALUE}}. O locatário deposita neste ato o valor de {{SECURITY_DEPOSIT}} a título de garantia (caução).</p>
        
        <p><strong>HIGIENIZAÇÃO E GARANTIA:</strong> A poltrona é entregue devidamente higienizada seguindo padrões hospitalares. O locatário responsabiliza-se pela conservação do estofado e mechanisms, com taxa de higienização de {{INSURANCE_VALUE}} inclusa.</p>
        
        <div style="text-align: center; margin-top: 60px; margin-bottom: 60px;">
            Fortaleza-CE, {{CURRENT_DATE}}
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 80px; padding: 0 40px;">
            <div style="text-align: center; width: 45%;">
                <div style="border-top: 1px solid black; margin-bottom: 5px;"></div>
                <div style="font-weight: bold; font-size: 11px;">PÓS LEVE</div>
                <div style="font-size: 10px;">Locadora</div>
            </div>
            <div style="text-align: center; width: 45%;">
                {{CLIENT_SIGNATURE_PLACEHOLDER}}
                <div style="border-top: 1px solid black; margin-bottom: 5px;"></div>
                <div style="font-weight: bold; font-size: 11px;">{{CLIENT_NAME}}</div>
                <div style="font-size: 10px;">Locatário</div>
              </div>
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
                .upsert(
                    { rental_id: reservation.id, content, status: 'pendente' },
                    { onConflict: 'rental_id' }
                );
            if (error) throw error;

            if (sendEmail && client?.email) {
                const signatureLink = `${window.location.origin}/contrato/${reservation.id}/assinar`;
                const { error: emailError } = await supabase.functions.invoke('send-contract-email', {
                    body: {
                        clientEmail: client.email.toLowerCase(),
                        clientName: client.name,
                        signatureLink,
                        reservationDetails: {
                            pickupDate: reservation.pickup_date ? new Date(reservation.pickup_date).toLocaleDateString('pt-BR') : '__/__/____',
                            returnDate: reservation.return_date ? new Date(reservation.return_date).toLocaleDateString('pt-BR') : '__/__/____',
                            vehicleModel: vehicle?.model || 'Poltrona Motorizada Premium - Sistema Lift',
                            vehiclePlate: vehicle?.plate || 'PL-000',
                            totalValue: reservation.total_value,
                            securityDeposit: reservation.security_deposit
                        }
                    }
                });

                if (emailError) {
                    let errMsg = emailError.message;
                    try {
                        if ('context' in emailError && typeof (emailError as any).context.json === 'function') {
                            const errorBody = await (emailError as any).context.json();
                            if (errorBody && errorBody.error) {
                                errMsg = errorBody.error;
                            } else if (errorBody && errorBody.message) {
                                errMsg = errorBody.message;
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao ler corpo do erro:', e);
                    }
                    toast.error('Contrato salvo, mas erro ao enviar e-mail: ' + errMsg);
                } else {
                    toast.success('Contrato salvo e e-mail enviado ao cliente!');
                }
            } else {
                toast.success('Contrato salvo com sucesso!');
            }
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestNewSignature = async () => {
        const confirm = window.confirm(
            "Tem certeza de que deseja invalidar a assinatura atual deste contrato? O cliente precisará assinar novamente usando o mesmo link."
        );
        if (!confirm) return;

        setIsSaving(true);
        try {
            let updatedContent = '';
            if (editorRef.current) {
                let html = editorRef.current.innerHTML;
                const containerRegex = /<div\s+[^>]*id=["']client-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
                if (containerRegex.test(html)) {
                    html = html.replace(containerRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
                }
                editorRef.current.innerHTML = html;
                updatedContent = html;
            }

            const { error } = await supabase
                .from('rental_contracts')
                .update({
                    status: 'pendente',
                    signature_url: null,
                    signed_at: null,
                    client_ip: null,
                    client_user_agent: null,
                    client_name: null,
                    client_cpf: null,
                    ...(updatedContent ? { content: updatedContent } : {})
                })
                .eq('rental_id', reservation.id);

            if (error) throw error;

            toast.success('Assinatura invalidada com sucesso!');
            setContractStatus('pendente');
            setSignatureUrl(null);
            setSignedAt(null);
            setSignedInfo(null);
        } catch (err: any) {
            toast.error('Erro ao invalidar assinatura: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!editorRef.current) return;
        let content = editorRef.current.innerHTML;
        
        // Append a formal audit block if signed
        if (contractStatus === 'assinado' && signedInfo) {
            content += `
                <div style="margin-top: 40px; padding: 15px; border: 1px solid #10b981; background-color: #f0fdf4; border-radius: 8px; font-family: sans-serif; font-size: 10px; line-height: 1.4;">
                    <div style="color: #065f46; font-weight: bold; font-size: 11px; margin-bottom: 5px;">Histórico de Assinatura Eletrônica (Auditoria)</div>
                    <div style="color: #047857;">Assinante: <strong>${signedInfo.name}</strong></div>
                    <div style="color: #047857;">CPF Confirmado: <strong>${signedInfo.cpf}</strong></div>
                    <div style="color: #047857;">Endereço IP: <strong>${signedInfo.ip}</strong></div>
                    <div style="color: #047857;">Data/Hora: <strong>${signedAt ? new Date(signedAt).toLocaleString('pt-BR') : ''}</strong></div>
                    <div style="color: #047857; font-size: 8px; margin-top: 5px;">Medida Provisória nº 2.200-2/2001 (Validade Jurídica de Assinaturas Digitais)</div>
                </div>
            `;
        }

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <html>
                    <head>
                        <title>Contrato PÓS LEVE - ${client?.name}</title>
                        <style>
                            body { font-family: serif; padding: 40px; line-height: 1.6; color: #000; font-size: 12px; }
                            p { margin-bottom: 12px; text-align: justify; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>${content}</body>
                </html>
            `);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    const isSigned = contractStatus === 'assinado';

    return (
        <div className="fixed inset-0 z-[110] bg-slate-100 flex flex-col animate-in fade-in duration-300">
            <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight">Editor de Contrato</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                            {client?.name} • #{reservation.id.substring(0, 8)}
                            {isSigned && <span className="ml-2 text-emerald-600 dark:text-emerald-500 font-extrabold uppercase">● Assinado</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all">
                        <span className="material-symbols-outlined text-lg">print</span>
                        Imprimir
                    </button>
                    {isSigned && (
                        <button 
                            onClick={handleRequestNewSignature}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-sm transition-all shadow-lg disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">draw</span>
                            Solicitar Nova Assinatura
                        </button>
                    )}
                    {!isSigned && (
                        <div className="flex items-center gap-2 mr-2">
                            {client?.email ? (
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-450 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={sendEmail} 
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="rounded border-slate-300 text-primary focus:ring-primary size-4"
                                    />
                                    Enviar contrato/voucher por e-mail
                                </label>
                            ) : (
                                <span className="text-[10px] text-rose-500 font-bold uppercase">Sem e-mail cadastrado</span>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || isSigned} 
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg disabled:opacity-50 ${
                            isSigned 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-primary text-white hover:brightness-110'
                        }`}
                    >
                        {isSaving ? <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">save</span>}
                        {isSigned ? 'Contrato Assinado (Bloqueado)' : 'Salvar Contrato'}
                    </button>
                </div>
            </header>

            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-8 py-2 flex items-center gap-2 overflow-x-auto">
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
                    contentEditable={!isSigned}
                    className={`w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[5mm] sm:p-[20mm] outline-none prose prose-slate max-w-none ${isSigned ? 'cursor-not-allowed opacity-90 select-none' : ''}`}
                    style={{ fontFamily: 'serif', fontSize: '12px' }}
                />
            </div>

            {isLoading && (
                <div className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="size-10 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default ContractEditorView;