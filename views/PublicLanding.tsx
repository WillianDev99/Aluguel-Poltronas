"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { Github, Shield, Award, ClipboardCheck, Sparkles, X, Printer, Send, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Calendar from '../components/Calendar';

// Import assets
import comfortcareHero from '../src/assets/comfortcare_hero.png';
import comfortcareQuality from '../src/assets/comfortcare_quality.png';

const ADDITIONAL_SERVICES = [
  { id: 'higienizacao', name: 'Higienização Avançada Extra', price: 50.00, type: 'fixed' },
  { id: 'travesseiro_ortopedico', name: 'Travesseiro Ortopédico de Apoio', price: 15.00, type: 'fixed' },
  { id: 'entrega_urgente', name: 'Entrega Expressa / Urgente', price: 40.00, type: 'fixed' },
];

const INSURANCE_COVERAGES = [
  "HIGIENIZAÇÃO COMPLETA ANTI-ALÉRGICA DE GRAU HOSPITALAR",
  "GARANTIA DE SUBSTITUIÇÃO EM CASO DE FALHA MECÂNICA EM ATÉ 12H",
  "ASSISTÊNCIA TÉCNICA E AJUSTES DE RECLINAÇÃO EM DOMICÍLIO",
  "ESTOFADO IMPERMEÁVEL COM TRATAMENTO ANTIBACTERIANO E ANTIFÚNGICO",
  "COBERTURA CONTRA DESGASTE NATURAL DE MOTORES E ARTICULAÇÕES",
  "TESTE DE SEGURANÇA E PARADAS DE EMERGÊNCIA REALIZADOS ANTES DA ENTREGA"
];

// Helper functions for date formatting
const getTomorrowDateTime = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
};

const getSevenDaysLaterDateTime = () => {
  const date = new Date();
  date.setDate(date.getDate() + 8);
  date.setHours(18, 0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const PublicLanding: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bottom form state
  const [bottomForm, setBottomForm] = useState({
    name: '',
    phone: '',
    vehicleId: '',
    date: ''
  });

  // Modal states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    vehicleId: '',
    pickupDate: '',
    returnDate: '',
    selectedServices: [] as string[],
    
    // Client Info
    cpf: '',
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    rg: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    
    // Base64 document attachments
    docBase64: '',
    addressProofBase64: '',
    selfieBase64: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any | null>(null);

  // Availability calendar states
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchAvailability = async (vehicleId: string) => {
    setIsLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('pickup_date, return_date')
        .eq('vehicle_id', vehicleId)
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (error) throw error;

      if (data) {
        setOccupiedRanges(data.map(r => ({
          start: new Date(r.pickup_date),
          end: new Date(r.return_date)
        })));
      } else {
        setOccupiedRanges([]);
      }
    } catch (err) {
      console.error('Erro ao buscar disponibilidade:', err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (bookingForm.vehicleId) {
      fetchAvailability(bookingForm.vehicleId);
      // Reset dates when changing vehicle to guarantee they select valid dates on the calendar
      setBookingForm(prev => ({
        ...prev,
        pickupDate: '',
        returnDate: ''
      }));
    } else {
      setOccupiedRanges([]);
    }
  }, [bookingForm.vehicleId]);

  useEffect(() => {
    const fetchFleet = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'Disponível');
      if (data) setVehicles(data);
      setLoading(false);
    };
    fetchFleet();
  }, []);

  // Format inputs
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Automatic CEP lookup
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCEP(e.target.value);
    setBookingForm(prev => ({ ...prev, cep: masked }));

    const cleanCep = masked.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setBookingForm(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
          toast.success('Endereço autocompletado com sucesso!');
        } else {
          toast.error('CEP não localizado.');
        }
      } catch (err) {
        console.error("Erro no fetch do CEP:", err);
      }
    }
  };

  // Automatic CPF client lookup
  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCPF(e.target.value);
    setBookingForm(prev => ({ ...prev, cpf: masked }));

    const cleanCpf = masked.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('cpf', cleanCpf);
        
        if (data && data.length > 0) {
          const client = data[0];
          toast.success('Cadastro existente encontrado! Preenchendo dados...');
          setBookingForm(prev => ({
            ...prev,
            name: client.name || '',
            email: client.email || '',
            phone: maskPhone(client.phone || ''),
            birthDate: client.birth_date || '',
            rg: client.rg || '',
            cep: maskCEP(client.cep || ''),
            street: client.street || '',
            number: client.number || '',
            neighborhood: client.neighborhood || '',
            city: client.city || '',
            state: client.state || '',
            docBase64: client.cnh_url || '',
            addressProofBase64: client.address_proof_url || '',
            selfieBase64: client.selfie_url || ''
          }));
        }
      } catch (err) {
        console.error("Erro no lookup do CPF:", err);
      }
    }
  };

  // Convert uploaded files to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'docBase64' | 'addressProofBase64' | 'selfieBase64') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem excede o tamanho máximo de 2MB.');
        return;
      }
      try {
        const base64 = await convertFileToBase64(file);
        setBookingForm(prev => ({ ...prev, [field]: base64 }));
        toast.success('Imagem carregada com sucesso!');
      } catch (err) {
        toast.error('Erro ao processar imagem.');
      }
    }
  };

  // Totals calculations
  const calculateBookingTotals = () => {
    if (!bookingForm.pickupDate || !bookingForm.returnDate || !selectedVehicle) {
      return { days: 0, subtotal: 0, dailyRate: 0, servicesTotal: 0 };
    }
    const pickup = new Date(bookingForm.pickupDate);
    const returnD = new Date(bookingForm.returnDate);
    const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const dailyRate = selectedVehicle.daily_rate || 15;
    let servicesTotal = 0;
    bookingForm.selectedServices.forEach(srvId => {
      const srv = ADDITIONAL_SERVICES.find(s => s.id === srvId);
      if (srv) {
        servicesTotal += srv.price;
      }
    });
    
    const subtotal = (days * dailyRate) + servicesTotal;
    return { days, subtotal, dailyRate, servicesTotal };
  };

  const totals = calculateBookingTotals();

  // Step transitions
  const handleNextStep1 = async () => {
    if (!bookingForm.vehicleId) {
      toast.error('Selecione uma poltrona.');
      return;
    }
    if (!bookingForm.pickupDate || !bookingForm.returnDate) {
      toast.error('Preencha as datas de entrega e coleta.');
      return;
    }
    if (new Date(bookingForm.returnDate) <= new Date(bookingForm.pickupDate)) {
      toast.error('A data de devolução deve ser posterior à data de retirada.');
      return;
    }

    const checkToast = toast.loading('Verificando disponibilidade...');
    try {
      const { data: conflicts, error: checkError } = await supabase
        .from('reservations')
        .select('id, pickup_date, return_date, status')
        .eq('vehicle_id', bookingForm.vehicleId)
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (checkError) throw checkError;

      if (conflicts) {
        const newPickup = new Date(bookingForm.pickupDate);
        const newReturn = new Date(bookingForm.returnDate);
        
        const overlap = conflicts.find(res => {
          const resPickup = new Date(res.pickup_date);
          const resReturn = new Date(res.return_date);
          return newPickup < resReturn && resPickup < newReturn;
        });

        if (overlap) {
          const fmtDate = (dStr: string) => new Date(dStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          toast.error(`Esta poltrona já está reservada de ${fmtDate(overlap.pickup_date)} a ${fmtDate(overlap.return_date)}. Escolha outro período ou poltrona.`, { id: checkToast });
          return;
        }
      }
      
      toast.dismiss(checkToast);
      setBookingStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao verificar disponibilidade.', { id: checkToast });
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setBookingForm(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  // Submit flow
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingForm.name || bookingForm.name.trim().length < 3) {
      toast.error('O Nome Completo deve ter no mínimo 3 caracteres.');
      return;
    }
    const cleanCpf = bookingForm.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast.error('Por favor, informe um CPF válido.');
      return;
    }
    if (!bookingForm.birthDate) {
      toast.error('Informe a Data de Nascimento.');
      return;
    }
    
    const birth = new Date(bookingForm.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    if (age < 18) {
      toast.error('O locatário deve ter no mínimo 18 anos de idade.');
      return;
    }
    if (!bookingForm.rg) {
      toast.error('Informe o RG do locatário.');
      return;
    }
    if (!bookingForm.phone || bookingForm.phone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um Telefone / WhatsApp válido.');
      return;
    }
    if (!bookingForm.email || !bookingForm.email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    if (!bookingForm.cep || bookingForm.cep.replace(/\D/g, '').length !== 8) {
      toast.error('Informe um CEP válido.');
      return;
    }
    if (!bookingForm.street || !bookingForm.number || !bookingForm.neighborhood || !bookingForm.city || !bookingForm.state) {
      toast.error('Por favor, preencha todos os campos do endereço de entrega.');
      return;
    }
    
    setIsSubmitting(true);
    const loadToast = toast.loading('Salvando sua reserva...');
    
    try {
      // 0. Verificar overlap de data para a poltrona selecionada (segurança extra contra concorrência)
      const { data: conflicts, error: checkError } = await supabase
        .from('reservations')
        .select('id, pickup_date, return_date, status')
        .eq('vehicle_id', bookingForm.vehicleId)
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (checkError) throw checkError;

      if (conflicts) {
        const newPickup = new Date(bookingForm.pickupDate);
        const newReturn = new Date(bookingForm.returnDate);
        
        const overlap = conflicts.find(res => {
          const resPickup = new Date(res.pickup_date);
          const resReturn = new Date(res.return_date);
          return newPickup < resReturn && resPickup < newReturn;
        });

        if (overlap) {
          const fmtDate = (dStr: string) => new Date(dStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          toast.error(`Esta poltrona acabou de ser reservada para o período de ${fmtDate(overlap.pickup_date)} a ${fmtDate(overlap.return_date)}. Escolha outra data ou poltrona.`, { id: loadToast });
          setIsSubmitting(false);
          return;
        }
      }

      // 1. Check if client exists
      const { data: clientsFound } = await supabase
        .from('clients')
        .select('*')
        .eq('cpf', cleanCpf);
        
      const existingClient = clientsFound && clientsFound.length > 0 ? clientsFound[0] : null;
      let clientId = '';
      
      const clientPayload = {
        name: bookingForm.name.trim(),
        cpf: cleanCpf,
        rg: bookingForm.rg.trim(),
        birth_date: bookingForm.birthDate,
        cnh_number: '',
        cnh_category: '',
        cnh_expiration: null,
        email: bookingForm.email.trim(),
        phone: bookingForm.phone.replace(/\D/g, ''),
        cep: bookingForm.cep.replace(/\D/g, ''),
        street: bookingForm.street.trim(),
        number: bookingForm.number.trim(),
        neighborhood: bookingForm.neighborhood.trim(),
        city: bookingForm.city.trim(),
        state: bookingForm.state.trim().toUpperCase(),
        status: 'Ativo' as const,
        vip: false,
        score: 100,
        cnh_url: bookingForm.docBase64 || null,
        address_proof_url: bookingForm.addressProofBase64 || null,
        selfie_url: bookingForm.selfieBase64 || null
      };
      
      if (existingClient) {
        clientId = existingClient.id;
        const { error: clientErr } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', clientId);
        if (clientErr) throw clientErr;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert([clientPayload])
          .select()
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }
      
      // 2. Insert Reservation
      const reservationPayload = {
        client_id: clientId,
        vehicle_id: bookingForm.vehicleId,
        pickup_date: new Date(bookingForm.pickupDate).toISOString(),
        return_date: new Date(bookingForm.returnDate).toISOString(),
        daily_rate: totals.dailyRate,
        days: totals.days,
        total_value: totals.subtotal,
        security_deposit: selectedVehicle?.default_security_deposit || 0,
        insurance_value: 0,
        insurance_details: INSURANCE_COVERAGES.map(name => ({ name, value: 0, selected: true })),
        additional_services: bookingForm.selectedServices.map(srvId => {
          const srv = ADDITIONAL_SERVICES.find(s => s.id === srvId);
          return srv ? srv.name : srvId;
        }).join(', '),
        observations: 'Reserva efetuada diretamente pelo cliente no site público.',
        origin: 'site',
        status: 'aguardando retirada'
      };
      
      const { data: newRes, error: resErr } = await supabase
        .from('reservations')
        .insert([reservationPayload])
        .select()
        .single();
        
      if (resErr) throw resErr;
      
      toast.success('Reserva cadastrada com sucesso!', { id: loadToast });
      setCreatedReservation(newRes);
      setBookingStep(3);
      
    } catch (err: any) {
      console.error("Erro ao salvar reserva:", err);
      toast.error('Erro ao processar reserva: ' + (err.message || 'Erro inesperado'), { id: loadToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDropzone = (
    label: string,
    base64Value: string,
    field: 'docBase64' | 'addressProofBase64' | 'selfieBase64'
  ) => {
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">{label}</label>
        <div className="relative aspect-video rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group hover:border-primary transition-all">
          {base64Value ? (
            <img src={base64Value} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary transition-colors">add_a_photo</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Carregar Imagem</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => handleFileChange(e, field)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-primary selection:text-white">
      {/* Glow Orbs de Fundo para Estética Moderna */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navbar Glassmorphism */}
      <nav className="fixed top-0 w-full z-50 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between transition-all no-print">
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
      <section className="relative pt-36 pb-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center no-print">
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
            <button 
              onClick={() => {
                if (vehicles.length > 0) {
                  setSelectedVehicle(vehicles[0]);
                  setBookingForm(prev => ({ ...prev, vehicleId: vehicles[0].id }));
                }
                setIsBookingOpen(true);
                setBookingStep(1);
              }}
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Solicitar Locação
            </button>
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
      <section id="acervo" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800/50 no-print">
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

                      {/* Features clínicas */}
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
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Valor da Diária</p>
                      <p className="text-sm font-black text-primary dark:text-secondary">R$ {(v.daily_rate || 15).toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedVehicle(v);
                        setBookingForm(prev => ({
                          ...prev,
                          vehicleId: v.id
                        }));
                        setIsBookingOpen(true);
                        setBookingStep(1);
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
      <section id="sobre" className="py-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center no-print">
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
          
          <div className="space-y-6 text-slate-600 dark:text-slate-355 font-medium leading-relaxed">
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

      {/* Pre-Registration Form Section (Bottom) */}
      <section id="cadastro" className="py-24 bg-primary text-white relative overflow-hidden no-print">
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
              Preencha o formulário para iniciar sua reserva online em etapas. Você poderá preencher seus dados, escolher opcionais e obter seu voucher de confirmação na hora!
            </p>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="material-symbols-outlined text-secondary text-3xl">bolt</span>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">Atendimento Autônomo</p>
                <p className="text-xs text-white/60 mt-0.5">Sem filas, preencha tudo online e garanta sua poltrona.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 lg:col-span-7 max-w-xl mx-auto w-full">
            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-secondary">assignment</span>
              Reserva Prática e Rápida
            </h3>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const matchedV = vehicles.find(v => v.id === bottomForm.vehicleId) || (vehicles.length > 0 ? vehicles[0] : null);
                setSelectedVehicle(matchedV);
                setBookingForm(prev => ({
                  ...prev,
                  name: bottomForm.name,
                  phone: maskPhone(bottomForm.phone),
                  vehicleId: matchedV ? matchedV.id : '',
                  pickupDate: bottomForm.date ? `${bottomForm.date}T08:00` : prev.pickupDate,
                  returnDate: bottomForm.date ? (() => {
                    const d = new Date(`${bottomForm.date}T08:00`);
                    d.setDate(d.getDate() + 7);
                    return d.toISOString().slice(0, 16);
                  })() : prev.returnDate
                }));
                setIsBookingOpen(true);
                setBookingStep(1);
              }} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Seu Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                  <input 
                    required
                    type="text" 
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    placeholder="Nome de quem vai alugar"
                    value={bottomForm.name}
                    onChange={e => setBottomForm({ ...bottomForm, name: e.target.value })}
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
                      value={bottomForm.phone}
                      onChange={e => setBottomForm({ ...bottomForm, phone: maskPhone(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Pretendida</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">calendar_today</span>
                    <input 
                      required
                      type="date" 
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      value={bottomForm.date}
                      onChange={e => setBottomForm({ ...bottomForm, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Modelo da Poltrona desejada</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">chair</span>
                  <select 
                    required
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none"
                    value={bottomForm.vehicleId}
                    onChange={e => setBottomForm({ ...bottomForm, vehicleId: e.target.value })}
                  >
                    <option value="">Selecione uma poltrona...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.brand} {v.model} - R$ {(v.daily_rate || 15).toFixed(2)}/dia</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
                Iniciar Solicitação de Reserva
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Onde Estamos e Horários */}
      <section id="contato" className="py-24 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800 no-print">
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
      <footer className="py-12 bg-slate-955 text-slate-400 border-t border-slate-900 text-center text-xs no-print">
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

      {/* ============================================================== */}
      {/* GLASSMORPHISM MULTI-STEP BOOKING MODAL */}
      {/* ============================================================== */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-25 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {bookingStep === 3 ? 'Reserva Efetuada!' : 'Solicitação de Reserva'}
                </h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  {bookingStep === 1 && 'Etapa 1: Equipamento & Período'}
                  {bookingStep === 2 && 'Etapa 2: Identificação & Cadastro'}
                  {bookingStep === 3 && 'Reserva Concluída com Sucesso'}
                </p>
              </div>
              {bookingStep !== 3 && (
                <button 
                  onClick={() => setIsBookingOpen(false)} 
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-650"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Steps Indicator Bar */}
            {bookingStep !== 3 && (
              <div className="px-8 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-750 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className={`flex items-center gap-2 ${bookingStep === 1 ? 'text-primary dark:text-secondary' : ''}`}>
                  <span className={`size-5 rounded-full flex items-center justify-center border font-bold ${bookingStep === 1 ? 'border-primary dark:border-secondary bg-primary text-white dark:bg-secondary' : 'border-slate-300'}`}>1</span>
                  <span>Opções de Locação</span>
                </div>
                <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className={`flex items-center gap-2 ${bookingStep === 2 ? 'text-primary dark:text-secondary' : ''}`}>
                  <span className={`size-5 rounded-full flex items-center justify-center border font-bold ${bookingStep === 2 ? 'border-primary dark:border-secondary bg-primary text-white dark:bg-secondary' : 'border-slate-300'}`}>2</span>
                  <span>Dados Cadastrais</span>
                </div>
              </div>
            )}

            {/* Modal Body / Forms */}
            <div className="flex-1 overflow-y-auto">
              
              {/* STEP 1: OPTIONS & PRICING */}
              {bookingStep === 1 && (
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vehicle Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poltrona Disponível</label>
                      {selectedVehicle ? (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {selectedVehicle.image_url ? (
                              <img src={selectedVehicle.image_url} alt={selectedVehicle.model} className="size-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="size-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-2xl">chair</span>
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase leading-none">{selectedVehicle.model}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">{selectedVehicle.category}</p>
                              <p className="text-xs font-black text-primary dark:text-secondary mt-1">
                                R$ {(selectedVehicle.daily_rate || 15).toFixed(2)} / diária
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehicle(null);
                              setBookingForm(prev => ({ ...prev, vehicleId: '' }));
                            }}
                            className="px-2.5 py-1 text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 border border-rose-250 rounded-lg uppercase tracking-wider transition-all"
                          >
                            Mudar
                          </button>
                        </div>
                      ) : (
                        <select
                          required
                          className="w-full h-12 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 dark:text-white"
                          value={bookingForm.vehicleId}
                          onChange={e => {
                            const v = vehicles.find(x => x.id === e.target.value);
                            setSelectedVehicle(v || null);
                            setBookingForm(prev => ({ ...prev, vehicleId: e.target.value }));
                          }}
                        >
                          <option value="">Selecione uma poltrona pós-cirúrgica</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.brand} {v.model} - R$ {(v.daily_rate || 15).toFixed(2)}/dia</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Period Input using Calendar Component */}
                    <div className="space-y-2 relative">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Período Desejado</label>
                      <button
                        type="button"
                        disabled={!bookingForm.vehicleId || isLoadingAvailability}
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full h-12 flex items-center justify-between px-4 rounded-xl text-xs font-medium transition-all border
                          ${!bookingForm.vehicleId ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-855 border-slate-200 dark:border-slate-700 dark:text-white'}
                          ${showCalendar ? 'ring-2 ring-primary/20 border-primary' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm opacity-60">calendar_month</span>
                          <span>
                            {bookingForm.pickupDate
                              ? `${new Date(bookingForm.pickupDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${new Date(bookingForm.returnDate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              : !bookingForm.vehicleId ? 'Selecione a poltrona primeiro' : 'Selecionar datas...'}
                          </span>
                        </div>
                        {isLoadingAvailability && <span className="animate-spin material-symbols-outlined text-xs">progress_activity</span>}
                      </button>

                      {showCalendar && (
                        <div className="absolute top-full left-0 mt-2 z-[110]">
                          <Calendar
                            occupiedRanges={occupiedRanges}
                            initialPickup={bookingForm.pickupDate}
                            initialReturn={bookingForm.returnDate}
                            onClose={() => setShowCalendar(false)}
                            onSelectRange={(start, end) => {
                              setBookingForm(prev => ({
                                ...prev,
                                pickupDate: start.toISOString(),
                                returnDate: end.toISOString()
                              }));
                              setShowCalendar(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Services */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Opcionais & Acessórios Adicionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {ADDITIONAL_SERVICES.map(srv => (
                        <label 
                          key={srv.id}
                          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                            bookingForm.selectedServices.includes(srv.id)
                              ? 'bg-primary/5 border-primary/30 dark:bg-primary/10'
                              : 'bg-slate-50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-750'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                              checked={bookingForm.selectedServices.includes(srv.id)}
                              onChange={() => handleServiceToggle(srv.id)}
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-250 leading-tight">{srv.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-primary dark:text-secondary shrink-0 ml-2">
                            R$ {srv.price.toFixed(2)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trust Badge */}
                  <div className="space-y-3 p-5 bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-250/20">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                      <Shield size={18} className="shrink-0" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Garantias Clínicas ComfortCare (Inclusas)</h4>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px] font-bold text-slate-650 dark:text-slate-400 uppercase">
                      <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs text-emerald-500 font-bold">check_circle</span> Higienização Grau Hospitalar</li>
                      <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs text-emerald-500 font-bold">check_circle</span> Substituição Técnica em 12h</li>
                      <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs text-emerald-500 font-bold">check_circle</span> Ajustes Domiciliares</li>
                    </ul>
                  </div>

                  {/* Summary Block */}
                  {selectedVehicle && bookingForm.pickupDate && bookingForm.returnDate && (
                    <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Resumo Financeiro</p>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase mt-1">R$ {totals.subtotal.toFixed(2)}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                          {totals.days} diárias (R$ {(totals.days * totals.dailyRate).toFixed(2)}) 
                          {totals.servicesTotal > 0 && ` + Adicionais (R$ ${totals.servicesTotal.toFixed(2)})`}
                        </p>
                      </div>
                      <div className="text-left sm:text-right bg-primary/5 dark:bg-primary/10 border border-primary/20 p-3 rounded-lg">
                        <span className="text-[9px] font-black text-primary dark:text-secondary uppercase block">Valor Caução (Garantia)</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white mt-1 block">
                          R$ {(selectedVehicle.default_security_deposit || 0).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block italic font-medium">Reembolsável na devolução</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button 
                      onClick={() => setIsBookingOpen(false)}
                      className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleNextStep1}
                      className="px-8 py-2.5 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                    >
                      Continuar Reserva
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CLIENT INFO & DOCUMENTS */}
              {bookingStep === 2 && (
                <form onSubmit={handleSaveBooking} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b pb-1">Seus Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* CPF */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPF</span>
                        <input
                          required
                          type="text"
                          placeholder="000.000.000-00"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.cpf}
                          onChange={handleCpfChange}
                        />
                      </div>
                      {/* Name */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome Completo</span>
                        <input
                          required
                          type="text"
                          placeholder="Nome Completo do Locatário"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.name}
                          onChange={e => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      {/* Birth Date */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Nascimento</span>
                        <input
                          required
                          type="date"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.birthDate}
                          onChange={e => setBookingForm(prev => ({ ...prev, birthDate: e.target.value }))}
                        />
                      </div>
                      {/* Phone */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp / Celular</span>
                        <input
                          required
                          type="tel"
                          placeholder="(88) 99999-9999"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.phone}
                          onChange={e => setBookingForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                        />
                      </div>
                      {/* Email */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</span>
                        <input
                          required
                          type="email"
                          placeholder="email@exemplo.com"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.email}
                          onChange={e => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      {/* RG */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Documento (RG)</span>
                        <input
                          required
                          type="text"
                          placeholder="Número do seu RG"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.rg}
                          onChange={e => setBookingForm(prev => ({ ...prev, rg: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b pb-1">Endereço de Entrega</h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* CEP */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEP (Busca Automática)</span>
                        <input
                          required
                          type="text"
                          placeholder="00000-000"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.cep}
                          onChange={handleCepChange}
                        />
                      </div>
                      {/* Street */}
                      <div className="md:col-span-3 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logradouro (Rua/Av)</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Rua Monsenhor Franklin"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.street}
                          onChange={e => setBookingForm(prev => ({ ...prev, street: e.target.value }))}
                        />
                      </div>
                      {/* Number */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Número</span>
                        <input
                          required
                          type="text"
                          placeholder="123"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.number}
                          onChange={e => setBookingForm(prev => ({ ...prev, number: e.target.value }))}
                        />
                      </div>
                      {/* Neighborhood */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bairro</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Centro"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.neighborhood}
                          onChange={e => setBookingForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                        />
                      </div>
                      {/* City */}
                      <div className="md:col-span-3 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cidade</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Tianguá"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.city}
                          onChange={e => setBookingForm(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      {/* State */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UF</span>
                        <input
                          required
                          type="text"
                          maxLength={2}
                          placeholder="CE"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white text-center font-bold"
                          value={bookingForm.state}
                          onChange={e => setBookingForm(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Uploads */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b pb-1">Fotos dos Documentos (Garantia Cadastral)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderDropzone("Documento Oficial (Frente/Verso)", bookingForm.docBase64, "docBase64")}
                      {renderDropzone("Comprovante de Endereço", bookingForm.addressProofBase64, "addressProofBase64")}
                      {renderDropzone("Sua Selfie segurando Documento", bookingForm.selfieBase64, "selfieBase64")}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Voltar Etapa
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-sm font-bold">progress_activity</span>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                          Confirmar Minha Reserva
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: VOUCHER VIEW */}
              {bookingStep === 3 && createdReservation && (
                <div className="p-8 space-y-6">
                  {/* Success Card */}
                  <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-3 mb-6 no-print">
                    <div className="size-12 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-2xl font-bold">check_circle</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Solicitação de Reserva Confirmada!</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">
                      O seu voucher oficial foi gerado. O time de suporte técnico já foi notificado da reserva e o equipamento está pré-reservado para você.
                    </p>
                    
                    <div className="w-full p-4 bg-amber-50 dark:bg-amber-955/20 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-3 text-left">
                      <Info size={18} className="shrink-0 mt-0.5 text-amber-550" />
                      <div>
                        <p className="uppercase tracking-widest text-[9px]">Atenção: Assinatura de Contrato</p>
                        <p className="font-semibold text-slate-600 dark:text-slate-400 mt-1 leading-normal">
                          O contrato formal de locação **NÃO** é assinado no site. Ele será assinado presencialmente pela nossa equipe técnica no momento da entrega domiciliar ou retirada da poltrona.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PRINTABLE VOUCHER */}
                  <div className="print-area w-full bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-left max-w-2xl mx-auto">
                    <div className="p-6 bg-slate-50 border-b border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">chair</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-black tracking-tight text-primary uppercase">ComfortCare</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Voucher Oficial do Cliente</p>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[9px] uppercase tracking-widest text-slate-450 font-bold">Solicitação Site</p>
                          <p className="text-xs font-mono font-bold text-slate-600">REF: #VR-CC-{createdReservation.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                      {/* Customer Info */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">person</span> Informações do Locatário
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Nome do Responsável</p>
                            <p className="font-bold text-slate-800">{bookingForm.name}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">CPF</p>
                            <p className="font-mono font-bold text-slate-800">{bookingForm.cpf}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">WhatsApp</p>
                            <p className="font-bold text-slate-800">{bookingForm.phone}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">E-mail</p>
                            <p className="font-bold text-slate-800 truncate">{bookingForm.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Equipment Info */}
                      <div className="border-t border-slate-100 pt-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">chair</span> Detalhes do Equipamento
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Poltrona Reservada</p>
                            <p className="font-bold text-slate-800 uppercase">{selectedVehicle?.brand} {selectedVehicle?.model}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Categoria</p>
                            <p className="font-bold text-slate-800">{selectedVehicle?.category}</p>
                          </div>
                        </div>
                      </div>

                      {/* Period & Costs */}
                      <div className="border-t border-slate-100 pt-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">calendar_today</span> Período & Valores
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Entrega Domiciliar</p>
                            <p className="font-bold text-slate-800">
                              {new Date(bookingForm.pickupDate).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Coleta de Devolução</p>
                            <p className="font-bold text-slate-800">
                              {new Date(bookingForm.returnDate).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Duração</p>
                            <p className="font-bold text-slate-800">{createdReservation.days} diárias</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Valor Total Estimado</p>
                            <p className="font-black text-emerald-600 text-sm">
                              R$ {createdReservation.total_value.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="border-t border-slate-150 pt-8 grid grid-cols-2 gap-6 text-center text-[9px] font-bold text-slate-400">
                        <div>
                          <div className="border-t border-slate-300 pt-1 uppercase">ComfortCare Ltda</div>
                        </div>
                        <div>
                          <div className="border-t border-slate-300 pt-1 uppercase">{bookingForm.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 text-[9px] text-slate-450 border-t border-slate-100 italic text-center leading-normal">
                      Este documento é de uso administrativo. Confirma a intenção de reserva do equipamento. A poltrona está garantida sob reserva de acordo com os termos cadastrais e contratuais.
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="no-print pt-6 border-t border-slate-100 dark:border-slate-850 flex flex-wrap gap-3 justify-between items-center">
                    <button
                      onClick={() => {
                        setIsBookingOpen(false);
                        setCreatedReservation(null);
                        setBookingStep(1);
                      }}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                    >
                      Fechar Janela
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Printer size={14} />
                        Imprimir Voucher
                      </button>
                      <button
                        onClick={() => {
                          const message = `*ComfortCare - Confirmação de Reserva*%0A%0A*Voucher:* #VR-CC-${createdReservation.id.substring(0,8).toUpperCase()}%0A*Cliente:* ${bookingForm.name}%0A*CPF:* ${bookingForm.cpf}%0A*Poltrona:* ${selectedVehicle?.brand} ${selectedVehicle?.model}%0A*Retirada:* ${new Date(bookingForm.pickupDate).toLocaleString('pt-BR')}%0A*Devolução:* ${new Date(bookingForm.returnDate).toLocaleString('pt-BR')}%0A*Valor total:* R$ ${createdReservation.total_value.toFixed(2)}%0A*Caução:* R$ ${(selectedVehicle?.default_security_deposit || 0).toFixed(2)}%0A%0A_Atenção: O contrato será assinado no ato da entrega._`;
                          window.open(`https://wa.me/5588994906873?text=${message}`, '_blank');
                        }}
                        className="px-5 py-2.5 bg-emerald-505 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all animate-pulse"
                      >
                        <Send size={14} />
                        Enviar Confirmação
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Styles for printing the voucher cleanly */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { 
            box-shadow: none !important; 
            margin: 0 auto !important; 
            width: 100% !important; 
            max-width: 600px !important; 
            border: 1px solid #ccc !important;
            border-radius: 12px !important;
          } 
          body { 
            background: white !important; 
            color: black !important;
          } 
        }
      `}</style>
    </div>
  );
};

export default PublicLanding;