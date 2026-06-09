import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole, UserProfile } from '../types';
import posleveLogoText from '../src/assets/posleve_logo_text.png';


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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const menuItems = [
    { id: 'DASHBOARD', path: '/dashboard', label: 'Painel', icon: 'dashboard', roles: ['admin', 'user'] },
    { id: 'CLIENTS', path: '/clients', label: 'Clientes', icon: 'group', roles: ['admin', 'user'] },
    { id: 'VEHICLES', path: '/vehicles', label: 'Poltronas', icon: 'chair', roles: ['admin', 'user'] },
    { id: 'RESERVATIONS', path: '/reservations', label: 'Reservas', icon: 'calendar_today', roles: ['admin', 'user'] },
    { id: 'USERS', path: '/users', label: 'Usuários', icon: 'manage_accounts', roles: ['admin'] },
  ];

  const userRole = userProfile?.role || 'user';
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-66 bg-[#13383b] dark:bg-[#0b1415] flex flex-col h-full border-r border-[#184649] dark:border-white/5 transition-all duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button 
          onClick={() => {
            navigate('/');
            setIsSidebarOpen(false);
          }}
          className="p-4 flex flex-col items-center justify-center border-b border-[#184649] dark:border-white/5 bg-[#184649] dark:bg-[#0d1b1c] hover:bg-primary dark:hover:bg-[#112325] transition-colors w-full"
          title="Voltar para o Site"
        >
          <img src={posleveLogoText} className="h-16 w-auto object-contain brightness-0 invert" alt="PÓS LEVE" />
          <span className="text-[9px] font-black text-accent-coral tracking-widest leading-none mt-2 uppercase">Administrativo</span>
        </button>
 
        <nav className="flex-1 px-4 mt-8 space-y-1.5 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all relative group ${
                  isActive
                    ? 'bg-white/10 border border-white/10 text-white shadow-md'
                    : 'text-[#8db4ab] hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-accent-coral rounded-r-full"></div>
                )}
                <span className={`material-symbols-outlined text-lg transition-transform group-hover:scale-105 ${isActive ? 'text-accent-coral' : 'text-[#8db4ab]'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
 
        <div className="p-4 mt-auto border-t border-[#184649] dark:border-white/5 bg-black/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
            <button
              onClick={() => {
                if (onViewProfile) onViewProfile();
                setIsSidebarOpen(false);
              }}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/5 p-1 -m-1 rounded-xl transition-colors group"
              title="Ver Perfil"
            >
              <div
                className="size-10 rounded-xl bg-cover bg-center border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-white/30 transition-colors"
                style={userProfile?.avatar_url ? { backgroundImage: `url("${userProfile.avatar_url}")` } : {}}
              >
                {!userProfile?.avatar_url && <span className="material-symbols-outlined text-white/60 group-hover:text-white transition-colors">person</span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate group-hover:text-accent-coral transition-colors">{userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-[10px] font-black text-white/50 truncate uppercase tracking-widest mt-0.5">{userRole === 'admin' ? 'Gerente' : 'Operador'}</p>
              </div>
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="p-2 -mr-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-red-400 transition-colors group"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>
 
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-955 overflow-y-auto transition-colors">
        <header className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-8 py-2.5 sm:py-4 bg-white/80 dark:bg-slate-955/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Abrir Menu"
            >
              <span className="material-symbols-outlined text-lg">menu</span>
            </button>
            <h2 className="text-base sm:text-xl font-display font-black text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
              {currentItem.label}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input 
                className="w-64 h-10 pl-10 pr-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-primary/30 dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl text-xs font-semibold focus:outline-0 transition-all text-slate-900 dark:text-white" 
                placeholder="Pesquisar registro..." 
                type="text" 
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button className="hidden sm:flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">notifications</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
              <button
                onClick={onLogout}
                className="hidden sm:flex size-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-350 transition-colors mr-2"
                title="Sair (Logout)"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
              {location.pathname === '/reservations' && (
                <button
                  onClick={onAddReservation}
                  className="bg-gradient-to-r from-primary to-primary-hover text-white h-10 w-10 sm:w-auto sm:px-5 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  title="Nova Reserva"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span className="hidden sm:inline">Nova Reserva</span>
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