import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import posleveLogoText from '../src/assets/posleve_logo_text.png';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Administrative bypass for presentation credentials
    if (email === 'adm@gmail.com' && password === 'adm') {
      const mockSession = {
        user: {
          id: 'c481dd65-85f1-41e0-bbe8-1a1c4a221fd0',
          email: 'administrador@posleve.com.br'
        }
      };
      localStorage.setItem('posleve-mock-session', JSON.stringify(mockSession));
      toast.success('Login administrativo realizado com sucesso!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
      return;
    }

    try {
      // Map the user's requested short password and email to compliant credentials behind the scenes
      const authEmail = (email === 'adm@gmail.com') ? 'administrador@posleve.com.br' : email;
      const authPassword = (email === 'adm@gmail.com' && password === 'adm') ? 'adm123' : password;

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#edf1f0] dark:bg-slate-950 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Orbs para fundo */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Botão Voltar */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-secondary font-bold text-sm transition-colors group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Voltar para o Site
      </button>
 
      <div className="w-full max-w-[460px] flex flex-col items-center relative z-10">
        <div className="mb-6 flex flex-col items-center">
          <img src={posleveLogoText} className="h-24 w-auto object-contain" alt="PÓS LEVE" />
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-3">Portal Administrativo</p>
        </div>
 
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-8 sm:p-10 transition-all">
          <h1 className="text-slate-800 dark:text-white text-xl font-display font-bold leading-tight tracking-tight text-center pb-8">
            Acesse sua conta
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3.5 rounded-xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm">
                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                <span className="font-medium">{error}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <p className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider pb-1.5 pl-1">Email Corporativo</p>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                  <input
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary h-12 placeholder:text-slate-400 pl-11 pr-4 text-sm font-semibold transition-all"
                    placeholder="exemplo@posleve.com.br"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </label>
            </div>
 
            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <div className="flex justify-between items-center pb-1.5">
                  <p className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider pl-1">Senha</p>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                  <input
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary h-12 placeholder:text-slate-400 pl-11 pr-4 text-sm font-semibold transition-all"
                    placeholder="Digite sua senha"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </label>
            </div>
 
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary/20 w-4 h-4 bg-slate-50 dark:bg-slate-800" type="checkbox" disabled={loading} />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold group-hover:text-primary transition-colors">Lembrar de mim</span>
              </label>
              <button type="button" className="text-primary dark:text-secondary text-xs font-bold hover:underline" disabled={loading}>Esqueci minha senha</button>
            </div>
 
            <div className="pt-4">
              <button
                className={`w-full bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary font-black py-3.5 px-6 rounded-xl hover:shadow-lg hover:shadow-accent-coral/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <span className="material-symbols-outlined text-lg">login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
 
        <footer className="mt-12 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-600">
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider">
            <button className="hover:text-primary dark:hover:text-secondary transition-colors">Suporte</button>
            <button className="hover:text-primary dark:hover:text-secondary transition-colors">Políticas</button>
            <button className="hover:text-primary dark:hover:text-secondary transition-colors">Termos</button>
          </div>
          <p className="text-[10px] font-semibold">© 2026 PÓS LEVE. v1.0.0</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;