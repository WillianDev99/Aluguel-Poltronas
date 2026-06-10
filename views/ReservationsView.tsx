import React, { useState, Suspense } from 'react';
import { Reservation, ReservationStatus, VehicleChecklist, Client, Vehicle } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import EditReservationModal from '../components/EditReservationModal';

// Carregamento preguiçoso para evitar que erros no editor quebrem a lista
const ContractEditorView = React.lazy(() => import('./ContractEditorView'));

const INSPECTION_SLOTS = [
  { id: 'est_assento', label: 'Assento e Encosto (Estofado)', group: 'Aparência' },
  { id: 'est_laterais', label: 'Laterais e Apoios de Braço', group: 'Aparência' },
  { id: 'mec_motor', label: 'Motor, Controle e Cabos', group: 'Funcionamento' },
  { id: 'mec_rodas', label: 'Estrutura Metálica e Rodas/Pés', group: 'Funcionamento' },
  { id: 'hig_capa', label: 'Capa Protetora Impermeável', group: 'Higiene & Acessórios' },
  { id: 'hig_selo', label: 'Selo/Plástico de Sanitização', group: 'Higiene & Acessórios' },
];

interface ReservationsViewProps {
  reservations: Reservation[];
  clients: Client[];
  vehicles: Vehicle[];
  isLoading?: boolean;
  onEmitVoucher: (res: Reservation) => void;
  onAddReservation: (res: Omit<Reservation, 'id'>) => Promise<void>;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  onDeleteReservation: (id: string) => Promise<void>;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<void>;
}

const ReservationsView: React.FC<ReservationsViewProps> = ({
  reservations,
  clients,
  vehicles,
  onEmitVoucher,
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
  onUpdateVehicle,
  isLoading
}) => {
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [processingPickupRes, setProcessingPickupRes] = useState<Reservation | null>(null);
  const [processingReturnRes, setProcessingReturnRes] = useState<Reservation | null>(null);
  const [viewingReportRes, setViewingReportRes] = useState<Reservation | null>(null);
  const [editingContractRes, setEditingContractRes] = useState<Reservation | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedResId, setExpandedResId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Record<string, { status: string }>>({});

  const fetchContracts = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rental_contracts')
        .select('rental_id, status');
      if (error) throw error;
      
      const contractMap: Record<string, { status: string }> = {};
      data?.forEach((c: any) => {
        contractMap[c.rental_id] = { status: c.status || 'pendente' };
      });
      setContracts(contractMap);
    } catch (err) {
      console.error('Erro ao buscar status dos contratos:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchContracts();
  }, [reservations, fetchContracts]);

  const getFriendlyStatus = (status: string) => {
    switch (status) {
      case 'aguardando retirada': return 'Aguardando Entrega';
      case 'locação em uso': return 'Em Uso';
      case 'locação concluída': return 'Concluída';
      case 'reserva cancelada': return 'Cancelada';
      case 'reserva perdida': return 'Perdida';
      default: return status;
    }
  };

  const filteredReservations = reservations.filter(res => {
    const matchesSearch = !searchQuery ||
      res.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.vehicleModel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || res.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return date; }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aguardando retirada': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
      case 'locação em uso': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
      case 'locação concluída': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      case 'reserva cancelada':
      case 'reserva perdida': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 material-symbols-outlined">search</span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                placeholder="Buscar por cliente, poltrona ou nº de série..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button onClick={() => setStatusFilter(null)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${!statusFilter ? 'bg-primary/10 text-primary dark:text-accent-sunshine border-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              <span>Todos os Status</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {['AGUARDANDO', 'EM_USO', 'CONCLUIDO'].map(key => {
              const status = ReservationStatus[key as keyof typeof ReservationStatus];
              const isActive = statusFilter === status;
              return (
                <button key={key} onClick={() => setStatusFilter(isActive ? null : status)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${isActive ? 'bg-primary/10 text-primary dark:text-accent-sunshine border-primary/20 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  <span>{getFriendlyStatus(status)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-280px)] p-0 sm:p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              <table className="w-full text-left border-collapse hidden md:table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Poltrona</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Início / Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Devolução</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReservations.map((res, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/10';
                  return (
                    <React.Fragment key={res.id}>
                      <tr 
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('.relative') || target.tagName === 'BUTTON') {
                            return;
                          }
                          setExpandedResId(expandedResId === res.id ? null : res.id);
                        }}
                        className={`${rowBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/25 transition-colors group cursor-pointer`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-primary dark:text-accent-sunshine font-bold text-xs">
                              {res.clientName?.split(' ').map(n => n[0]).join('') || '?'}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{res.clientName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {res.vehiclePlate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">{formatDate(res.pickup_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">{formatDate(res.return_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 relative">
                            <div className="flex flex-col gap-1 items-stretch w-20">
                              <button onClick={() => setEditingContractRes(res)} className="py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-500/20 text-center">
                                Contrato
                              </button>
                              <button onClick={() => onEmitVoucher(res)} className="py-1 rounded-lg bg-primary/5 text-primary dark:text-accent-sunshine text-[10px] font-bold hover:bg-primary hover:text-white transition-all active:scale-95 border border-primary/20 text-center">
                                Voucher
                              </button>
                            </div>
                            <div className="relative">
                              <button onClick={() => setActiveMenu(activeMenu === res.id ? null : res.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                              {activeMenu === res.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                  {res.status === 'aguardando retirada' && (
                                    <button onClick={() => { setProcessingPickupRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                      <span className="material-symbols-outlined text-lg">local_shipping</span>
                                      Concluir Entrega
                                    </button>
                                  )}
                                  {res.status === 'locação em uso' && (
                                    <button onClick={() => { setProcessingReturnRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                      <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                                      Concluir Locação
                                    </button>
                                  )}
                                  {(res.status === 'locação em uso' || res.status === 'locação concluída') && (
                                    <button onClick={() => { setViewingReportRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary dark:text-accent-sunshine font-bold hover:bg-primary/5 transition-colors">
                                      <span className="material-symbols-outlined text-lg">analytics</span>
                                      Relatório Vistoria
                                    </button>
                                  )}
                                  <button onClick={() => { setEditingRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Editar Reserva
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const isPaid = res.observations?.includes('[CAUCAO_PAGO]');
                                      let newObs = res.observations || '';
                                      if (isPaid) {
                                        newObs = newObs.replace('[CAUCAO_PAGO]', '').trim();
                                      } else {
                                        if (!newObs.includes('[CAUCAO_PAGO]')) {
                                          newObs = `${newObs} [CAUCAO_PAGO]`.trim();
                                        }
                                      }
                                      await onUpdateReservation(res.id, { observations: newObs });
                                      toast.success(isPaid ? 'Caução marcado como pendente!' : 'Caução marcado como pago!');
                                      setActiveMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                  >
                                    <span className="material-symbols-outlined text-lg">payments</span>
                                    {res.observations?.includes('[CAUCAO_PAGO]') ? 'Caução Pendente' : 'Confirmar Caução Pago'}
                                  </button>
                                  <button onClick={async () => { if (window.confirm('Tem certeza que deseja excluir esta reserva?')) { await onDeleteReservation(res.id); setActiveMenu(null); } }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Excluir Reserva
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Collapsible expanded detail view row */}
                      {expandedResId === res.id && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                          <td colSpan={5} className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-inner max-w-5xl">
                              {/* Col 1: Status & Caução */}
                              <div className="space-y-4">
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status da Locação</span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(res.status)}`}>
                                    {getFriendlyStatus(res.status)}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Controle de Caução</span>
                                  <button
                                    onClick={async () => {
                                      const isPaid = res.observations?.includes('[CAUCAO_PAGO]');
                                      let newObs = res.observations || '';
                                      if (isPaid) {
                                        newObs = newObs.replace('[CAUCAO_PAGO]', '').trim();
                                      } else {
                                        if (!newObs.includes('[CAUCAO_PAGO]')) {
                                          newObs = `${newObs} [CAUCAO_PAGO]`.trim();
                                        }
                                      }
                                      await onUpdateReservation(res.id, { observations: newObs });
                                      toast.success(isPaid ? 'Caução marcado como pendente!' : 'Caução marcado como pago!');
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02] active:scale-95 ${
                                      res.observations?.includes('[CAUCAO_PAGO]')
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-base">
                                      {res.observations?.includes('[CAUCAO_PAGO]') ? 'check_circle' : 'pending'}
                                    </span>
                                    {res.observations?.includes('[CAUCAO_PAGO]') ? 'Caução Pago (Confirmado)' : 'Caução Pendente (Confirmar)'}
                                  </button>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Origem do Pedido</span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    res.origin === 'site'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-455 border-slate-200'
                                  }`}>
                                    {res.origin === 'site' ? 'Site / Online' : 'Painel / Balcão'}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Assinatura de Contrato</span>
                                  {(() => {
                                    const cStatus = contracts[res.id]?.status;
                                    if (!cStatus) {
                                      return <span className="text-xs text-slate-405 italic">Contrato não gerado</span>;
                                    }
                                    return (
                                      <div className="flex flex-col gap-2 items-start">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                          cStatus === 'assinado' 
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' 
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-955/10 dark:text-amber-400 border-amber-200'
                                        }`}>
                                          {cStatus === 'assinado' ? 'Assinado' : 'Pendente'}
                                        </span>
                                        {cStatus === 'pendente' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const signLink = `${window.location.origin}/contrato/${res.id}/assinar`;
                                              navigator.clipboard.writeText(signLink);
                                              toast.success('Link de assinatura copiado!');
                                            }}
                                            className="flex items-center gap-1 text-[10px] text-primary hover:underline dark:text-brand-teal font-extrabold uppercase tracking-wider mt-1"
                                          >
                                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                            Copiar Link
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Col 2: Valores */}
                              <div className="space-y-2.5 border-l border-r border-slate-100 dark:border-slate-800/60 px-0 sm:px-6">
                                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Detalhamento Financeiro</span>
                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                  <span>Diária da Poltrona:</span>
                                  <span className="font-semibold text-slate-800 dark:text-white">R$ {res.daily_rate?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                  <span>Período contratado:</span>
                                  <span className="font-semibold text-slate-800 dark:text-white">{res.days} dia{res.days > 1 ? 's' : ''}</span>
                                </div>
                                {res.insurance_value > 0 && (
                                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                    <span>Taxa de Seguro/Garantia:</span>
                                    <span className="font-semibold text-slate-800 dark:text-white">R$ {res.insurance_value.toFixed(2)}</span>
                                  </div>
                                )}
                                {res.security_deposit > 0 && (
                                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                    <span>Caução de Segurança:</span>
                                    <span className="font-semibold text-slate-800 dark:text-white">R$ {res.security_deposit.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                                <div className="flex justify-between text-sm font-bold text-primary dark:text-brand-teal">
                                  <span>Valor Total:</span>
                                  <span>R$ {res.total_value?.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Col 3: Serviços & Observações */}
                              <div className="space-y-3">
                                {res.additional_services && (
                                  <div>
                                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Serviços Adicionais</span>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">
                                      {res.additional_services.split(',').map(s => s.trim()).join(', ')}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Observações do Contrato</span>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 min-h-[50px] whitespace-pre-line">
                                    {res.observations?.replace('[CAUCAO_PAGO]', '').trim() || 'Nenhuma observação registrada.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View (Cards) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-850/60">
              {filteredReservations.map((res, index) => {
                const isExpanded = expandedResId === res.id;
                const isPaid = res.observations?.includes('[CAUCAO_PAGO]');
                const cardBg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/45 dark:bg-slate-800/15';
                return (
                  <div 
                    key={res.id} 
                    className={`p-4 space-y-3 ${cardBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/25 transition-colors`}
                  >
                    {/* Header row: Client Name & Status badge */}
                    <div 
                      className="flex justify-between items-start gap-2 cursor-pointer" 
                      onClick={() => setExpandedResId(isExpanded ? null : res.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-primary dark:text-accent-sunshine font-bold text-xs shrink-0">
                          {res.clientName?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{res.clientName}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-450 truncate">{res.vehicleModel} ({res.vehiclePlate})</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusStyle(res.status)}`}>
                        {getFriendlyStatus(res.status)}
                      </span>
                    </div>

                    {/* Dates row */}
                    <div 
                      className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/30 cursor-pointer" 
                      onClick={() => setExpandedResId(isExpanded ? null : res.id)}
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Início / Entrega</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDate(res.pickup_date)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Devolução</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDate(res.return_date)}</span>
                      </div>
                    </div>

                    {/* Actions & expand toggle */}
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditingContractRes(res)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 active:scale-95 transition-all">
                          Contrato
                        </button>
                        <button onClick={() => onEmitVoucher(res)} className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary dark:text-accent-sunshine text-[11px] font-bold border border-primary/20 active:scale-95 transition-all">
                          Voucher
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* More Actions dropdown button */}
                        <div className="relative">
                          <button onClick={() => setActiveMenu(activeMenu === res.id ? null : res.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700 flex items-center">
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>
                          {activeMenu === res.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                              {res.status === 'aguardando retirada' && (
                                <button onClick={() => { setProcessingPickupRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                                  Concluir Entrega
                                </button>
                              )}
                              {res.status === 'locação em uso' && (
                                <button onClick={() => { setProcessingReturnRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                  <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                                  Concluir Locação
                                </button>
                              )}
                              {(res.status === 'locação em uso' || res.status === 'locação concluída') && (
                                <button onClick={() => { setViewingReportRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary dark:text-accent-sunshine font-bold hover:bg-primary/5 transition-colors">
                                  <span className="material-symbols-outlined text-lg">analytics</span>
                                  Relatório Vistoria
                                </button>
                              )}
                              <button onClick={() => { setEditingRes(res); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                  Editar Reserva
                                </button>
                                <button
                                  onClick={async () => {
                                    let newObs = res.observations || '';
                                    if (isPaid) {
                                      newObs = newObs.replace('[CAUCAO_PAGO]', '').trim();
                                    } else {
                                      if (!newObs.includes('[CAUCAO_PAGO]')) {
                                        newObs = `${newObs} [CAUCAO_PAGO]`.trim();
                                      }
                                    }
                                    await onUpdateReservation(res.id, { observations: newObs });
                                    toast.success(isPaid ? 'Caução marcado como pendente!' : 'Caução marcado como pago!');
                                    setActiveMenu(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-lg">payments</span>
                                  {isPaid ? 'Caução Pendente' : 'Confirmar Caução Pago'}
                                </button>
                                <button onClick={async () => { if (window.confirm('Tem certeza que deseja excluir esta reserva?')) { await onDeleteReservation(res.id); setActiveMenu(null); } }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                  Excluir Reserva
                                </button>
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => setExpandedResId(isExpanded ? null : res.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700 flex items-center"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail view on mobile */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Origem</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              res.origin === 'site'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-955/20 dark:text-blue-400 border-blue-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-450 border-slate-200'
                            }`}>
                              {res.origin === 'site' ? 'Site / Online' : 'Painel / Balcão'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Controle de Caução</span>
                            <button
                              onClick={async () => {
                                let newObs = res.observations || '';
                                if (isPaid) {
                                  newObs = newObs.replace('[CAUCAO_PAGO]', '').trim();
                                } else {
                                  if (!newObs.includes('[CAUCAO_PAGO]')) {
                                    newObs = `${newObs} [CAUCAO_PAGO]`.trim();
                                  }
                                }
                                await onUpdateReservation(res.id, { observations: newObs });
                                toast.success(isPaid ? 'Caução marcado como pendente!' : 'Caução marcado como pago!');
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {isPaid ? 'check_circle' : 'pending'}
                              </span>
                              {isPaid ? 'Caução Pago' : 'Confirmar Pago'}
                            </button>
                          </div>
                        </div>

                        {/* Contrato Assinatura Block */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-2">
                          <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assinatura de Contrato</span>
                          {(() => {
                            const cStatus = contracts[res.id]?.status;
                            if (!cStatus) {
                              return <span className="text-[10px] text-slate-450 italic">Contrato não gerado</span>;
                            }
                            return (
                              <div className="flex justify-between items-center w-full">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cStatus === 'assinado' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-955/10 dark:text-amber-400 border-amber-200'
                                }`}>
                                  {cStatus === 'assinado' ? 'Assinado' : 'Pendente'}
                                </span>
                                {cStatus === 'pendente' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const signLink = `${window.location.origin}/contrato/${res.id}/assinar`;
                                      navigator.clipboard.writeText(signLink);
                                      toast.success('Link de assinatura copiado!');
                                    }}
                                    className="flex items-center gap-1 text-[10px] text-primary hover:underline dark:text-brand-teal font-extrabold uppercase tracking-wider"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                    Copiar Link
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Financial detail */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-1.5">
                          <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Detalhamento Financeiro</span>
                          <div className="flex justify-between">
                            <span>Diária da Poltrona:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">R$ {res.daily_rate?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Período:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{res.days} dias</span>
                          </div>
                          {res.insurance_value > 0 && (
                            <div className="flex justify-between">
                              <span>Seguro/Garantia:</span>
                              <span className="font-semibold text-slate-800 dark:text-white">R$ {res.insurance_value.toFixed(2)}</span>
                            </div>
                          )}
                          {res.security_deposit > 0 && (
                            <div className="flex justify-between">
                              <span>Caução Requerido:</span>
                              <span className="font-semibold text-slate-800 dark:text-white">R$ {res.security_deposit.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1"></div>
                          <div className="flex justify-between font-bold text-primary dark:text-brand-teal text-sm">
                            <span>Valor Total:</span>
                            <span>R$ {res.total_value?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Services & Obs */}
                        <div className="space-y-2">
                          {res.additional_services && (
                            <div>
                              <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Adicionais</span>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">{res.additional_services.split(',').map(s => s.trim()).join(', ')}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Observações</span>
                            <p className="text-slate-600 dark:text-slate-400 italic whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">
                              {res.observations?.replace('[CAUCAO_PAGO]', '').trim() || 'Sem observações.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>
 
      {editingRes && <EditReservationModal reservation={editingRes} clients={clients} vehicles={vehicles} onClose={() => setEditingRes(null)} onUpdate={onUpdateReservation} />}
      {processingPickupRes && (
        <PickupModal 
          reservation={processingPickupRes} 
          onClose={() => setProcessingPickupRes(null)} 
          onUpdate={onUpdateReservation} 
          vehicles={vehicles}
          onUpdateVehicle={onUpdateVehicle}
        />
      )}
      {processingReturnRes && (
        <ReturnModal 
          reservation={processingReturnRes} 
          onClose={() => setProcessingReturnRes(null)} 
          onUpdate={onUpdateReservation}
          onUpdateVehicle={onUpdateVehicle}
        />
      )}
      {viewingReportRes && <InspectionReportModal reservation={viewingReportRes} onClose={() => setViewingReportRes(null)} />}
      
      {/* Carregamento seguro do editor de contrato */}
      <Suspense fallback={<div className="fixed inset-0 z-[120] bg-white/50 flex items-center justify-center"><div className="size-10 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div></div>}>
        {editingContractRes && (
          <ContractEditorView 
              reservation={editingContractRes} 
              client={clients.find(c => c.id === editingContractRes.client_id)}
              vehicle={vehicles.find(v => v.id === editingContractRes.vehicle_id)}
              onClose={() => { setEditingContractRes(null); fetchContracts(); }} 
          />
        )}
      </Suspense>
    </div>
  );
};

const InspectionPhotoGrid: React.FC<{
  photos: Record<string, File | string | null>;
  onPhotoChange: (slotId: string, file: File) => void;
  isSubmitting: boolean;
}> = ({ photos, onPhotoChange, isSubmitting }) => {
  const groups = ['Aparência', 'Funcionamento', 'Higiene & Acessórios'];
  const [activeGroup, setActiveGroup] = useState('Aparência');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {groups.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setActiveGroup(g)}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeGroup === g ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {INSPECTION_SLOTS.filter(s => s.group === activeGroup).map(slot => (
          <div key={slot.id} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate block">{slot.label}</label>
            <div className="relative aspect-video rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group">
              {photos[slot.id] ? (
                <img 
                  src={typeof photos[slot.id] === 'string' ? photos[slot.id] as string : URL.createObjectURL(photos[slot.id] as File)} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="material-symbols-outlined text-2xl text-slate-300">add_a_photo</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isSubmitting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoChange(slot.id, file);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const fileToBase64 = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PickupModal: React.FC<{ 
  reservation: Reservation; 
  onClose: () => void; 
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<void>; 
  vehicles: Vehicle[];
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<void>;
}> = ({ reservation, onClose, onUpdate, vehicles = [], onUpdateVehicle }) => {
  const [actualPickupDate, setActualPickupDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [selectedVehicleId, setSelectedVehicleId] = useState(reservation.vehicle_id || '');
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicleId) {
      toast.error('É obrigatório selecionar uma poltrona física.');
      return;
    }

    const missing = INSPECTION_SLOTS.filter(s => !photos[s.id]);
    if (missing.length > 0) {
      toast.error(`Faltam ${missing.length} fotos obrigatórias.`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Enviando vistorias e atualizando status...');

    try {
      const photoUrls: string[] = [];
      for (const slot of INSPECTION_SLOTS) {
        const file = photos[slot.id] as File;
        const base64Url = await fileToBase64(file);
        photoUrls.push(base64Url);
      }

      // Sync vehicle status in database
      if (onUpdateVehicle) {
        // Reset old vehicle to Available if it was different
        if (reservation.vehicle_id && reservation.vehicle_id !== selectedVehicleId) {
          await onUpdateVehicle(reservation.vehicle_id, { status: 'Disponível' });
        }
        // Update new vehicle to Alugado
        await onUpdateVehicle(selectedVehicleId, { status: 'Alugado' });
      }

      // Update reservation details
      await onUpdate(reservation.id, {
        status: ReservationStatus.EM_USO,
        vehicle_id: selectedVehicleId,
        actual_pickup_date: new Date(actualPickupDate).toISOString(),
        pickup_photos: photoUrls
      });

      toast.success('Entrega concluída com sucesso!', { id: loadingToast });
      onClose();
    } catch (err: any) {
      toast.error('Erro ao registrar entrega: ' + err.message, { id: loadingToast });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-3xl rounded-none sm:rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500">local_shipping</span>Vistoria de Entrega</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Data/Hora Real da Entrega</label>
              <input type="datetime-local" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm dark:text-white" value={actualPickupDate} onChange={e => setActualPickupDate(e.target.value)} required />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Selecione a Poltrona Física (Patrimônio)</label>
              <select
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm dark:text-white font-semibold focus:ring-2 focus:ring-primary/20"
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
              >
                <option value="">Selecione uma poltrona física</option>
                {vehicles
                  .filter(v => v.status === 'Disponível' || v.id === reservation.vehicle_id)
                  .map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate} ({v.model}) - Status: {v.status === 'Em manutenção' ? 'Higienização' : v.status}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
          <InspectionPhotoGrid photos={photos} onPhotoChange={(id, file) => setPhotos(prev => ({ ...prev, [id]: file }))} isSubmitting={isSubmitting} />
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">Confirmar Entrega</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ReturnModal: React.FC<{ 
  reservation: Reservation; 
  onClose: () => void; 
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<void>; 
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<void>;
}> = ({ reservation, onClose, onUpdate, onUpdateVehicle }) => {
  const [actualReturnDate, setActualReturnDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = INSPECTION_SLOTS.filter(s => !photos[s.id]);
    if (missing.length > 0) {
      toast.error(`Faltam ${missing.length} fotos obrigatórias.`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Enviando vistorias e finalizando locação...');

    try {
      const photoUrls: string[] = [];
      for (const slot of INSPECTION_SLOTS) {
        const file = photos[slot.id] as File;
        const base64Url = await fileToBase64(file);
        photoUrls.push(base64Url);
      }

      // Reset vehicle status back to Disponível
      if (onUpdateVehicle && reservation.vehicle_id) {
        await onUpdateVehicle(reservation.vehicle_id, { status: 'Disponível' });
      }

      await onUpdate(reservation.id, {
        status: ReservationStatus.CONCLUIDO,
        actual_return_date: new Date(actualReturnDate).toISOString(),
        return_photos: photoUrls
      });

      toast.success('Devolução concluída com sucesso!', { id: loadingToast });
      onClose();
    } catch (err: any) {
      toast.error('Erro ao finalizar locação: ' + err.message, { id: loadingToast });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-3xl rounded-none sm:rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">assignment_turned_in</span>Vistoria de Devolução</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Data/Hora Real</label>
              <input type="datetime-local" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm" value={actualReturnDate} onChange={e => setActualReturnDate(e.target.value)} required />
            </div>
          </div>
          <InspectionPhotoGrid photos={photos} onPhotoChange={(id, file) => setPhotos(prev => ({ ...prev, [id]: file }))} isSubmitting={isSubmitting} />
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20">Confirmar Devolução</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InspectionReportModal: React.FC<{ reservation: Reservation; onClose: () => void; }> = ({ reservation, onClose }) => {
  const [activeGroup, setActiveGroup] = useState('Aparência');
  const groups = ['Aparência', 'Funcionamento', 'Higiene & Acessórios'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-5xl rounded-none sm:rounded-2xl shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Relatório Comparativo de Vistoria</h2>
            <p className="text-xs text-slate-500 font-bold uppercase mt-1">{reservation.clientName} • {reservation.vehicleModel} ({reservation.vehiclePlate})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            {groups.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeGroup === g ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {g}
              </button>
            ))}
          </div>

          <div className="space-y-12">
            {INSPECTION_SLOTS.filter(s => s.group === activeGroup).map((slot, idx) => (
              <div key={slot.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{slot.label}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">login</span> Antes (Retirada)
                    </p>
                    <div className="aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                      {reservation.pickup_photos?.[INSPECTION_SLOTS.indexOf(slot)] ? (
                        <img src={reservation.pickup_photos[INSPECTION_SLOTS.indexOf(slot)]} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400 italic">Foto não disponível</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">logout</span> Depois (Devolução)
                    </p>
                    <div className="aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                      {reservation.return_photos?.[INSPECTION_SLOTS.indexOf(slot)] ? (
                        <img src={reservation.return_photos[INSPECTION_SLOTS.indexOf(slot)]} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aguardando devolução</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationsView;