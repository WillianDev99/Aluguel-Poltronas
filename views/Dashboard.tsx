import React from 'react';
import { Reservation } from '../types';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

interface DashboardProps {
  isLoading?: boolean;
  stats: {
    available: number;
    rented: number;
    total: number;
    maintenance: number;
  };
  recentReservations: Reservation[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentReservations, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl w-full mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Available Armchairs Card */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary dark:text-accent-sunshine text-3xl">check_circle</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">Poltronas Disponíveis</h3>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-6xl font-bold text-primary dark:text-white tracking-tighter">{stats.available}</p>
            <div className="flex flex-col items-end">
              <p className="text-sm font-medium text-slate-400">Total no Acervo: {stats.total}</p>
              <div className="w-32 h-2 bg-slate-100 dark:bg-white/5 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary dark:bg-accent-sunshine transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.available / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rented Armchairs Card */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-accent-sunshine/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary dark:text-accent-sunshine text-3xl">chair</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">Poltronas Alugadas</h3>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-6xl font-bold text-primary dark:text-white tracking-tighter">{stats.rented}</p>
            <div className="flex flex-col items-end">
              <p className="text-sm font-medium text-slate-400">Taxa de Ocupação: {stats.total > 0 ? Math.round((stats.rented / stats.total) * 100) : 0}%</p>
              <div className="w-32 h-2 bg-slate-100 dark:bg-white/5 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-accent-sunshine transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.rented / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary dark:text-white">Atividade Recente</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Reserva</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Poltrona</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {recentReservations.map((res) => (
                <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-semibold text-primary dark:text-white">#{res.id.substring(0, 8)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold dark:text-white">
                        {res.clientName?.split(' ').map(n => n[0]).join('') || '??'}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{res.clientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{res.vehicleModel}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-right font-medium">{res.dateStr}</td>
                </tr>
              ))}
              {recentReservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">Nenhuma reserva recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary dark:text-accent-sunshine">cleaning_services</span>
            <h4 className="font-bold text-sm text-primary dark:text-white">Higienização / Manutenção</h4>
          </div>
          <p className="text-2xl font-bold dark:text-white">{String(stats.maintenance).padStart(2, '0')} <span className="text-xs font-normal text-slate-400 ml-1">poltronas</span></p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary dark:text-accent-sunshine">priority_high</span>
            <h4 className="font-bold text-sm text-primary dark:text-white">Devoluções Atrasadas</h4>
          </div>
          <p className="text-2xl font-bold dark:text-white">00 <span className="text-xs font-normal text-slate-400 ml-1">pendentes</span></p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary dark:text-accent-sunshine">payments</span>
            <h4 className="font-bold text-sm text-primary dark:text-white">Receita do Mês</h4>
          </div>
          <p className="text-2xl font-bold text-primary dark:text-white">R$ 0,00 <span className="text-xs font-normal text-slate-400 ml-1">total</span></p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;