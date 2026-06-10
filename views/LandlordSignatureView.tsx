import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import toast from 'react-hot-toast';

const LandlordSignatureView: React.FC = () => {
    const { profile } = useApp();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    
    // Canvas drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDrawn, setIsDrawn] = useState(false);

    // Initialize and size the canvas
    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#1b4e52'; // primary color (teal escuro)
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    // Load existing signature on mount or when profile is available
    useEffect(() => {
        const loadSignature = async () => {
            if (!profile?.id) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('signature_url')
                    .eq('id', profile.id)
                    .single();

                if (error) throw error;
                if (data && data.signature_url) {
                    setSignatureUrl(data.signature_url);
                }
            } catch (err) {
                console.error('Erro ao carregar assinatura do locador:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadSignature();
    }, [profile?.id]);

    // Setup canvas resizing hook
    useEffect(() => {
        if (!isLoading && !signatureUrl) {
            setTimeout(initializeCanvas, 100);
            window.addEventListener('resize', initializeCanvas);
        }
        return () => {
            window.removeEventListener('resize', initializeCanvas);
        };
    }, [isLoading, signatureUrl]);

    // Canvas drawing helper coordinates
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

    const handleSaveSignature = async () => {
        if (!profile?.id || !canvasRef.current) return;
        
        if (!isDrawn) {
            toast.error('Por favor, desenhe sua assinatura no quadro.');
            return;
        }

        setIsSaving(true);
        try {
            const signatureBase64 = canvasRef.current.toDataURL('image/png');

            const { error } = await supabase
                .from('profiles')
                .update({ signature_url: signatureBase64 })
                .eq('id', profile.id);

            if (error) throw error;

            toast.success('Assinatura do locador salva com sucesso!');
            setSignatureUrl(signatureBase64);
        } catch (err: any) {
            console.error('Erro ao salvar assinatura:', err);
            toast.error('Erro ao salvar assinatura: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetSignature = async () => {
        const confirm = window.confirm(
            "Deseja excluir a assinatura cadastrada? Ela deixará de ir nos novos contratos de clientes."
        );
        if (!confirm) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ signature_url: null })
                .eq('id', profile?.id);

            if (error) throw error;

            toast.success('Assinatura removida com sucesso.');
            setSignatureUrl(null);
            setIsDrawn(false);
        } catch (err: any) {
            console.error('Erro ao remover assinatura:', err);
            toast.error('Erro ao remover assinatura: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 sm:p-8 flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-10 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">Carregando assinatura...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        Assinatura do Locador
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                        Desenhe sua assinatura digital abaixo. Ela será inserida automaticamente na linha de **Locadora** nos contratos gerados para seus clientes.
                    </p>
                </div>

                {signatureUrl ? (
                    // Signature Preview Screen
                    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 flex flex-col items-center justify-center gap-6 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assinatura Ativa Cadastrada</p>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center min-h-28 max-w-md w-full">
                            <img 
                                src={signatureUrl} 
                                alt="Assinatura Locador" 
                                className="h-20 w-auto object-contain"
                            />
                        </div>

                        <div className="flex gap-3 w-full max-w-md">
                            <button
                                onClick={handleResetSignature}
                                disabled={isSaving}
                                className="flex-1 py-3 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50/30 rounded-xl font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Excluir Assinatura
                            </button>
                        </div>
                    </div>
                ) : (
                    // Signature Canvas Screen
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                Quadro de Desenho
                            </label>
                            <button 
                                type="button" 
                                onClick={clearCanvas}
                                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold uppercase tracking-wide flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs leading-none">delete</span>
                                Limpar Quadro
                            </button>
                        </div>

                        <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 overflow-hidden h-48 sm:h-56 shadow-inner">
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
                                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1.5">Assine aqui usando o mouse ou o dedo</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSaveSignature}
                            disabled={isSaving || !isDrawn}
                            className="w-full py-3.5 bg-primary hover:brightness-110 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-xs tracking-wide uppercase"
                        >
                            {isSaving ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    <span>Salvar Assinatura do Locador</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LandlordSignatureView;
