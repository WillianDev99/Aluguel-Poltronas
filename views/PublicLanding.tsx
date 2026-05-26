"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { Github, Shield, Award, ClipboardCheck, Sparkles } from 'lucide-react';

// Import assets
import comfortcareHero from '../src/assets/comfortcare_hero.png';
import comfortcareQuality from '../src/assets/comfortcare_quality.png';

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
    const message = `Olá! Gostaria de fazer um pré-cadastro para aluguel de poltrona pós-cirúrgica.%0A%0A*Nome:* ${formData.name}%0A*Telefone:* ${formData.phone}%0A*Modelo de interesse:* ${formData.vehicle}%0A*Data pretendida para entrega:* ${formData.date}`;
    window.open(`https://wa.me/5588994906873?text=${message}`, '_blank');
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-primary selection:text-white">
      {/* Glow Orbs de Fundo para Estética Moderna */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navbar Glassmorphism */}
      <nav className="fixed top-0 w-full z-50 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-2xl text-white">medical_services</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-display font-black text-primary dark:text-white tracking-tight leading-none">COMFORTCARE</span>
            <span className="text-[9px] font-bold text-secondary tracking-widest uppercase mt-0.5">Saúde & Bem-Estar</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <a href="#acervo" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Nosso Acervo</a>
            <a href="#sobre" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Quem Somos</a>
            <a href="#contato" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all">Contato</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-full font-bold text-xs hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">lock</span>
            Área Restrita
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
        <div className="space-y-8 lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary dark:text-secondary rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Cuidado e Conforto no Pós-Operatório
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
            Sua recuperação com o <span className="bg-gradient-to-r from-primary via-secondary to-accent-sky bg-clip-text text-transparent">máximo de conforto</span> e segurança.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
            Locação de poltronas pós-cirúrgicas reclináveis (motorizadas e manuais). Garantimos higienização profunda de grau clínico e entrega expressa diretamente no seu domicílio.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a href="#acervo" className="px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center gap-2">
              <span>Explorar Poltronas</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </a>
            <a href="#cadastro" className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Solicitar Locação
            </a>
          </div>

          {/* Mini Trust Stats */}
          <div className="pt-6 grid grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-800 max-w-lg">
            <div>
              <p className="text-3xl font-display font-black text-primary dark:text-secondary">100%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Esterilizado</p>
            </div>
            <div>
              <p className="text-3xl font-display font-black text-primary dark:text-secondary">24h</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Suporte Técnico</p>
            </div>
            <div>
              <p className="text-3xl font-display font-black text-primary dark:text-secondary">Rápido</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Entrega no Quarto</p>
            </div>
          </div>
        </div>

        {/* Hero Image Component */}
        <div className="relative lg:col-span-5 flex justify-center">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-secondary/15 rounded-3xl blur-2xl opacity-75"></div>
          <div className="relative rounded-3xl overflow-hidden border border-white dark:border-slate-800 shadow-2xl aspect-[4/3] w-full max-w-md bg-white">
            <img 
              src={comfortcareHero} 
              alt="Poltrona ComfortCare de Recuperação" 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
            {/* Clinical Floating Badge */}
            <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="size-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Padrão Hospitalar</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Higienização Profunda Garantida</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section (Acervo) */}
      <section id="acervo" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex p-2 bg-primary/10 text-primary rounded-xl mb-2">
              <span className="material-symbols-outlined">chair</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Nosso Acervo</h2>
            <div className="w-16 h-1 bg-secondary mx-auto rounded-full"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Modelos ergonômicos e clínicos projetados especificamente para aliviar a pressão corporal e auxiliar na reabilitação pós-cirúrgica.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
              <p className="text-slate-400 font-semibold text-sm">Carregando poltronas disponíveis...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-slate-50 dark:bg-slate-850 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    {/* Imagem do Produto */}
                    <div className="aspect-[16/11] overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                          <span className="material-symbols-outlined text-5xl">chair</span>
                          <span className="text-xs font-bold mt-2">Imagem Indisponível</span>
                        </div>
                      )}
                      
                      {/* Categoria Badge */}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full text-[9px] font-black uppercase tracking-widest text-primary dark:text-secondary shadow-sm">
                        {v.category}
                      </div>

                      {/* Motor / Manual Badge */}
                      <div className="absolute bottom-4 left-4 px-2.5 py-1 bg-primary/95 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-xs">{v.transmission === 'Automático' ? 'bolt' : 'handyman'}</span>
                        {v.transmission === 'Automático' ? 'Elétrica (Controle)' : 'Manual Reclinável'}
                      </div>
                    </div>

                    {/* Detalhes do Produto */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-lg font-display font-bold text-slate-950 dark:text-white truncate group-hover:text-primary dark:group-hover:text-secondary transition-colors uppercase">{v.model}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{v.brand} • Cor: {v.color || 'Padrão'}</p>
                      </div>

                      {/* Mini features clínicas fictícias baseadas nas poltronas */}
                      <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <li className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-500 text-base">check_small</span>
                          Estofado Impermeável Antialérgico
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-500 text-base">check_small</span>
                          Densidade D33 Ortopédica
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-500 text-base">check_small</span>
                          Sanitização clínica profunda
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Locação Mensal</p>
                      <p className="text-sm font-black text-primary dark:text-secondary">Sob Consulta</p>
                    </div>
                    <button 
                      onClick={() => {
                        setFormData({...formData, vehicle: `${v.brand} ${v.model}`});
                        document.getElementById('cadastro')?.scrollIntoView({behavior: 'smooth'});
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 text-primary dark:text-white font-bold text-xs rounded-xl hover:from-primary hover:to-primary hover:text-white transition-all duration-300 uppercase tracking-wider"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Missão e Qualidade Section */}
      <section id="sobre" className="py-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1 relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-secondary/5 to-primary/10 rounded-3xl blur-2xl"></div>
          <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <img 
              src={comfortcareQuality} 
              alt="Esterilização e Preparação de Equipamentos" 
              className="w-full aspect-[16/10] object-cover hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
          </div>
        </div>
        
        <div className="lg:col-span-6 space-y-8 order-1 lg:order-2">
          <div className="inline-flex p-2 bg-secondary/15 text-primary rounded-xl">
            <span className="material-symbols-outlined">health_and_safety</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Compromisso com a sua Saúde</h2>
          <div className="w-16 h-1 bg-secondary rounded-full"></div>
          
          <div className="space-y-6 text-slate-600 dark:text-slate-350 font-medium leading-relaxed">
            <p>
              A <span className="font-bold text-primary">ComfortCare</span> foi idealizada a partir do propósito de fornecer dignidade, conforto e segurança ativa durante o repouso pós-operatório na Serra da Ibiapaba. O repouso clínico adequado com elevação de membros e coluna reduz dores e acelera a cicatrização.
            </p>
            <p>
              Com alto rigor sanitário, cada poltrona passa por um processo de desinfecção estrito com agentes hospitalares bactericidas e virucidas antes do envio. Nossa equipe realiza a montagem direta no quarto do paciente, demonstrando o funcionamento para familiares.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md grid sm:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">sanitizer</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sanitização Clínica</h4>
                <p className="text-xs text-slate-500 mt-0.5">Esterilização profunda em cada entrega.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">local_shipping</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Entrega no Quarto</h4>
                <p className="text-xs text-slate-500 mt-0.5">Montagem e ajuste no local do paciente.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">healing</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ergonomia de Cura</h4>
                <p className="text-xs text-slate-500 mt-0.5">Ângulos de reclinação ideais recomendados.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">support_agent</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Suporte Domiciliar</h4>
                <p className="text-xs text-slate-500 mt-0.5">Acompanhamento e ajuste do controle.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Registration Form Section */}
      <section id="cadastro" className="py-24 bg-primary text-white relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center relative z-10">
          <div className="space-y-6 lg:col-span-5">
            <div className="inline-flex p-2.5 bg-white/10 rounded-xl">
              <span className="material-symbols-outlined text-secondary text-2xl">event_available</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black leading-tight uppercase tracking-tight">
              Reserve sua <span className="bg-gradient-to-r from-secondary to-white bg-clip-text text-transparent">Poltrona</span> agora.
            </h2>
            <p className="text-white/80 font-medium text-base">
              Preencha o formulário para fazer sua solicitação. Nosso plantão técnico receberá o chamado e entrará em contato via WhatsApp em poucos minutos para coordenar a entrega e o contrato.
            </p>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="material-symbols-outlined text-secondary text-3xl">bolt</span>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">Atendimento Agilizado</p>
                <p className="text-xs text-white/60 mt-0.5">Instalação e montagem domiciliar no mesmo dia.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 lg:col-span-7 max-w-xl mx-auto w-full">
            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-secondary">assignment</span>
              Dados para Pré-Cadastro
            </h3>
            <form onSubmit={handleWhatsAppSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome Completo do Responsável</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                  <input 
                    required
                    type="text" 
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    placeholder="Nome de quem vai alugar"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp de Contato</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
                    <input 
                      required
                      type="tel" 
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      placeholder="(88) 99999-9999"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data de Entrega</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">calendar_today</span>
                    <input 
                      required
                      type="date" 
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Modelo da Poltrona desejada</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">chair</span>
                  <select 
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none"
                    value={formData.vehicle}
                    onChange={e => setFormData({...formData, vehicle: e.target.value})}
                  >
                    <option value="">Selecione para escolher (opcional)</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={`${v.brand} ${v.model}`}>{v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">send</span>
                Enviar Solicitação via WhatsApp
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Onde Estamos e Horários */}
      <section id="contato" className="py-24 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-12">
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight">Onde Estamos</h2>
            <p className="text-slate-400 font-medium text-base">Fale conosco ou venha conhecer nosso show-room de poltronas de reabilitação pós-cirúrgica.</p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nosso Endereço</p>
                  <p className="text-base font-bold text-slate-200">Rua Monsenhor Franklin, nº 354, Centro - Tianguá, CE, 62320-000</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Telefone de Contato</p>
                  <p className="text-base font-bold text-slate-200">(88) 9 9490-6873</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">E-mail de Contato</p>
                  <p className="text-base font-bold text-slate-200">contato@comfortcaretiangua.com.br</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-8">
            <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-video relative group bg-slate-800">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3979.968!2d-40.9888!3d-3.7168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM8KwNDMnMDAuNSJTIDQwwrA1OScxOS43Ilc!5e0!3m2!1spt-BR!2sbr!4v1620000000000!5m2!1spt-BR!2sbr" 
                className="w-full h-full grayscale invert opacity-75 group-hover:grayscale-0 group-hover:invert-0 group-hover:opacity-100 transition-all duration-700 border-none"
                loading="lazy"
              ></iframe>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-200">
                <span className="material-symbols-outlined text-secondary">schedule</span>
                Horário de Funcionamento
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/40">
                  <span className="text-xs font-semibold text-slate-400">Segunda a Sexta</span>
                  <span className="text-sm font-bold text-secondary">07:30 - 18:30</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/40">
                  <span className="text-xs font-semibold text-slate-400">Sábado</span>
                  <span className="text-sm font-bold text-secondary">08:00 - 14:00</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">emergency_home</span>
                    <span className="text-xs font-bold text-slate-200">Domingo / Emergências</span>
                  </div>
                  <span className="text-xs font-black text-secondary uppercase tracking-wider">Plantão Técnico</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400 border-t border-slate-900 text-center text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-primary">medical_services</span>
              <p className="font-semibold text-slate-500">© 2026 ComfortCare. Todos os direitos reservados.</p>
            </div>
            <div className="flex flex-wrap gap-6 mt-1">
              <a 
                href="https://github.com/WillianDev99" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
              >
                <Github size={14} />
                <span>WillianDev99</span>
              </a>
              <a 
                href="https://github.com/bpaivo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
              >
                <Github size={14} />
                <span>bpaivo</span>
              </a>
            </div>
          </div>
          <div className="flex gap-6 font-bold uppercase tracking-wider text-[10px] text-slate-500">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Políticas</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;