import React, { useState } from 'react';
import { Vehicle, Reservation, Client } from '../types';
import { vehicleSchema } from '../schemas/vehicle.schema';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { supabase } from '../lib/supabase';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  reservations: Reservation[];
  clients: Client[];
  isLoading?: boolean;
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
}

const initialState: Omit<Vehicle, 'id'> = {
  plate: '',
  brand: '',
  model: '',
  year: 2024,
  category: '',
  km: 0,
  status: 'Disponível',
  color: '',
  passengers: 5,
  doors: 4,
  transmission: 'Manual',
  renavan: '',
  chassis: '',
  default_security_deposit: 0,
  default_insurance_value: 0,
  daily_rate: 0,
  image_url: null
};

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  return `/${url}`;
};

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

const VehiclesView: React.FC<VehiclesViewProps> = ({ 
  vehicles = [], 
  reservations = [], 
  clients = [], 
  onAddVehicle, 
  onUpdateVehicle, 
  onDeleteVehicle, 
  isLoading 
}) => {
  const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>(initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);

  // Availability simulation states
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [checkDates, setCheckDates] = useState({ start: '', end: '' });
  const [checkResult, setCheckResult] = useState<number | null>(null);

  // Date allocation report state
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReservations = async () => {
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
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchReservations();
  }, []);

  const handleCheckAvailability = () => {
    if (!checkDates.start || !checkDates.end) {
      toast.error('Preencha as datas de início e fim da consulta.');
      return;
    }
    const count = getAvailableCountForPeriod(checkDates.start, checkDates.end, allReservations);
    setCheckResult(count);
  };

  const handleEdit = (v: Vehicle) => {
    const { id, ...data } = v;
    setFormData({
      ...initialState,
      ...data,
      renavan: !data.renavan || data.renavan === 'SEM_RENAVAN' ? '' : data.renavan,
      chassis: !data.chassis || data.chassis.includes('SEM_CHASSIS') ? '' : data.chassis,
      daily_rate: data.daily_rate || 0,
      image_url: data.image_url || null
    });
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialState);
    setEditingId(null);
    setAttachedImage(null);
  };

  const uploadFile = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = vehicleSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      const fieldLabels: Record<string, string> = {
        plate: 'Número de Série',
        brand: 'Marca',
        model: 'Modelo',
        year: 'Ano',
        category: 'Categoria',
        km: 'Locações Acumuladas',
        status: 'Status',
        color: 'Cor / Revestimento',
        passengers: 'Suporte de Peso',
        doors: 'Reclinação Máxima',
        transmission: 'Tipo de Acionamento',
        renavan: 'Dimensões (LxAxP)',
        chassis: 'Recursos Adicionais',
        default_security_deposit: 'Caução Padrão',
        default_insurance_value: 'Seguro Padrão',
        daily_rate: 'Diária Padrão',
        image_url: 'Imagem'
      };
      const pathKey = String(firstError.path[0]);
      const friendlyName = fieldLabels[pathKey] || pathKey;
      toast.error(`${friendlyName}: ${firstError.message}`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Salvando especificações...');

    try {
      const finalData = { ...formData };
      
      if (attachedImage) {
        finalData.image_url = await uploadFile(attachedImage);
      }

      if (editingId) {
        // Sync specifications across all 5 vehicles in a loop
        const promises = vehicles.map(v => onUpdateVehicle(v.id, {
          brand: finalData.brand,
          model: finalData.model,
          year: finalData.year,
          category: finalData.category,
          color: finalData.color,
          transmission: finalData.transmission,
          renavan: finalData.renavan,
          chassis: finalData.chassis,
          passengers: finalData.passengers,
          doors: finalData.doors,
          daily_rate: finalData.daily_rate,
          default_security_deposit: finalData.default_security_deposit,
          default_insurance_value: finalData.default_insurance_value,
          image_url: finalData.image_url
        }));
        await Promise.all(promises);
      } else {
        await onAddVehicle(finalData);
      }
      
      toast.success('Poltrona salva com sucesso!', { id: loadingToast });
      handleCloseModal();
    } catch (err: any) {
      console.error("Erro ao salvar poltrona:", err);
      toast.error('Erro ao salvar poltrona: ' + (err.message || 'Falha na conexão'), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-primary dark:text-white text-3xl font-black tracking-tight font-display">Acervo de Poltronas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie a disponibilidade do pool de estoque e especificações do modelo único</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition active:scale-95 shadow-sm"
        >
          + Adicionar Unidade
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          {/* Featured Model Catalog Representation */}
          {vehicles && vehicles.length > 0 && (
            (() => {
              const featured = vehicles[0]; // Reference for specs
              const availableUnits = vehicles.filter(v => v.status === 'Disponível').length;
              
              return (
                <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg mb-12 p-4 sm:p-8 max-w-5xl">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Image */}
                    <div className="w-full md:w-1/3 aspect-video md:aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                      {featured.image_url ? (
                        <img src={getImageUrl(featured.image_url)} alt={featured.model} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-5xl">chair</span>
                        </div>
                      )}
                      <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                        {featured.category}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-6">
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{featured.model}</h3>
                          <button
                            onClick={() => handleEdit(featured)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider transition-all flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Editar Especificações
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{featured.brand} • Cor: {featured.color || 'Bege/Marrom'}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase">Estoque Pool</p>
                          <p className="text-lg font-black text-primary dark:text-white">{vehicles.length} Unidades</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase">Disponíveis Hoje</p>
                          <p className="text-lg font-black text-emerald-600">{availableUnits} livres</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase">Valor Diária</p>
                          <p className="text-lg font-black text-primary dark:text-white">R$ {(featured.daily_rate || 15).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase">Caução Reembolsável</p>
                          <p className="text-lg font-black text-primary dark:text-white">R$ {(featured.default_security_deposit || 400).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-655 dark:text-slate-400">
                        <p>
                          <strong>Recursos:</strong> {!featured.chassis || featured.chassis.includes('SEM_CHASSIS') ? 'Controle remoto, Reclinável 160°' : featured.chassis}
                        </p>
                        <p>
                          <strong>Dimensões:</strong> {!featured.renavan || featured.renavan.includes('SEM_RENAVAN') ? '85 x 90 x 105 cm' : featured.renavan}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Physical Units Grid Dashboard */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 font-display">Painel de Controle de Unidades Físicas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {vehicles && vehicles.map((v) => (
                <div 
                  key={v.id} 
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-600 dark:text-slate-400">{v.plate}</span>
                      <span className={`size-2.5 rounded-full ${v.status === 'Disponível' ? 'bg-green-500 animate-pulse' :
                        v.status === 'Alugado' ? 'bg-red-500' :
                        v.status === 'Reservado' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}></span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Nº de Série / Patrimônio</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      v.status === 'Disponível' ? 'bg-green-50 dark:bg-green-950/20 text-green-700' :
                      v.status === 'Alugado' ? 'bg-red-50 dark:bg-red-950/20 text-red-700' :
                      v.status === 'Reservado' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700' :
                      'bg-blue-50 dark:bg-blue-950/20 text-blue-700'
                    }`}>
                      {v.status === 'Em manutenção' ? 'Higienização' : v.status}
                    </span>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === v.id ? null : v.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                      </button>

                      {activeMenu === v.id && (
                        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-150">
                          <button
                            onClick={async () => {
                              await onUpdateVehicle(v.id, { status: 'Disponível' });
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Disponível
                          </button>
                          <button
                            onClick={async () => {
                              await onUpdateVehicle(v.id, { status: 'Em manutenção' });
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-750 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                          >
                            <span className="material-symbols-outlined text-sm">cleaning_services</span>
                            Higienização
                          </button>
                          <div className="h-px bg-slate-150 dark:bg-slate-700 my-1" />
                          <button
                            onClick={async () => {
                              if (window.confirm('Tem certeza que deseja excluir esta unidade física?')) {
                                await onDeleteVehicle(v.id);
                                setActiveMenu(null);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Excluir Unidade
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Allocation Report By Date */}
          <div className="mb-12 bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-secondary font-bold">assignment</span>
                  Relatório de Alocação por Data
                </h4>
                <p className="text-xs text-slate-500 mt-1">Consulte o status detalhado de alocação de cada poltrona em uma data específica.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Selecione o Dia:</span>
                <input 
                  type="date"
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-primary/20"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5">
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poltrona (Nº de Série)</th>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status no Dia</th>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Período de Locação</th>
                    <th className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Caução</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vehicles.map((v, index) => {
                    // Find active overlapping reservation on reportDate
                    const res = (() => {
                      if (!reportDate) return null;
                      const targetDateMid = new Date(reportDate + 'T12:00:00');
                      return reservations.find(r => 
                        r.vehicle_id === v.id &&
                        r.status !== 'reserva cancelada' &&
                        r.status !== 'reserva perdida' &&
                        new Date(r.pickup_date) <= targetDateMid &&
                        new Date(r.return_date) >= targetDateMid
                      );
                    })();

                    let statusLabel = 'Livre';
                    let statusClass = 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200';
                    
                    if (res) {
                      if (res.status === 'locação em uso') {
                        statusLabel = 'Entregue / Em Uso';
                        statusClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200';
                      } else if (res.status === 'aguardando retirada') {
                        statusLabel = 'Reservada (Aguardando Entrega)';
                        statusClass = 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200';
                      } else if (res.status === 'locação concluída') {
                        statusLabel = 'Concluída';
                        statusClass = 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200';
                      }
                    } else if (v.status === 'Em manutenção') {
                      statusLabel = 'Higienização';
                      statusClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-green-400 border-blue-250';
                    }
                    
                    const isPaid = res?.observations?.includes('[CAUCAO_PAGO]');
                    const rowBg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/10';
                    
                    return (
                      <tr key={v.id} className={`${rowBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/25 transition-colors`}>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{v.plate}</td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border text-[10px] uppercase ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {res ? res.clientName : '—'}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {res ? `${new Date(res.pickup_date).toLocaleDateString('pt-BR')} a ${new Date(res.return_date).toLocaleDateString('pt-BR')}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {res ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${
                              isPaid 
                                ? 'bg-emerald-50 text-emerald-750 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' 
                                : 'bg-amber-50 text-amber-750 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200'
                            }`}>
                              {isPaid ? 'Pago' : 'Pendente'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Availability Simulator Checker */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl mb-12 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-secondary font-bold">event_available</span>
              Simulador de Disponibilidade de Estoque
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Data de Início</span>
                <input 
                  type="date"
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white font-bold"
                  value={checkDates.start}
                  onChange={e => setCheckDates({ ...checkDates, start: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Data de Fim</span>
                <input 
                  type="date"
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white font-bold"
                  value={checkDates.end}
                  onChange={e => setCheckDates({ ...checkDates, end: e.target.value })}
                />
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button 
                onClick={handleCheckAvailability}
                className="px-5 py-2.5 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-primary/10"
              >
                Consultar Disponibilidade
              </button>
              
              {checkResult !== null && (
                <div className="text-xs font-bold flex items-center gap-2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-xl">
                  <span className={`size-2.5 rounded-full ${checkResult > 0 ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkResult > 0 
                      ? `${checkResult} de 5 poltronas livres para o período.` 
                      : 'Sem estoque disponível para o período.'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 dark:border-gray-800 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-primary dark:text-white">
                {editingId ? 'Editar Poltrona' : 'Cadastro de Nova Poltrona'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-red-500 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="p-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Foto da Poltrona */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Foto da Poltrona</label>
                  <div className="flex items-center gap-6">
                    <div className="size-32 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                      {attachedImage ? (
                        <img src={URL.createObjectURL(attachedImage)} className="w-full h-full object-cover" />
                      ) : formData.image_url ? (
                        <img src={getImageUrl(formData.image_url)} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                      )}
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={(e) => setAttachedImage(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Clique no quadro ao lado para selecionar uma imagem.</p>
                      <p className="text-[10px] text-slate-400">Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fabricante / Marca</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: ComfortLux"
                    type="text"
                    required
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Modelo da Poltrona</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: Reclinável Premium Elétrica"
                    type="text"
                    required
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nº de Série (Patrimônio)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3 font-mono"
                    placeholder="Ex: CC-1001"
                    type="text"
                    required
                    maxLength={10}
                    value={formData.plate}
                    onChange={e => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      setFormData({ ...formData, plate: value });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ano de Fabricação</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="YYYY"
                    type="number"
                    required
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categoria</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="Reclinável Elétrica">Reclinável Elétrica</option>
                    <option value="Elevação Manual">Elevação Manual</option>
                    <option value="Luxo com Massageador">Luxo com Massageador</option>
                    <option value="Infantil / Pediátrica">Infantil / Pediátrica</option>
                    <option value="Básica">Básica</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cor / Revestimento</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: Couro Sintético Bege"
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Uso Acumulado (Locações)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="text"
                    value={new Intl.NumberFormat('pt-BR').format(formData.km)}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, km: Number(rawValue) });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    required
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Disponível">Disponível</option>
                    <option value="Alugado">Alugado</option>
                    <option value="Reservado">Reservado</option>
                    <option value="Em manutenção">Em higienização</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Acionamento</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    value={formData.transmission}
                    onChange={e => setFormData({ ...formData, transmission: e.target.value as any })}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automático">Elétrico</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dimensões (LxAxP)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: 85 x 90 x 105 cm"
                    type="text"
                    value={formData.renavan}
                    onChange={e => setFormData({ ...formData, renavan: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recursos Adicionais</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: Controle remoto, Massageador, Bivolt"
                    type="text"
                    value={formData.chassis}
                    onChange={e => setFormData({ ...formData, chassis: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suporte de Peso (kg) / Reclinação Máxima (°)</label>
                  <div className="flex gap-2">
                    <input
                      className="w-1/2 h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                      type="number"
                      placeholder="Capacidade (kg) (Ex: 150)"
                      value={formData.passengers}
                      onChange={e => setFormData({ ...formData, passengers: Number(e.target.value) })}
                    />
                    <input
                      className="w-1/2 h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                      type="number"
                      placeholder="Reclinação (°) (Ex: 180)"
                      value={formData.doors}
                      onChange={e => setFormData({ ...formData, doors: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Caução Padrão (R$)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="number"
                    required
                    value={formData.default_security_deposit}
                    onChange={e => setFormData({ ...formData, default_security_deposit: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Taxa de Higienização Padrão (R$)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="number"
                    required
                    value={formData.default_insurance_value}
                    onChange={e => setFormData({ ...formData, default_insurance_value: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Valor da Diária Padrão (R$)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="number"
                    required
                    value={formData.daily_rate}
                    onChange={e => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="animate-spin material-symbols-outlined">progress_activity</span>
                  ) : (
                    <span>{editingId ? 'Salvar Alterações' : 'Salvar Poltrona'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesView;