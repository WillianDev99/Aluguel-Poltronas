import React, { useState, useEffect } from 'react';
import { Client, Vehicle, Reservation, ReservationStatus, InsuranceItem, ProgressiveDiscount } from '../types';
import { reservationSchema } from '../schemas/reservation.schema';
import toast from 'react-hot-toast';
import Calendar from './Calendar';
import { supabase } from '../lib/supabase';
import { retryAsync } from '../utils/retry';

interface ReservationModalProps {
    clients: Client[];
    vehicles: Vehicle[];
    onClose: () => void;
    onSave: (reservation: Omit<Reservation, 'id' | 'clientName' | 'vehicleModel' | 'vehiclePlate' | 'dateStr' | 'created_at'>) => Promise<void>;
}

const ADDITIONAL_SERVICES = [
    { id: 'higienizacao', name: 'Higienização Avançada Extra', price: 50.00, type: 'fixed' },
    { id: 'travesseiro_ortopedico', name: 'Travesseiro Ortopédico de Apoio', price: 15.00, type: 'fixed' },
    { id: 'entrega_urgente', name: 'Entrega Expressa / Urgente', price: 40.00, type: 'fixed' },
];

const INSURANCE_COVERAGES = [
    "HIGIENIZAÇÃO COMPLETA ANTI-ALÉRGICA DE GRAU HOSPITALAR",
    "GARANTIA DE SUBSTITUIÇÃO EM CASO DE FALHA MECÂNICA EM ATÉ 12H",
    "ASSISTÊNCIA TÉCNICA E AJUSTES DE RECLINAÇÃO EM DOMICÍLIO",
    "ESTOFADO IMPERMEÁVEL COM TRATAMENTO ANTIBACTERIANO E ANTIFÚNGICO",
    "COBERTURA CONTRA DESGASTE NATURAL DE MOTORES E ARTICULAÇÕES",
    "TESTE DE SEGURANÇA E PARADAS DE EMERGÊNCIA REALIZADOS ANTES DA ENTREGA"
];

const getAvailableCountForPeriod = (pickupStr: string, returnStr: string, resList: any[]) => {
    if (!pickupStr || !returnStr) return 5;
    const S = new Date(pickupStr);
    const E = new Date(returnStr);
    if (E <= S) return 0;

    const sTime = S.getTime();
    const eTime = E.getTime();

    let currentOccupancy = 0;
    const events: { time: number; type: 'pickup' | 'return' }[] = [];

    const blockingResList = resList.filter(res => {
        return res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
    });

    for (const res of blockingResList) {
        const resPickup = new Date(res.pickup_date).getTime();
        const resReturn = new Date(res.return_date).getTime();

        const overlaps = sTime < resReturn && resPickup < eTime;
        if (!overlaps) continue;

        if (resPickup <= sTime && resReturn > sTime) {
            currentOccupancy++;
        }

        if (resPickup > sTime && resPickup < eTime) {
            events.push({ time: resPickup, type: 'pickup' });
        }
        if (resReturn > sTime && resReturn < eTime) {
            events.push({ time: resReturn, type: 'return' });
        }
    }

    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return a.type === 'return' ? -1 : 1;
    });

    let maxOccupancy = currentOccupancy;
    for (const event of events) {
        if (event.type === 'pickup') {
            currentOccupancy++;
        } else {
            currentOccupancy--;
        }
        if (currentOccupancy > maxOccupancy) {
            maxOccupancy = currentOccupancy;
        }
    }

    return Math.max(0, 5 - maxOccupancy);
};

const getOccupiedRangesForCalendar = (Q: number, resList: any[]) => {
    const ranges: { start: Date; end: Date }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentRangeStart: Date | null = null;
    let currentRangeEnd: Date | null = null;

    for (let i = 0; i < 180; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const midDay = new Date(d);
        midDay.setHours(12, 0, 0, 0);

        const avail = getAvailableCountForPeriod(midDay.toISOString(), new Date(midDay.getTime() + 1000).toISOString(), resList);

        if (avail < Q) {
            if (currentRangeStart === null) {
                currentRangeStart = d;
            }
            currentRangeEnd = d;
        } else {
            if (currentRangeStart !== null && currentRangeEnd !== null) {
                ranges.push({
                    start: new Date(currentRangeStart),
                    end: new Date(currentRangeEnd)
                });
                currentRangeStart = null;
                currentRangeEnd = null;
            }
        }
    }

    if (currentRangeStart !== null && currentRangeEnd !== null) {
        ranges.push({
            start: new Date(currentRangeStart),
            end: new Date(currentRangeEnd)
        });
    }

    return ranges;
};

const getAvailableVehicleForPeriod = (pickupStr: string, returnStr: string, resList: any[], allVehicles: Vehicle[]) => {
    const S = new Date(pickupStr).getTime();
    const E = new Date(returnStr).getTime();

    const reservedVehicleIds = new Set<string>();
    for (const res of resList) {
        const resPickup = new Date(res.pickup_date).getTime();
        const resReturn = new Date(res.return_date).getTime();
        const overlaps = S < resReturn && resPickup < E;
        // Non-blocking reservations (pending deposit) do not reduce pool availability
        const isBlocking = res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
        if (overlaps && isBlocking) {
            reservedVehicleIds.add(res.vehicle_id);
        }
    }

    return allVehicles.find(v => !reservedVehicleIds.has(v.id) && v.status !== 'Desativado');
};

const ReservationModal: React.FC<ReservationModalProps> = ({ clients, vehicles, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        client_id: '',
        vehicle_id: vehicles[0]?.id || '',
        pickup_date: '',
        return_date: '',
        base_rate: vehicles[0]?.daily_rate || 15,
        discount_percent: 0,
        security_deposit: vehicles[0]?.default_security_deposit || 400,
        insurance_value: 0,
        additional_services: '',
        status: ReservationStatus.AGUARDANDO
    });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [occupiedRanges, setOccupiedRanges] = useState<{ start: Date; end: Date }[]>([]);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [allReservations, setAllReservations] = useState<any[]>([]);

    const activeClients = clients.filter(c => c.status === 'Ativo');

    const fetchAllReservations = async () => {
        setIsLoadingAvailability(true);
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('id, vehicle_id, pickup_date, return_date, status, observations')
                .neq('status', 'reserva cancelada')
                .neq('status', 'reserva perdida')
                .neq('status', 'locação concluída');
            if (error) throw error;
            setAllReservations(data || []);
        } catch (err) {
            console.error('Error fetching reservations:', err);
        } finally {
            setIsLoadingAvailability(false);
        }
    };

    useEffect(() => {
        fetchAllReservations();
    }, []);

    useEffect(() => {
        if (vehicles.length > 0 && !formData.vehicle_id) {
            setFormData(prev => ({
                ...prev,
                vehicle_id: vehicles[0].id,
                base_rate: vehicles[0].daily_rate || 15,
                security_deposit: vehicles[0].default_security_deposit || 400
            }));
        }
    }, [vehicles]);

    useEffect(() => {
        const ranges = getOccupiedRangesForCalendar(1, allReservations);
        setOccupiedRanges(ranges);
    }, [allReservations]);

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServices(prev => 
            prev.includes(serviceId) 
                ? prev.filter(id => id !== serviceId) 
                : [...prev, serviceId]
        );
    };

    const calculateTotals = () => {
        if (!formData.pickup_date || !formData.return_date) return { days: 0, subtotal: 0, currentDailyRate: 0, servicesTotal: 0 };
        const pickup = new Date(formData.pickup_date);
        const returnD = new Date(formData.return_date);
        const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        const currentDailyRate = formData.base_rate;
        let subtotal = days * currentDailyRate;

        let servicesTotal = 0;
        selectedServices.forEach(serviceId => {
            const service = ADDITIONAL_SERVICES.find(s => s.id === serviceId);
            if (service) {
                if (service.type === 'fixed') {
                    servicesTotal += service.price;
                } else {
                    servicesTotal += service.price * days;
                }
            }
        });

        subtotal += servicesTotal; // Seguro agora é 0 (incluso)

        return { days, subtotal, currentDailyRate, servicesTotal };
    };

    const { days: currentDays, subtotal: currentSubtotal, currentDailyRate, servicesTotal } = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.pickup_date || !formData.return_date) {
            toast.error('Selecione um período no calendário.');
            return;
        }

        const { base_rate, discount_percent, ...cleanFormData } = formData;

        setIsSubmitting(true);
        try {
            // Verificar overlap de data na reserva unificada em tempo real
            const { data: activeRes, error: checkError } = await supabase
                .from('reservations')
                .select('id, vehicle_id, pickup_date, return_date, status, observations')
                .neq('status', 'reserva cancelada')
                .neq('status', 'reserva perdida')
                .neq('status', 'locação concluída');

            if (checkError) throw checkError;

            const resList = activeRes || [];
            const availableVehicle = getAvailableVehicleForPeriod(formData.pickup_date, formData.return_date, resList, vehicles);

            if (!availableVehicle) {
                toast.error('Infelizmente, todas as poltronas estão ocupadas neste período.');
                setIsSubmitting(false);
                return;
            }

            const dataToSave = {
                ...cleanFormData,
                vehicle_id: availableVehicle.id, // Mapeia para a cadeira física livre
                daily_rate: currentDailyRate,
                days: currentDays,
                total_value: currentSubtotal,
                insurance_value: 0, // Sempre 0 pois está incluso
                additional_services: selectedServices.join(', '),
                insurance_details: INSURANCE_COVERAGES.map(name => ({ name, value: 0, selected: true }))
            };

            const validation = reservationSchema.safeParse(dataToSave);
            if (!validation.success) {
                const firstError = validation.error.issues[0];
                toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
                setIsSubmitting(false);
                return;
            }

            await onSave(dataToSave);
            onClose();
        } catch (error: any) {
            console.error('Error saving reservation:', error);
            toast.error('Erro ao salvar reserva: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-20 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nova Reserva</h2>
                        <p className="text-sm text-slate-500 font-medium">Preencha os dados da nova locação</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Poltrona</label>
                            <select
                                required
                                disabled
                                className="w-full h-12 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white cursor-not-allowed"
                                value={formData.vehicle_id}
                            >
                                {vehicles.length > 0 && (
                                    <option value={vehicles[0].id}>
                                        {vehicles[0].model} (Pool de Estoque)
                                    </option>
                                )}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                            <select
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.client_id}
                                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                            >
                                <option value="">Selecione um cliente</option>
                                {activeClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.cpf}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de Locação</label>
                            <button
                                type="button"
                                disabled={!formData.vehicle_id || isLoadingAvailability}
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={`w-full h-12 flex items-center justify-between px-4 rounded-xl text-sm font-medium transition-all border
                                    ${!formData.vehicle_id ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white'}
                                    ${showCalendar ? 'ring-2 ring-primary/20 border-primary' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm opacity-60">calendar_month</span>
                                    <span>
                                        {formData.pickup_date
                                            ? `${formatDateTime(formData.pickup_date)} - ${formatDateTime(formData.return_date).split(' ')[1]}`
                                            : !formData.vehicle_id ? 'Selecione a poltrona' : 'Selecionar datas...'}
                                    </span>
                                </div>
                                {isLoadingAvailability && <span className="animate-spin material-symbols-outlined text-xs">progress_activity</span>}
                            </button>

                            {showCalendar && (
                                <div 
                                    className="fixed inset-0 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-[110] flex items-center justify-center sm:block p-4 sm:p-0 bg-slate-900/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            setShowCalendar(false);
                                        }
                                    }}
                                >
                                    <Calendar
                                        occupiedRanges={occupiedRanges}
                                        initialPickup={formData.pickup_date}
                                        initialReturn={formData.return_date}
                                        onClose={() => setShowCalendar(false)}
                                        onSelectRange={(start, end) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                pickup_date: start.toISOString(),
                                                return_date: end.toISOString()
                                            }));
                                            setShowCalendar(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Base Diária (R$)</label>
                            <input
                                type="number"
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.base_rate}
                                onChange={e => setFormData({ ...formData, base_rate: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Serviços e Acessórios Adicionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ADDITIONAL_SERVICES.map(service => (
                                <label 
                                    key={service.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedServices.includes(service.id) ? 'bg-primary/5 border-primary/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                            checked={selectedServices.includes(service.id)}
                                            onChange={() => handleServiceToggle(service.id)}
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{service.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-primary dark:text-accent-sunshine">
                                        R$ {service.price.toFixed(2)} {service.type === 'daily' ? '/dia' : ''}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Bloco Informativo: Garantia PÓS LEVE */}
                    <div className="space-y-4 p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <span className="material-symbols-outlined">verified_user</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">Garantia & Suporte PÓS LEVE</h3>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase">Proteção Hospitalar & Técnica Inclusa</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest">Incluso</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4">
                            {INSURANCE_COVERAGES.map((coverage, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5">check_circle</span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight uppercase">{coverage}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caução (R$)</label>
                            <input
                                type="number"
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.security_deposit}
                                onChange={e => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                            />
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Subtotal Final</label>
                            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSubtotal)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-emerald-600/60 font-medium">
                                    Diárias ({currentDays}x): {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentDays * currentDailyRate)}
                                </span>
                                {servicesTotal > 0 && (
                                    <span className="text-[10px] text-primary/60 font-medium">
                                        Adicionais: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servicesTotal)}
                                    </span>
                                )}
                                <span className="text-[10px] text-emerald-600 font-bold">
                                    Garantia & Suporte PÓS LEVE: Incluso (R$ 0,00)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-10 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    <span>Confirmar Reserva</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationModal;