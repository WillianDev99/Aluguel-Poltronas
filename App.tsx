"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Client, Vehicle, Reservation } from './types';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useApp } from './hooks/useApp';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy Views
const PublicLanding = React.lazy(() => import('./views/PublicLanding'));
const Login = React.lazy(() => import('./views/Login'));
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const ClientsView = React.lazy(() => import('./views/ClientsView'));
const VehiclesView = React.lazy(() => import('./views/VehiclesView'));
const ReservationsView = React.lazy(() => import('./views/ReservationsView'));
const UsersView = React.lazy(() => import('./views/UsersView'));
const PublicContractSignatureView = React.lazy(() => import('./views/PublicContractSignatureView'));
// Components
import Layout from './components/Layout';
import VoucherModal from './components/VoucherModal';
import ReservationModal from './components/ReservationModal';
import ProfileModal from './components/ProfileModal';

const sanitizeEmptyStrings = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj } as any;
  for (const key in sanitized) {
    if (sanitized[key] === '') {
      sanitized[key] = null;
    }
  }
  return sanitized;
};

const MainContent: React.FC = () => {
  const { session, profile, isDarkMode, toggleDarkMode, logout, repairSession } = useApp();
  const [selectedVoucherRes, setSelectedVoucherRes] = useState<Reservation | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  
  const isFetching = useRef(false);

  const fetchData = useCallback(async (options: { isManual?: boolean } = {}) => {
    if (!session?.user?.id || isFetching.current) return;
    
    isFetching.current = true;
    if (!options.isManual) setIsLoading(true);
    const toastId = options.isManual ? toast.loading('Sincronizando...') : null;

    try {
      const [cRes, vRes, rRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('reservations').select('*')
      ]);

      if (cRes.error) throw cRes.error;
      if (vRes.error) throw vRes.error;
      if (rRes.error) throw rRes.error;

      const currentClients = cRes.data || [];
      const currentVehicles = vRes.data || [];
      const currentReservations = rRes.data || [];

      setClients(currentClients);
      setVehicles(currentVehicles);

      // Auto-clean database of SEM_CHASSIS and SEM_RENAVAN
      const dirtyVehicles = currentVehicles.filter(v => v.chassis?.includes('SEM_CHASSIS') || v.renavan === 'SEM_RENAVAN');
      if (dirtyVehicles.length > 0) {
        Promise.all(dirtyVehicles.map(async (v) => {
          const cleanChassis = v.chassis?.includes('SEM_CHASSIS') ? 'Controle remoto, Reclinável 160°' : v.chassis;
          const cleanRenavan = v.renavan === 'SEM_RENAVAN' ? '85 x 90 x 105 cm' : v.renavan;
          await supabase.from('vehicles').update({ chassis: cleanChassis, renavan: cleanRenavan }).eq('id', v.id);
        })).then(() => {
          fetchData({ isManual: false });
        });
      }

      const transformed: Reservation[] = currentReservations.map((r: any) => {
        const client = currentClients.find(c => c.id === r.client_id);
        const vehicle = currentVehicles.find(v => v.id === r.vehicle_id);
        return {
          ...r,
          clientName: client?.name || 'N/A',
          vehicleModel: vehicle?.model || 'N/A',
          vehiclePlate: vehicle?.plate || '---',
          dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
        };
      });
      
      setReservations(transformed);
      if (options.isManual) toast.success('Dados atualizados!', { id: toastId || undefined });

    } catch (error: any) {
      console.error('[App] Erro ao buscar dados:', error);
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        toast.error('Sessão expirada. Reiniciando...');
        repairSession();
      } else {
        toast.error('Erro de conexão com o banco de dados.', { id: toastId || undefined });
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [session?.user?.id, repairSession]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Layout
      onLogout={logout}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      userProfile={profile}
      onAddReservation={() => setIsReservationModalOpen(true)}
      onViewProfile={() => setIsProfileModalOpen(true)}
      reservations={reservations}
    >
      <button 
        onClick={() => fetchData({ isManual: true })}
        className="fixed bottom-6 right-6 z-50 size-12 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
      >
        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">sync</span>
      </button>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <Dashboard
              isLoading={isLoading}
              vehicles={vehicles}
              reservations={reservations}
              recentReservations={reservations.slice(0, 5)}
            />
          } />
          <Route path="/clients" element={
            <ClientsView
              clients={clients}
              isLoading={isLoading}
              onAddClient={async (c) => {
                const { data, error } = await supabase.from('clients').insert([sanitizeEmptyStrings(c)]).select();
                if (error) throw error;
                if (data && data[0]) setClients(prev => [data[0], ...prev]);
              }}
              onUpdateClient={async (id, c) => {
                const { data, error } = await supabase.from('clients').update(sanitizeEmptyStrings(c)).eq('id', id).select();
                if (error) throw error;
                if (data && data[0]) setClients(prev => prev.map(item => item.id === id ? data[0] : item));
              }}
              onDeleteClient={async (id) => {
                const { error } = await supabase.from('clients').delete().eq('id', id);
                if (error) throw error;
                setClients(prev => prev.filter(item => item.id !== id));
              }}
            />
          } />
          <Route path="/vehicles" element={
            <VehiclesView
              vehicles={vehicles}
              reservations={reservations}
              clients={clients}
              isLoading={isLoading}
              onAddVehicle={async (v) => {
                const { data, error } = await supabase.from('vehicles').insert([sanitizeEmptyStrings(v)]).select();
                if (error) throw error;
                if (data && data[0]) setVehicles(prev => [data[0], ...prev]);
              }}
              onUpdateVehicle={async (id, v) => {
                const { data, error } = await supabase.from('vehicles').update(sanitizeEmptyStrings(v)).eq('id', id).select();
                if (error) throw error;
                if (data && data[0]) setVehicles(prev => prev.map(item => item.id === id ? data[0] : item));
              }}
              onDeleteVehicle={async (id) => {
                const { error } = await supabase.from('vehicles').delete().eq('id', id);
                if (error) throw error;
                setVehicles(prev => prev.filter(item => item.id !== id));
              }}
            />
          } />
          <Route path="/reservations" element={
            <ReservationsView
              reservations={reservations}
              clients={clients}
              vehicles={vehicles}
              isLoading={isLoading}
              onEmitVoucher={setSelectedVoucherRes}
              onUpdateReservation={async (id, updates) => {
                const { data, error } = await supabase.from('reservations').update(sanitizeEmptyStrings(updates)).eq('id', id).select('*');
                if (error) throw error;
                if (data && data[0]) {
                  const client = clients.find(c => c.id === data[0].client_id);
                  const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
                  const transformed = {
                    ...data[0],
                    clientName: client?.name || 'N/A',
                    vehicleModel: vehicle?.model || 'N/A',
                    vehiclePlate: vehicle?.plate || '---',
                    dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                  };
                  setReservations(prev => prev.map(item => item.id === id ? transformed : item));
                }
              }}
              onUpdateVehicle={async (id, updates) => {
                const { data, error } = await supabase.from('vehicles').update(sanitizeEmptyStrings(updates)).eq('id', id).select('*');
                if (error) throw error;
                if (data && data[0]) {
                  setVehicles(prev => prev.map(item => item.id === id ? data[0] : item));
                }
              }}
              onAddReservation={async (r) => {
                const { data, error } = await supabase.from('reservations').insert([sanitizeEmptyStrings(r)]).select('*');
                if (error) throw error;
                if (data && data[0]) {
                  const client = clients.find(c => c.id === data[0].client_id);
                  const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
                  const transformed = {
                    ...data[0],
                    clientName: client?.name || 'N/A',
                    vehicleModel: vehicle?.model || 'N/A',
                    vehiclePlate: vehicle?.plate || 'N/A',
                    dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                  };
                  setReservations(prev => [transformed, ...prev]);
                }
              }}
              onDeleteReservation={async (id) => {
                const { error } = await supabase.from('reservations').delete().eq('id', id);
                if (error) throw error;
                setReservations(prev => prev.filter(item => item.id !== id));
              }}
            />
          } />
          <Route path="/users" element={profile?.role === 'admin' ? <UsersView /> : <Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>

      {selectedVoucherRes && (
        <VoucherModal
          reservation={selectedVoucherRes}
          client={clients.find(c => c.id === selectedVoucherRes.client_id)}
          vehicle={vehicles.find(v => v.id === selectedVoucherRes.vehicle_id)}
          onClose={() => setSelectedVoucherRes(null)}
        />
      )}

      {isReservationModalOpen && (
        <ReservationModal
          clients={clients}
          vehicles={vehicles}
          onClose={() => setIsReservationModalOpen(false)}
          onSave={async (r) => {
            const { data, error } = await supabase.from('reservations').insert([sanitizeEmptyStrings(r)]).select('*');
            if (error) throw error;
            if (data && data[0]) {
              const client = clients.find(c => c.id === data[0].client_id);
              const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
              const transformed = {
                ...data[0],
                clientName: client?.name || 'N/A',
                vehicleModel: vehicle?.model || 'N/A',
                vehiclePlate: vehicle?.plate || 'N/A',
                dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
              };
              setReservations(prev => [transformed, ...prev]);
              toast.success('Reserva confirmada!');
              setIsReservationModalOpen(false);
            }
          }}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal userProfile={profile} onClose={() => setIsProfileModalOpen(false)} />
      )}
    </Layout>
  );
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-slate-200 dark:border-slate-800 border-t-primary rounded-full animate-spin"></div>
          <p className="text-primary/60 font-bold animate-pulse">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useApp();

  useEffect(() => {
    if (session && window.location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  return (
    <>
      <Toaster position="top-right" />
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="size-10 border-4 border-slate-200 dark:border-slate-800 border-t-primary/40 rounded-full animate-spin"></div></div>}>
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          <Route path="/login" element={<Login onLogin={() => navigate('/dashboard', { replace: true })} />} />
          <Route path="/contrato/:contractId/assinar" element={<PublicContractSignatureView />} />
          <Route path="/*" element={<AuthGuard><MainContent /></AuthGuard>} />
        </Routes>
      </React.Suspense>
    </>
  );
};

export default App;