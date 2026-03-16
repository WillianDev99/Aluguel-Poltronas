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
    { id: 'VEHICLES', path: '/vehicles', label: 'Veículos', icon: 'directions_car', roles: ['admin', 'user'] },
    { id: 'RESERVATIONS', path: '/reservations', label: 'Reservas', icon: 'calendar_today', roles: ['admin', 'user'] },
    { id: 'DISCOUNTS', path: '/discounts', label: 'Desconto Progressivo', icon: 'trending_down', roles: ['admin', 'user'] },
    { id: 'USERS', path: '/users', label: 'Usuários', icon: 'manage_accounts', roles: ['admin'] },
    { id: 'INTEGRATIONS', path: '/integrations', label: 'Integrações', icon: 'api', roles: ['admin', 'user'] },
  ];

  const userRole = userProfile?.role || 'user';
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-primary dark:bg-[#002022] flex flex-col h-full border-r border-primary/10 transition-colors">
        <button 
          onClick={() => navigate('/')}
          className="p-6 flex items-center justify-start border-b border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
          title="Voltar para o Site"
        >
          <img
            src="/Logo-verde.png"
            alt="Midas Rent a Car"
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </button>

        <nav className="flex-1 px-4 mt-6 space-y-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path
                ? 'bg-white/10 text-white font-medium shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className={`material-symbols-outlined ${location.pathname === item.path ? 'text-accent-sunshine' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
            <button
              onClick={onViewProfile}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/5 p-1 -m-1 rounded-lg transition-colors group"
              title="Ver Perfil"
            >
              <div
                className="size-10 rounded-full bg-cover bg-center border border-white/20 bg-primary/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-white/40 transition-colors"
                style={userProfile?.avatar_url ? { backgroundImage: `url("${userProfile.avatar_url}")` } : {}}
              >
                {!userProfile?.avatar_url && <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors">person</span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate group-hover:text-accent-sunshine transition-colors">{userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-xs text-white/50 truncate capitalize">{userRole === 'admin' ? 'Gerente Geral' : 'Operador'}</p>
              </div>
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-y-auto transition-colors">
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-primary dark:text-white tracking-tight">
              {currentItem.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input className="w-64 h-10 pl-10 pr-4 bg-slate-100 dark:bg-white/5 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white" placeholder="Pesquisar..." type="text" />
            </div>
            <div className="flex items-center gap-2">
              <button className="size-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="size-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
              {location.pathname === '/reservations' && (
                <button
                  onClick={onAddReservation}
                  className="bg-primary text-white px-4 h-10 rounded-lg flex items-center gap-2 font-semibold text-sm cursor-pointer shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
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