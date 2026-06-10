import React from 'react';
import { Reservation, Vehicle } from '../types';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

interface DashboardProps {
  isLoading?: boolean;
  vehicles: Vehicle[];
  reservations: Reservation[];
  recentReservations: Reservation[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles = [], reservations = [], recentReservations = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl w-full mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  // Stock Stats
  const activeVehicles = vehicles.filter(v => v.status !== 'Desativado');
  const totalStock = activeVehicles.length;
  const availableStock = activeVehicles.filter(v => v.status === 'Disponível').length;
  const rentedStock = activeVehicles.filter(v => v.status === 'Alugado').length;
  const maintenanceStock = activeVehicles.filter(v => v.status === 'Em manutenção').length;

  // Reservation Status Stats (excluding cancelled/lost)
  const activeReservations = reservations.filter(r => r.status !== 'reserva cancelada' && r.status !== 'reserva perdida');
  const waitingDeliveryCount = activeReservations.filter(r => r.status === 'aguardando retirada').length;
  const inUseCount = activeReservations.filter(r => r.status === 'locação em uso').length;
  const completedCount = activeReservations.filter(r => r.status === 'locação concluída').length;

  // Origin breakdown
  const originSiteCount = activeReservations.filter(r => r.origin === 'site').length;
  const originAdminCount = activeReservations.filter(r => r.origin === 'painel' || !r.origin).length;
  const totalActiveReservations = activeReservations.length;
  
  const sitePercent = totalActiveReservations > 0 ? Math.round((originSiteCount / totalActiveReservations) * 100) : 0;
  const adminPercent = totalActiveReservations > 0 ? 100 - sitePercent : 0;

  // Security Deposit (Caução) Financial stats
  const depositsPaid = activeReservations.filter(r => r.observations?.includes('[CAUCAO_PAGO]'));
  const depositsPending = activeReservations.filter(r => !r.observations?.includes('[CAUCAO_PAGO]') && r.status !== 'locação concluída');

  const depositPaidCount = depositsPaid.length;
  const depositPaidAmount = depositsPaid.reduce((sum, r) => sum + (r.security_deposit || 0), 0);

  const depositPendingCount = depositsPending.length;
  const depositPendingAmount = depositsPending.reduce((sum, r) => sum + (r.security_deposit || 0), 0);

  // Total estimated monthly revenue (active + completed)
  const monthlyRevenue = activeReservations.reduce((sum, r) => sum + (r.total_value || 0), 0);

  // Friendly status helper
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aguardando retirada': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border-amber-250';
      case 'locação em uso': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border-blue-250';
      case 'locação concluída': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      default: return 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Available Armchairs */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poltronas Disponíveis</h3>
              <p className="text-[10px] text-slate-450">Estoque Livre</p>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{availableStock}</p>
            <span className="text-xs font-semibold text-slate-400">Total: {totalStock}</span>
          </div>
        </div>

        {/* waitingDeliveryCount */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-2xl">pending_actions</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aguardando Entrega</h3>
              <p className="text-[10px] text-slate-455">Pendentes de Vistoria</p>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{waitingDeliveryCount}</p>
            <span className="text-xs font-semibold text-slate-400">Reservadas</span>
          </div>
        </div>

        {/* inUseCount */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 text-2xl">chair</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Locações Em Uso</h3>
              <p className="text-[10px] text-slate-455">Com clientes na residência</p>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{inUseCount}</p>
            <span className="text-xs font-semibold text-slate-400">Ativas: {rentedStock}</span>
          </div>
        </div>

        {/* completedCount */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-500 text-2xl">assignment_turned_in</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Locações Concluídas</h3>
              <p className="text-[10px] text-slate-455">Histórico finalizado</p>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{completedCount}</p>
            <span className="text-xs font-semibold text-slate-400">Entregues</span>
          </div>
        </div>

      </div>

      {/* Financial Section & Caução */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Paid Deposits */}
        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/10 dark:to-slate-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Cauções Confirmados (Pagos)</h4>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-800 dark:text-emerald-400">{depositPaidCount} contratos</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-3">
              R$ {depositPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4">Montante em custódia de segurança reembolsável.</p>
        </div>

        {/* Pending Deposits */}
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/10 dark:to-slate-900 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Cauções Pendentes</h4>
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-800 dark:text-amber-400">{depositPendingCount} aguardando</span>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-3">
              R$ {depositPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-450 font-semibold mt-4 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">warning</span>
            Confirmar comprovantes via WhatsApp!
          </p>
        </div>

        {/* Estimated Monthly Revenue */}
        <div className="bg-gradient-to-br from-primary/5 to-white dark:from-slate-900/50 dark:to-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturamento Total Acumulado</h4>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary dark:text-[#8db4ab] text-[10px] font-bold">Geral</span>
            </div>
            <p className="text-2xl font-black text-primary dark:text-[#65b0b4] mt-3">
              R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4">Soma das locações ativas, pendentes e concluídas.</p>
        </div>

      </div>

      {/* Booking Origin & Higienização stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Origin Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-secondary">bar_chart</span>
            Origem das Reservas Ativas
          </h4>
          <div className="space-y-4 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-600">Site / Online ({originSiteCount})</span>
              <span className="text-slate-655 dark:text-slate-400">Painel / Administrativo ({originAdminCount})</span>
            </div>
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${sitePercent}%` }} title={`Site: ${sitePercent}%`}></div>
              <div className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500" style={{ width: `${adminPercent}%` }} title={`Administrativo: ${adminPercent}%`}></div>
            </div>
            <div className="flex gap-4 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded bg-blue-500"></span>
                <span>Clientes Reservando pelo Site ({sitePercent}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded bg-slate-400 dark:bg-slate-600"></span>
                <span>Operador Lançando no Balcão ({adminPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance / Cleaning status */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-secondary">cleaning_services</span>
              Manutenção & Higiene
            </h4>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Cadeiras em Higienização</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 font-bold">{maintenanceStock}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Tempo Médio de Higiene</span>
                <span className="font-bold text-slate-700 dark:text-slate-305">12 a 24 horas</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 italic mt-4">
            Poltronas em higienização hospitalar não entram no pool de disponíveis.
          </div>
        </div>

      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">Atividade Recente</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Reserva</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Origem</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Caução</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentReservations.map((res, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/10';
                  return (
                    <tr key={res.id} className={`${rowBg} hover:bg-slate-100/60 dark:hover:bg-slate-800/25 transition-colors`}>
                      <td className="px-6 py-4 font-mono font-bold text-primary dark:text-[#65b0b4] whitespace-nowrap">#{res.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-slate-150 dark:bg-slate-800 flex items-center justify-center text-xs font-bold dark:text-white">
                            {res.clientName?.split(' ').map(n => n[0]).join('') || '??'}
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{res.clientName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          res.origin === 'site' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-405'
                        }`}>
                          {res.origin === 'site' ? 'Site / Online' : 'Balcão / Painel'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(res.status)}`}>
                          {getFriendlyStatus(res.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          res.observations?.includes('[CAUCAO_PAGO]')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/10 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-955/10 dark:text-amber-400'
                        }`}>
                          {res.observations?.includes('[CAUCAO_PAGO]') ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-550 dark:text-slate-400 text-right font-semibold whitespace-nowrap">
                        {res.dateStr}
                      </td>
                    </tr>
                  );
                })}
                {recentReservations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">Nenhuma reserva cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;