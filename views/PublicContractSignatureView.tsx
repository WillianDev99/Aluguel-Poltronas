import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Reservation, Client } from '../types';
import toast from 'react-hot-toast';

const PublicContractSignatureView: React.FC = () => {
    const { contractId } = useParams<{ contractId: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [contract, setContract] = useState<any>(null);
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [landlordSigUrl, setLandlordSigUrl] = useState<string | null>(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDrawn, setIsDrawn] = useState(false);
    const [ipAddress, setIpAddress] = useState('0.0.0.0');

    // Fetch client IP on mount
    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                if (data.ip) {
                    setIpAddress(data.ip);
                }
            } catch (err) {
                console.warn('Erro ao obter IP público:', err);
            }
        };
        fetchIp();
    }, []);

    // Set up canvas sizing
    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#0f172a'; // slate-900
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    useEffect(() => {
        if (!isLoading && contract && contract.status === 'pendente') {
            // Wait a brief tick for the container to render before initializing canvas
            setTimeout(initializeCanvas, 100);
            window.addEventListener('resize', initializeCanvas);
        }
        return () => {
            window.removeEventListener('resize', initializeCanvas);
        };
    }, [isLoading, contract]);

    useEffect(() => {
        const loadContractData = async () => {
            if (!contractId) return;
            setIsLoading(true);
            try {
                // 1. Fetch Contract
                const { data: savedContract, error: contractErr } = await supabase
                    .from('rental_contracts')
                    .select('*')
                    .eq('rental_id', contractId)
                    .maybeSingle();

                if (contractErr) throw contractErr;
                if (!savedContract) {
                    setIsLoading(false);
                    return;
                }

                setContract(savedContract);

                // 2. Fetch Reservation
                const { data: resData, error: resErr } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('id', contractId)
                    .single();

                if (resErr) throw resErr;
                setReservation(resData);

                // 3. Fetch Client
                const { data: clientData, error: clientErr } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', resData.client_id)
                    .single();

                if (clientErr) throw clientErr;
                setClient(clientData);
                setFullName(clientData.name || '');
                setCpf('');

                // 4. Fetch Landlord Signature
                const { data: landlordData } = await supabase
                    .from('profiles')
                    .select('signature_url')
                    .not('signature_url', 'is', null)
                    .limit(1)
                    .maybeSingle();
                if (landlordData?.signature_url) {
                    setLandlordSigUrl(landlordData.signature_url);
                }

            } catch (err) {
                console.error('Erro ao carregar dados do contrato:', err);
                toast.error('Não foi possível carregar as informações do contrato.');
            } finally {
                setIsLoading(false);
            }
        };

        loadContractData();
    }, [contractId]);

    const getCoordinates = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return {
                x: e.changedTouches[0].clientX - rect.left,
                y: e.changedTouches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e.nativeEvent);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const handleDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e.nativeEvent);
        ctx.lineTo(x, y);
        ctx.stroke();
        setIsDrawn(true);
    };

    const handleStopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsDrawn(false);
    };

    // CPF formatter
    const formatCPF = (val: string) => {
        return val
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .substring(0, 14);
    };

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCpf(formatCPF(e.target.value));
    };

    const handleSubmitSignature = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractId || !canvasRef.current) return;

        if (!fullName.trim()) {
            toast.error('Por favor, informe seu nome completo.');
            return;
        }

        if (cpf.length < 14) {
            toast.error('Por favor, informe um CPF válido.');
            return;
        }

        if (!isDrawn) {
            toast.error('Por favor, desenhe sua assinatura no quadro.');
            return;
        }

        setIsSubmitting(true);
        try {
            const signatureBase64 = canvasRef.current.toDataURL('image/png');

            const { error } = await supabase
                .from('rental_contracts')
                .update({
                    status: 'assinado',
                    signed_at: new Date().toISOString(),
                    signature_url: signatureBase64,
                    client_ip: ipAddress,
                    client_user_agent: navigator.userAgent,
                    client_name: fullName,
                    client_cpf: cpf
                })
                .eq('rental_id', contractId);

            if (error) throw error;

            toast.success('Contrato assinado digitalmente com sucesso!');
            
            // Reload contract data to show signed status page
            const { data: updatedContract } = await supabase
                .from('rental_contracts')
                .select('*')
                .eq('rental_id', contractId)
                .single();
            setContract(updatedContract);

        } catch (err: any) {
            console.error('Erro ao salvar assinatura:', err);
            toast.error('Erro ao assinar contrato: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">Carregando contrato...</p>
                </div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-4">
                    <span className="material-symbols-outlined text-rose-500 text-6xl">gpp_maybe</span>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Contrato não encontrado</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">O link de assinatura acessado é inválido ou o contrato não está mais disponível.</p>
                </div>
            </div>
        );
    }

    const getRenderedContent = () => {
        if (!contract) return '';
        let html = contract.content;
        const containerRegex = /<div\s+[^>]*id=["']client-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
        const divRegex = /<div\s+style="height:\s*50px;?\s*">([\s\S]*?)<\/div>/i;
        const locatarioRegex = /(<div\s+style="text-align:\s*center;\s*width:\s*45%;?"\s*>\s*)(<div\s+style="border-top:\s*1px\s+solid\s+black;[^>]*><\/div>\s*<div[^>]*>(?:(?!<\/div>\s*<div)[\s\S])*?<\/div>\s*<div[^>]*>\s*Locat[áa]rio\s*<\/div>)/i;

        const landlordContainerRegex = /<div\s+[^>]*id=["']landlord-signature-container["'][^>]*>(?:<div[^>]*>[\s\S]*?<\/div>|[\s\S])*?<\/div>(?:\s*<\/div>)?/i;
        const locadoraRegex = /(<div\s+style="text-align:\s*center;\s*width:\s*45%;?"\s*>\s*)(<div\s+style="border-top:\s*1px\s+solid\s+black;[^>]*><\/div>\s*<div[^>]*>(?:(?!<\/div>\s*<div)[\s\S])*?<\/div>\s*<div[^>]*>\s*Locadora\s*<\/div>)/i;

        // Process client signature
        if (contract.status === 'assinado' && contract.signature_url) {
            const imgTag = `<img src="${contract.signature_url}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />`;
            
            if (containerRegex.test(html)) {
                html = html.replace(containerRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>`);
            } else if (divRegex.test(html)) {
                html = html.replace(divRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>`);
            } else if (locatarioRegex.test(html)) {
                html = html.replace(locatarioRegex, `$1<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${imgTag}</div>$2`);
            }
        } else {
            // Pending, replace container content with empty spacer
            if (containerRegex.test(html)) {
                html = html.replace(containerRegex, `<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
            } else if (locatarioRegex.test(html)) {
                html = html.replace(locatarioRegex, `$1<div id="client-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>$2`);
            }
        }

        // Process landlord signature
        if (landlordSigUrl) {
            const landlordImgTag = `<img src="${landlordSigUrl}" style="height: 60px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />`;
            if (landlordContainerRegex.test(html)) {
                html = html.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>`);
            } else if (locadoraRegex.test(html)) {
                html = html.replace(locadoraRegex, `$1<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;">${landlordImgTag}</div>$2`);
            }
        } else {
            if (landlordContainerRegex.test(html)) {
                html = html.replace(landlordContainerRegex, `<div id="landlord-signature-container" style="text-align: center; min-height: 50px; margin-bottom: -15px;"></div>`);
            }
        }

        return html;
    };

    const isSigned = contract.status === 'assinado';

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#111d1e] text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-3xl space-y-6">
                
                {/* Header Logo */}
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/50">
                        <img 
                            src="/posleve_logo_emblem.png" 
                            alt="Logo Pós Leve" 
                            className="h-10 w-auto object-contain"
                            onError={(e) => {
                                // Fallback if image doesn't exist
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">
                        PÓS LEVE - Assinatura Digital
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">Fortaleza - Ceará</p>
                </div>

                {/* Status Alert Banner */}
                {isSigned ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 flex items-start gap-4">
                        <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
                        <div className="space-y-1">
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-400 text-sm">Contrato Assinado Digitalmente</h3>
                            <p className="text-xs text-emerald-700 dark:text-emerald-500 leading-relaxed">
                                Este documento foi formalizado em <strong>{new Date(contract.signed_at).toLocaleDateString('pt-BR')} às {new Date(contract.signed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>.
                            </p>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-550/80 pt-2 font-mono space-y-0.5">
                                <div>Nome: {contract.client_name}</div>
                                <div>CPF: {contract.client_cpf}</div>
                                <div>IP: {contract.client_ip}</div>
                                <div>Assinatura Hash ID: #{contract.id.substring(0, 8).toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-600 animate-pulse">pending_actions</span>
                        <div className="text-xs text-amber-800 dark:text-amber-400 font-semibold">
                            Aguardando a sua assinatura. Por favor, leia os termos e assine no campo indicado abaixo.
                        </div>
                    </div>
                )}

                {/* Brief Summary Card */}
                {reservation && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Locatário</span>
                            <span className="font-bold text-slate-900 dark:text-white truncate block">{client?.name}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Equipamento</span>
                            <span className="font-bold text-slate-900 dark:text-white block">Poltrona Lift Premium</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Período</span>
                            <span className="font-bold text-slate-900 dark:text-white block">
                                {new Date(reservation.pickup_date).toLocaleDateString('pt-BR')} a {new Date(reservation.return_date).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor do Aluguel</span>
                            <span className="font-bold text-slate-900 dark:text-white block">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.total_value)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Paper-like Contract Body */}
                <div className="bg-white dark:bg-slate-850 p-6 md:p-10 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-lg relative overflow-hidden">
                    {/* Top stamp */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800/40 rounded-bl-full flex items-center justify-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-200 dark:text-slate-750 text-4xl -rotate-12">gavel</span>
                    </div>

                    <div 
                        className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-justify space-y-4 font-serif text-slate-800 dark:text-slate-200"
                        dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
                    />

                    {/* Integrated Signature rods in document */}
                    {isSigned && contract.signature_url && (
                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
                            <div>
                                <div className="h-16 flex items-center justify-center">
                                    {landlordSigUrl ? (
                                        <img 
                                            src={landlordSigUrl} 
                                            alt="Assinatura da Locadora" 
                                            className="h-16 w-auto object-contain max-w-full"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-500 italic">
                                            [Assinado Eletronicamente]
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-slate-300 dark:border-slate-700 pt-1 font-bold">PÓS LEVE</div>
                                <div className="text-[10px] text-slate-450 uppercase">Locadora</div>
                            </div>
                            <div>
                                <div className="h-16 flex items-center justify-center">
                                    <img 
                                        src={contract.signature_url} 
                                        alt="Assinatura do Locatário" 
                                        className="h-16 w-auto object-contain max-w-full"
                                    />
                                </div>
                                <div className="border-t border-slate-300 dark:border-slate-700 pt-1 font-bold">{contract.client_name}</div>
                                <div className="text-[10px] text-slate-450 uppercase">Locatário</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Signature Panel Form (Pending only) */}
                {!isSigned && (
                    <form onSubmit={handleSubmitSignature} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
                            Assinar Documento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nome Completo</label>
                                <input 
                                    type="text" 
                                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Digite seu nome completo"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Confirme seu CPF</label>
                                <input 
                                    type="text" 
                                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                                    value={cpf}
                                    onChange={handleCpfChange}
                                    placeholder="000.000.000-00"
                                    required
                                />
                            </div>
                        </div>

                        {/* Signature Canvas Box */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Desenhe sua Assinatura</label>
                                <button 
                                    type="button" 
                                    onClick={clearCanvas}
                                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold uppercase tracking-wide flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-xs leading-none">delete</span>
                                    Limpar Quadro
                                </button>
                            </div>
                            
                            <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden h-44 shadow-inner">
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleStartDrawing}
                                    onMouseMove={handleDrawing}
                                    onMouseUp={handleStopDrawing}
                                    onMouseLeave={handleStopDrawing}
                                    onTouchStart={handleStartDrawing}
                                    onTouchMove={handleDrawing}
                                    onTouchEnd={handleStopDrawing}
                                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                                />
                                
                                {!isDrawn && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 dark:text-slate-600">
                                        <span className="material-symbols-outlined text-3xl">draw</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">Escreva sua assinatura aqui</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audit information footnote */}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                            <span>IP Auditoria: {ipAddress}</span>
                            <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
                        </div>

                        {/* Action buttons */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm tracking-wide uppercase"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">border_color</span>
                                    <span>Assinar Contrato Digitalmente</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer Info */}
                <div className="text-center text-[10px] text-slate-400/80 leading-relaxed py-6">
                    <div>PÓS LEVE - Soluções de Cuidado Pós-Operatório</div>
                    <div>Este sistema utiliza assinatura digital com validade jurídica de acordo com o art. 10, § 2º, da Medida Provisória nº 2.200-2/2001.</div>
                </div>

            </div>
        </div>
    );
};

export default PublicContractSignatureView;
