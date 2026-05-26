import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole, UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  userProfile: UserProfile | null;
  onAddReservation?: () => void;
  onViewProfile?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, isDarkMode, toggleDarkMode, userProfile, onAddReservation, onViewProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'DASHBOARD', path: '/dashboard', label: 'Painel', icon: 'dashboard', roles: ['admin', 'user'] },
    { id: 'CLIENTS', path: '/clients', label: 'Clientes', icon: 'group', roles: ['admin', 'user'] },
    { id: 'VEHICLES', path: '/vehicles', label: 'Poltronas', icon: 'chair', roles: ['admin', 'user'] },
    { id: 'RESERVATIONS', path: '/reservations', label: 'Reservas', icon: 'calendar_today', roles: ['admin', 'user'] },
    { id: 'DISCOUNTS', path: '/discounts', label: 'Desconto Progressivo', icon: 'trending_down', roles: ['admin', 'user'] },
    { id: 'USERS', path: '/users', label: 'Usuários', icon: 'manage_accounts', roles: ['admin'] },
    { id: 'INTEGRATIONS', path: '/integrations', label: 'Integrações', icon: 'api', roles: ['admin', 'user'] },
  ];

  const userRole = userProfile?.role || 'user';
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar */}
      <aside className="w-66 flex-shrink-0 bg-slate-900 dark:bg-slate-950 flex flex-col h-full border-r border-slate-800 transition-colors relative z-20">
        <button 
          onClick={() => navigate('/')}
          className="p-6 flex items-center justify-start border-b border-slate-800 bg-slate-900/50 hover:bg-slate-850 transition-colors group text-left w-full"
          title="Voltar para o Site"
        >
          <div className="flex items-center gap-3 text-white">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
              <span className="material-symbols-outlined text-white text-2.5xl">medical_services</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-display font-black tracking-tight leading-none">ComfortCare</span>
              <span className="text-[9px] font-black text-secondary tracking-widest leading-none mt-1.5 uppercase">Administrativo</span>
            </div>
          </div>
        </button>
 
        <nav className="flex-1 px-4 mt-8 space-y-1.5 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-secondary/10 border border-primary/30 text-white shadow-lg shadow-primary/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-gradient-to-b from-primary to-secondary rounded-r-full"></div>
                )}
                <span className={`material-symbols-outlined text-lg transition-transform group-hover:scale-105 ${isActive ? 'text-secondary' : 'text-slate-500'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
 
        <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/20">
          <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <button
              onClick={onViewProfile}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-slate-800/50 p-1 -m-1 rounded-xl transition-colors group"
              title="Ver Perfil"
            >
              <div
                className="size-10 rounded-xl bg-cover bg-center border border-slate-700 bg-slate-850 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-slate-500 transition-colors"
                style={userProfile?.avatar_url ? { backgroundImage: `url("${userProfile.avatar_url}")` } : {}}
              >
                {!userProfile?.avatar_url && <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-200 transition-colors">person</span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-250 truncate group-hover:text-secondary transition-colors">{userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-[10px] font-black text-slate-500 truncate uppercase tracking-widest mt-0.5">{userRole === 'admin' ? 'Gerente' : 'Operador'}</p>
              </div>
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="p-2 -mr-2 rounded-xl hover:bg-slate-800 text-slate-550 hover:text-red-400 transition-colors group"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>
 
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors">
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {currentItem.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input 
                className="w-64 h-10 pl-10 pr-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-primary/30 dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl text-xs font-semibold focus:outline-0 transition-all text-slate-900 dark:text-white" 
                placeholder="Pesquisar registro..." 
                type="text" 
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">notifications</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
              <button
                onClick={onLogout}
                className="size-10 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300 transition-colors mr-2"
                title="Sair (Logout)"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
              {location.pathname === '/reservations' && (
                <button
                  onClick={onAddReservation}
                  className="bg-gradient-to-r from-primary to-primary-hover text-white px-5 h-10 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Nova Reserva</span>
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
 
export default Layout;