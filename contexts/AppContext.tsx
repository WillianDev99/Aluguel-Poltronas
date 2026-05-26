import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import toast from 'react-hot-toast';

export interface AppContextType {
    session: any;
    profile: UserProfile | null;
    isDarkMode: boolean;
    loading: boolean;
    toggleDarkMode: () => void;
    logout: () => Promise<void>;
    repairSession: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);

    const repairSession = async () => {
        console.log('[Auth] Executando Hard Reset de sessão...');
        localStorage.removeItem('comfortcare-mock-session');
        await supabase.auth.signOut();
        localStorage.removeItem('comfortcare-auth-token');
        window.location.href = '/login';
        return true;
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // Check if there is a mock session active
                const mockSessionStr = localStorage.getItem('comfortcare-mock-session');
                if (mockSessionStr) {
                    const mockSession = JSON.parse(mockSessionStr);
                    if (mounted) {
                        setSession(mockSession);
                        setProfile({
                            id: mockSession.user.id,
                            email: mockSession.user.email,
                            role: 'admin',
                            full_name: 'Administrador ComfortCare'
                        });
                        setLoading(false);
                    }
                    return;
                }

                // Validação real com o servidor
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();
                
                if (error || !currentSession) {
                    if (mounted) {
                        setSession(null);
                        setLoading(false);
                    }
                    return;
                }

                if (mounted) {
                    setSession(currentSession);
                    
                    // Busca perfil apenas se a sessão for válida
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentSession.user.id)
                        .single();
                    
                    if (mounted && profileData) setProfile(profileData as UserProfile);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[Auth] Erro fatal na inicialização:', err);
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (!mounted) return;
            console.log(`[Auth] Evento: ${event}`);
            
            // Do not override if mock session exists
            if (localStorage.getItem('comfortcare-mock-session')) {
                return;
            }

            if (currentSession) {
                setSession(currentSession);
            } else {
                setSession(null);
                setProfile(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        if (isDarkMode) html.classList.add('dark');
        else html.classList.remove('dark');
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const logout = async () => {
        localStorage.removeItem('comfortcare-mock-session');
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        toast.success('Sessão encerrada');
    };

    return (
        <AppContext.Provider value={{
            session,
            profile,
            isDarkMode,
            loading,
            toggleDarkMode,
            logout,
            repairSession
        }}>
            {children}
        </AppContext.Provider>
    );
};