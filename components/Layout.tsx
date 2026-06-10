import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole, UserProfile, Reservation } from '../types';
import posleveLogoText from '../src/assets/posleve_logo_text.png';


interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  userProfile: UserProfile | null;
  onAddReservation?: () => void;
  onViewProfile?: () => void;
  reservations?: Reservation[];
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, isDarkMode, toggleDarkMode, userProfile, onAddReservation, onViewProfile, reservations }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const [acknowledgedIds, setAcknowledgedIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('posleve_acknowledged_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const handleAcknowledge = React.useCallback((id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setAcknowledgedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('posleve_acknowledged_notifs', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notificationItems = React.useMemo(() => {
    if (!reservations) return [];

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const getLocalDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayOnly = getLocalDateOnly(now);
    const tomorrowOnly = new Date(todayOnly.getTime() + 24 * 60 * 60 * 1000);

    const list: Array<{
      id: string;
      type: 'new_site_req' | 'pending_deposit' | 'collect_tomorrow' | 'collect_overdue';
      title: string;
      description: string;
      timeLabel?: string;
      reservation: Reservation;
      color: string;
      icon: string;
    }> = [];

    reservations.forEach(r => {
      let returnDateOnly: Date | null = null;
      if (r.return_date) {
        try {
          returnDateOnly = getLocalDateOnly(new Date(r.return_date));
        } catch (_) {}
      }

      const isAwaitingOrInUse = r.status === 'aguardando retirada' || r.status === 'locação em uso';

      // Type 4: Coleta Atrasada (Vencida)
      if (isAwaitingOrInUse && returnDateOnly && returnDateOnly.getTime() < todayOnly.getTime()) {
        const diffDays = Math.ceil((todayOnly.getTime() - returnDateOnly.getTime()) / (24 * 60 * 60 * 1000));
        list.push({
          id: `overdue-${r.id}`,
          type: 'collect_overdue',
          title: 'Coleta Atrasada 🚨',
          description: `${r.clientName} - Poltrona ${r.vehiclePlate} (Atrasada há ${diffDays} dia${diffDays > 1 ? 's' : ''})`,
          timeLabel: `Venceu em ${new Date(r.return_date).toLocaleDateString('pt-BR')}`,
          reservation: r,
          color: 'text-rose-600 bg-rose-50 dark:bg-rose-955/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
          icon: 'warning',
        });
        return;
      }

      // Type 3: Coleta Amanhã
      if (isAwaitingOrInUse && returnDateOnly && returnDateOnly.getTime() === tomorrowOnly.getTime()) {
        list.push({
          id: `tomorrow-${r.id}`,
          type: 'collect_tomorrow',
          title: 'Coleta para Amanhã 📅',
          description: `${r.clientName} - Poltrona ${r.vehiclePlate}`,
          timeLabel: 'Agendado para amanhã',
          reservation: r,
          color: 'text-amber-600 bg-amber-50 dark:bg-amber-955/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
          icon: 'today',
        });
        return;
      }

      // 2. Check site requests
      if (r.origin === 'site' && r.status === 'aguardando retirada') {
        const createdAtDate = r.created_at ? new Date(r.created_at) : null;
        if (createdAtDate) {
          const hasPaidDeposit = r.observations?.includes('[CAUCAO_PAGO]');
          
          if (createdAtDate >= twoHoursAgo) {
            // Type 1: Nova solicitação do site (menos de 2h)
            list.push({
              id: `new-site-${r.id}`,
              type: 'new_site_req',
              title: 'Nova Reserva Online ✨',
              description: `${r.clientName} solicitou pelo site - Poltrona ${r.vehiclePlate}`,
              timeLabel: `Recebido às ${createdAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
              reservation: r,
              color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
              icon: 'fiber_new',
            });
          } else if (!hasPaidDeposit) {
            // Type 2: Solicitação do site sem caução (> 2h)
            const diffHours = Math.floor((now.getTime() - createdAtDate.getTime()) / (60 * 60 * 1000));
            list.push({
              id: `pending-deposit-${r.id}`,
              type: 'pending_deposit',
              title: 'Aguardando Caução ⏳',
              description: `${r.clientName} - Reserva no site há ${diffHours}h sem pagamento do caução.`,
              timeLabel: `Criada em ${createdAtDate.toLocaleDateString('pt-BR')} às ${createdAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
              reservation: r,
              color: 'text-sky-600 bg-sky-50 dark:bg-sky-955/20 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
              icon: 'hourglass_empty',
            });
          }
        }
      }
    });

    const priority = {
      collect_overdue: 0,
      pending_deposit: 1,
      new_site_req: 2,
      collect_tomorrow: 3
    };
    list.sort((a, b) => priority[a.type] - priority[b.type]);

    return list.map(item => ({
      ...item,
      isRead: item.type === 'pending_deposit' ? false : acknowledgedIds.includes(item.id)
    }));
  }, [reservations, acknowledgedIds]);

  const pendingCount = React.useMemo(() => {
    return notificationItems.filter(item => !item.isRead).length;
  }, [notificationItems]);

  const menuItems = [
    { id: 'DASHBOARD', path: '/dashboard', label: 'Painel', icon: 'dashboard', roles: ['admin', 'user'] },
    { id: 'CLIENTS', path: '/clients', label: 'Clientes', icon: 'group', roles: ['admin', 'user'] },
    { id: 'VEHICLES', path: '/vehicles', label: 'Poltronas', icon: 'chair', roles: ['admin', 'user'] },
    { id: 'RESERVATIONS', path: '/reservations', label: 'Reservas', icon: 'calendar_today', roles: ['admin', 'user'] },
    { id: 'SIGNATURE', path: '/signature', label: 'Assinatura Locador', icon: 'history_edu', roles: ['admin'] },
    { id: 'USERS', path: '/users', label: 'Usuários', icon: 'manage_accounts', roles: ['admin'] },
  ];

  const userRole = userProfile?.role || 'user';
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
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
 
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-955 overflow-y-auto">
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
            <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`hidden sm:flex size-10 items-center justify-center rounded-xl transition-all relative ${
                  pendingCount > 0 
                    ? 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="Notificações"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-bounce">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Popover list */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xl z-50 overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-lg">notifications_active</span>
                      <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Alertas Operacionais</h3>
                    </div>
                    {pendingCount > 0 && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        {pendingCount} ativo{pendingCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                    {notificationItems.length === 0 ? (
                      <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">notifications_off</span>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tudo sob controle!</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Nenhum alerta pendente no momento.</p>
                      </div>
                    ) : (
                      notificationItems.map(item => {
                        const borderClass = !item.isRead 
                          ? (item.type === 'collect_overdue' ? 'border-l-4 border-rose-500' :
                             item.type === 'collect_tomorrow' ? 'border-l-4 border-amber-500' :
                             item.type === 'new_site_req' ? 'border-l-4 border-emerald-500' :
                             'border-l-4 border-sky-500')
                          : 'border-l-4 border-transparent';

                        const bgClass = !item.isRead
                          ? (item.type === 'collect_overdue' ? 'bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/15' :
                             item.type === 'collect_tomorrow' ? 'bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15' :
                             item.type === 'new_site_req' ? 'bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15' :
                             'bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-500/10 dark:hover:bg-sky-500/15')
                          : 'opacity-65 hover:bg-slate-50 dark:hover:bg-slate-800/30';

                        return (
                          <div 
                            key={item.id}
                            onClick={() => {
                              if (item.type !== 'pending_deposit') {
                                handleAcknowledge(item.id);
                              }
                              navigate('/reservations');
                              setIsNotifOpen(false);
                            }}
                            className={`p-3.5 cursor-pointer flex gap-3 transition-all duration-200 group relative ${borderClass} ${bgClass}`}
                          >
                            <div className={`size-9 rounded-xl flex items-center justify-center border shrink-0 ${item.color}`}>
                              <span className="material-symbols-outlined text-base">{item.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                                {item.timeLabel && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">{item.timeLabel}</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed group-hover:text-primary dark:group-hover:text-brand-teal transition-colors font-medium">
                                {item.description}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                {item.type !== 'pending_deposit' ? (
                                  !item.isRead ? (
                                    <button
                                      onClick={(e) => handleAcknowledge(item.id, e)}
                                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md transition-colors"
                                      title="Marcar como ciente"
                                    >
                                      <span className="material-symbols-outlined text-[12px] font-black">done</span>
                                      Estou ciente
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">done_all</span>
                                      Ciente
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 bg-sky-500/10 px-2 py-0.5 rounded-md">
                                    <span className="material-symbols-outlined text-[12px]">hourglass_empty</span>
                                    Aguardando pagamento
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                    <button 
                      onClick={() => {
                        navigate('/reservations');
                        setIsNotifOpen(false);
                      }}
                      className="text-[10px] font-bold text-primary dark:text-brand-teal hover:underline tracking-wider uppercase"
                    >
                      Ver Todas as Reservas
                    </button>
                  </div>
                </div>
              )}
            </div>
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