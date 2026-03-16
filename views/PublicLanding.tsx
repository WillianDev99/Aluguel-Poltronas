"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { Github } from 'lucide-react';

// Import assets
import locadoraFachada from '../src/assets/locadora_fachada.webp';
import midasVideo from '../src/assets/midas_video.mp4';

const PublicLanding: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle: '',
    date: ''
  });

  useEffect(() => {
    const fetchFleet = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'Disponível')
        .limit(8);
      if (data) setVehicles(data);
      setLoading(false);
    };
    fetchFleet();
  }, []);

  const handleWhatsAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Gostaria de fazer um pré-cadastro para aluguel.%0A%0A*Nome:* ${formData.name}%0A*Telefone:* ${formData.phone}%0A*Veículo de interesse:* ${formData.vehicle}%0A*Data pretendida:* ${formData.date}`;
    window.open(`https://wa.me/5588994906873?text=${message}`, '_blank');
  };

  return (
    <div className="bg-white text-slate-900 font-display selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/Logo-verde.png" alt="Midas Logo" className="h-10 w-auto" />
          <span className="text-xl font-black text-primary tracking-tighter hidden sm:block">MIDAS RENT A CAR</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600 uppercase tracking-widest">
            <a href="#frota" className="hover:text-primary transition-colors">Nossa Frota</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre Nós</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-primary text-white rounded-full font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Área Restrita
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-sunshine/20 text-primary rounded-full text-xs font-black uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            DIRIJA SUA LIBERDADE
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-primary leading-[1.1] tracking-tight">
            Midas <span className="text-accent-sunshine">Rent a Car</span>: Sua Viagem em Boas Mãos.
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-xl leading-relaxed">
            A melhor frota de Tianguá e região. Veículos revisados, atendimento personalizado e a agilidade que você precisa para chegar ao seu destino.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#frota" className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20">
              Ver Veículos
            </a>
            <a href="#cadastro" className="px-8 py-4 bg-slate-100 text-primary rounded-xl font-bold text-lg hover:bg-slate-200 transition-all">
              Pré-Cadastro
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-accent-sunshine/10 rounded-[2rem] blur-2xl"></div>
          <img 
            src={locadoraFachada} 
            alt="Fachada Midas" 
            className="relative rounded-[2rem] shadow-2xl border-8 border-white object-cover aspect-[4/3] w-full"
          />
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hidden sm:block">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">Segurança Garantida</p>
                <p className="text-xs text-slate-500 font-bold">Excelência em Locação</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section id="frota" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-primary uppercase tracking-tight">Nossa Frota</h2>
            <div className="w-24 h-1.5 bg-accent-sunshine mx-auto rounded-full"></div>
            <p className="text-slate-500 font-medium">Escolha o carro ideal para sua necessidade</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-slate-100">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {v.image_url ? (
                      <img src={v.image_url} alt={v.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <span className="material-symbols-outlined text-6xl">directions_car</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                      {v.category}
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-primary uppercase truncate">{v.model}</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{v.brand} • {v.year}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">settings</span>
                        <span className="text-xs font-bold">{v.transmission}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setFormData({...formData, vehicle: `${v.brand} ${v.model}`});
                          document.getElementById('cadastro')?.scrollIntoView({behavior: 'smooth'});
                        }}
                        className="text-xs font-black text-primary hover:text-accent-sunshine transition-colors uppercase tracking-widest"
                      >
                        Reservar Agora
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* History Section */}
      <section id="sobre" className="py-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1 relative">
          <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-xl"></div>
          <video 
            src={midasVideo} 
            className="relative rounded-3xl shadow-2xl w-full aspect-video object-cover border-4 border-white"
            autoPlay 
            muted 
            loop 
            playsInline
            controls
          />
        </div>
        <div className="space-y-8 order-1 lg:order-2">
          <h2 className="text-4xl font-black text-primary uppercase tracking-tight">Nossa História</h2>
          <div className="w-20 h-1.5 bg-accent-sunshine rounded-full"></div>
          <div className="space-y-6 text-slate-600 font-medium leading-relaxed">
            <p>
              A <span className="font-bold text-primary">Midas Rent a Car</span> nasceu com o propósito de transformar a mobilidade em Tianguá e em toda a Serra da Ibiapaba. Percebemos que para garantir a satisfação total dos nossos clientes, precisávamos oferecer mais que apenas carros: precisávamos oferecer confiança.
            </p>
            <p>
              Iniciamos nossas operações focados na excelência do atendimento e na manutenção rigorosa de nossa frota. Nossa dedicação em proporcionar a melhor experiência de locação nos permitiu expandir rapidamente, tornando-nos referência no setor.
            </p>
          </div>
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
            <h4 className="flex items-center gap-3 text-primary font-black uppercase tracking-widest">
              <span className="material-symbols-outlined text-accent-sunshine">language</span>
              Nossa Atuação
            </h4>
            <ul className="space-y-4">
              {[
                'Frota diversificada para todos os perfis.',
                'Cobertura completa em Tianguá e região.',
                'Atendimento personalizado e humanizado.',
                'Foco em pontualidade e segurança do veículo.'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <span className="material-symbols-outlined text-primary text-lg">arrow_forward</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pre-Registration Form */}
      <section id="cadastro" className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-accent-sunshine/5 -skew-x-12 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-black leading-tight uppercase tracking-tight">
              Faça seu <span className="text-accent-sunshine">Pré-Cadastro</span> agora mesmo.
            </h2>
            <p className="text-white/70 font-medium text-lg">
              Preencha os dados ao lado e nossa equipe entrará em contato via WhatsApp para finalizar sua reserva em poucos minutos.
            </p>
            <div className="flex items-center gap-6">
              <div className="size-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-accent-sunshine">bolt</span>
              </div>
              <div>
                <p className="text-lg font-black uppercase">Atendimento Ágil</p>
                <p className="text-white/50 font-bold">Resposta em até 15 minutos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl">
            <form onSubmit={handleWhatsAppSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full h-14 bg-slate-50 border-none rounded-xl px-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                  placeholder="Como podemos te chamar?"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full h-14 bg-slate-50 border-none rounded-xl px-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                    placeholder="(00) 0 0000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Pretendida</label>
                  <input 
                    required
                    type="date" 
                    className="w-full h-14 bg-slate-50 border-none rounded-xl px-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo de Interesse</label>
                <select 
                  className="w-full h-14 bg-slate-50 border-none rounded-xl px-4 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                  value={formData.vehicle}
                  onChange={e => setFormData({...formData, vehicle: e.target.value})}
                >
                  <option value="">Selecione um veículo (opcional)</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={`${v.brand} ${v.model}`}>{v.brand} {v.model}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined">chat</span>
                Enviar para WhatsApp
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Contact & Map Section */}
      <section id="contato" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            <h2 className="text-4xl font-black uppercase tracking-tight">Onde Estamos</h2>
            <p className="text-white/60 font-medium text-lg">Visite nossa base operacional ou entre em contato pelas nossas redes sociais.</p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="size-12 rounded-xl bg-accent-sunshine text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">Endereço</p>
                  <p className="text-lg font-bold">Av. Pref. Jaques Nunes - Tianguá, CE, 62320-000</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="size-12 rounded-xl bg-accent-sunshine text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">Telefone</p>
                  <p className="text-lg font-bold">(88) 9 9490-6873</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="size-12 rounded-xl bg-accent-sunshine text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">photo_camera</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">Instagram</p>
                  <a href="https://instagram.com/midas.rentacar" target="_blank" className="text-lg font-bold hover:text-accent-sunshine transition-colors">@midas.rentacar</a>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div className="rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl aspect-video relative group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3979.968!2d-40.9888!3d-3.7168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM8KwNDMnMDAuNSJTIDQwwrA1OScxOS43Ilc!5e0!3m2!1spt-BR!2sbr!4v1620000000000!5m2!1spt-BR!2sbr" 
                className="w-full h-full grayscale invert contrast-125 opacity-80 group-hover:grayscale-0 group-hover:invert-0 group-hover:opacity-100 transition-all duration-700"
                loading="lazy"
              ></iframe>
            </div>
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
              <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-sunshine">schedule</span>
                Horário de Atendimento
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-accent-sunshine">calendar_today</span>
                    <span className="text-sm font-bold uppercase tracking-wider">Segunda a Sexta</span>
                  </div>
                  <span className="text-lg font-black text-accent-sunshine">08:00 - 18:00</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-accent-sunshine">event</span>
                    <span className="text-sm font-bold uppercase tracking-wider">Sábado</span>
                  </div>
                  <span className="text-lg font-black text-accent-sunshine">08:00 - 13:00</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-rose-400">block</span>
                    <span className="text-sm font-bold uppercase tracking-wider text-rose-400">Domingo</span>
                  </div>
                  <span className="text-sm font-black text-rose-400 uppercase tracking-widest">Fechado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <img src="/Logo-verde.png" alt="Midas Logo" className="h-8 w-auto" />
              <p className="text-sm font-bold text-slate-400">© 2024 Midas Rent a Car. Todos os direitos reservados.</p>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-8">
              <a 
                href="https://github.com/WillianDev99" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <Github size={18} />
                <span>WillianDev99</span>
              </a>
              <a 
                href="https://github.com/bpaivo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <Github size={18} />
                <span>bpaivo</span>
              </a>
            </div>
          </div>
          <div className="flex gap-8 text-xs font-black text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;