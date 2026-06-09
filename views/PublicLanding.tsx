"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { Github, Shield, Award, ClipboardCheck, Sparkles, X, Printer, Send, Info, Facebook, Instagram } from 'lucide-react';
import toast from 'react-hot-toast';
import Calendar from '../components/Calendar';

// Import assets
import posleveHero from '../src/assets/comfortcare_hero.png';
import posleveHeroBeige from '../src/assets/comfortcare_beige.png';
import posleveQuality from '../src/assets/comfortcare_quality.png';
import posleveLogoText from '../src/assets/posleve_logo_text.png';
import posleveLogoEmblem from '../src/assets/posleve_logo_emblem.jpg';

const ADDITIONAL_SERVICES = [
  { id: 'higienizacao', name: 'Higienização Avançada Extra', price: 50.00, type: 'fixed' },
  { id: 'travesseiro_ortopedico', name: 'Travesseiro Ortopédico de Apoio', price: 15.00, type: 'fixed' },
  { id: 'entrega_urgente', name: 'Entrega Expressa / Urgente', price: 40.00, type: 'fixed' },
];

const PLANS = [
  {
    id: 'essencial',
    name: 'Conforto Essencial',
    days: 10,
    price: 600.00,
    description: 'Ideal para pós-operatórios de rápida recuperação.',
    benefits: [
      '10 dias de locação contínua',
      'Entrega e montagem inclusas',
      'Higienização de grau hospitalar',
      'Suporte técnico 24h'
    ]
  },
  {
    id: 'plus',
    name: 'Conforto Plus',
    days: 20,
    price: 1000.00,
    description: 'A melhor escolha para recuperações de médio prazo.',
    benefits: [
      '20 dias de locação contínua',
      'Entrega e montagem inclusas',
      'Higienização de grau hospitalar',
      'Suporte técnico 24h',
      'Garantia de troca expressa em até 12h'
    ],
    highlight: 'MAIS PROCURADO'
  },
  {
    id: 'premium',
    name: 'Conforto Premium',
    days: 30,
    price: 1200.00,
    description: 'Tranquilidade e repouso completo para cirurgias mais complexas.',
    benefits: [
      '30 dias de locação contínua',
      'Entrega e montagem inclusas',
      'Higienização de grau hospitalar',
      'Suporte técnico 24h',
      'Garantia de troca expressa em até 12h',
      'Travesseiro ortopédico de apoio incluso'
    ]
  }
];

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  return `/${url}`;
};


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

// Helper functions for sweep-line availability check
const getAvailableCountForPeriod = (pickupStr: string, returnStr: string, resList: any[]) => {
  if (!pickupStr || !returnStr) return 5;
  const S = new Date(pickupStr);
  const E = new Date(returnStr);
  if (E <= S) return 0;

  const sTime = S.getTime();
  const eTime = E.getTime();

  let currentOccupancy = 0;
  const events: { time: number; type: 'pickup' | 'return' }[] = [];

  // Non-blocking reservations (pending deposit) do not reduce pool availability
  const blockingResList = resList.filter(res => {
    return res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
  });

  for (const res of blockingResList) {
    const resPickup = new Date(res.pickup_date).getTime();
    const resReturn = new Date(res.return_date).getTime();

    const overlaps = sTime < resReturn && resPickup < eTime;
    if (!overlaps) continue;

    if (resPickup <= sTime && resReturn > sTime) {
      currentOccupancy++;
    }

    if (resPickup > sTime && resPickup < eTime) {
      events.push({ time: resPickup, type: 'pickup' });
    }
    if (resReturn > sTime && resReturn < eTime) {
      events.push({ time: resReturn, type: 'return' });
    }
  }

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.type === 'return' ? -1 : 1;
  });

  let maxOccupancy = currentOccupancy;
  for (const event of events) {
    if (event.type === 'pickup') {
      currentOccupancy++;
    } else {
      currentOccupancy--;
    }
    if (currentOccupancy > maxOccupancy) {
      maxOccupancy = currentOccupancy;
    }
  }

  return Math.max(0, 5 - maxOccupancy);
};

const getAvailabilityLimitForStartDate = (pickupStr: string, resList: any[]) => {
  if (!pickupStr) return null;
  const S = new Date(pickupStr);
  const sTime = S.getTime();

  let earliestNextPickup = null;

  const blockingResList = resList.filter(res => {
    return res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
  });

  for (const res of blockingResList) {
    const resPickup = new Date(res.pickup_date).getTime();
    if (resPickup > sTime) {
      if (earliestNextPickup === null || resPickup < earliestNextPickup) {
        earliestNextPickup = resPickup;
      }
    }
  }

  return earliestNextPickup ? new Date(earliestNextPickup) : null;
};

const getStockLimitDate = (pickupStr: string, Q: number, resList: any[]) => {
  if (!pickupStr) return null;
  const S = new Date(pickupStr);
  const sTime = S.getTime();

  const blockingResList = resList.filter(res => {
    return res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
  });

  const candidates = blockingResList
    .map(r => new Date(r.pickup_date).getTime())
    .filter(t => t > sTime);

  candidates.sort((a, b) => a - b);

  for (const t of candidates) {
    const avail = getAvailableCountForPeriod(pickupStr, new Date(t).toISOString(), resList);
    if (avail < Q) {
      return new Date(t);
    }
  }
  return null;
};

const getNextAvailableDateForQuantity = (pickupStr: string, returnStr: string, Q: number, resList: any[]) => {
  if (!pickupStr || !returnStr) return null;
  const S = new Date(pickupStr);
  const E = new Date(returnStr);
  const durationMs = E.getTime() - S.getTime();

  const blockingResList = resList.filter(res => {
    return res.status === 'locação em uso' || (res.status === 'aguardando retirada' && res.observations?.includes('[CAUCAO_PAGO]'));
  });

  const candidates: number[] = [S.getTime()];
  for (const res of blockingResList) {
    const resReturn = new Date(res.return_date).getTime();
    if (resReturn > S.getTime()) {
      candidates.push(resReturn);
    }
  }

  let nextDay = new Date(S);
  for (let i = 1; i <= 90; i++) {
    nextDay.setDate(nextDay.getDate() + 1);
    candidates.push(nextDay.getTime());
  }

  candidates.sort((a, b) => a - b);

  for (const xTime of candidates) {
    const X = new Date(xTime);
    const endOfX = new Date(xTime + durationMs);
    const avail = getAvailableCountForPeriod(X.toISOString(), endOfX.toISOString(), resList);
    if (avail >= Q) {
      return X;
    }
  }

  return null;
};

const getPendingOverlapsCount = (pickupStr: string, returnStr: string, resList: any[]) => {
  if (!pickupStr || !returnStr) return 0;
  const S = new Date(pickupStr);
  const E = new Date(returnStr);
  if (E <= S) return 0;

  const sTime = S.getTime();
  const eTime = E.getTime();

  let overlappingPendingCount = 0;
  for (const res of resList) {
    const resPickup = new Date(res.pickup_date).getTime();
    const resReturn = new Date(res.return_date).getTime();

    const overlaps = sTime < resReturn && resPickup < eTime;
    const isPending = res.status === 'aguardando retirada' && !res.observations?.includes('[CAUCAO_PAGO]');

    if (overlaps && isPending) {
      overlappingPendingCount++;
    }
  }
  return overlappingPendingCount;
};

const getOccupiedRangesForCalendar = (Q: number, resList: any[]) => {
  const ranges: { start: Date; end: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentRangeStart: Date | null = null;
  let currentRangeEnd: Date | null = null;

  for (let i = 0; i < 180; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const midDay = new Date(d);
    midDay.setHours(12, 0, 0, 0);

    const avail = getAvailableCountForPeriod(midDay.toISOString(), new Date(midDay.getTime() + 1000).toISOString(), resList);

    if (avail < Q) {
      if (currentRangeStart === null) {
        currentRangeStart = d;
      }
      currentRangeEnd = d;
    } else {
      if (currentRangeStart !== null && currentRangeEnd !== null) {
        ranges.push({
          start: new Date(currentRangeStart),
          end: new Date(currentRangeEnd)
        });
        currentRangeStart = null;
        currentRangeEnd = null;
      }
    }
  }

  if (currentRangeStart !== null && currentRangeEnd !== null) {
    ranges.push({
      start: new Date(currentRangeStart),
      end: new Date(currentRangeEnd)
    });
  }

  return ranges;
};

const getAvailableVehicleIdsForPeriod = (pickupStr: string, returnStr: string, resList: any[], allVehicles: any[]) => {
  const S = new Date(pickupStr).getTime();
  const E = new Date(returnStr).getTime();

  const reservedVehicleIds = new Set<string>();
  for (const res of resList) {
    const resPickup = new Date(res.pickup_date).getTime();
    const resReturn = new Date(res.return_date).getTime();
    const overlaps = S < resReturn && resPickup < E;
    if (overlaps) {
      reservedVehicleIds.add(res.vehicle_id);
    }
  }

  const availableVehicles = allVehicles.filter(v => !reservedVehicleIds.has(v.id));
  return availableVehicles.map(v => v.id);
};

const PublicLanding: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bottom form state
  const [bottomForm, setBottomForm] = useState({
    name: '',
    phone: '',
    planId: 'sem_plano',
    date: ''
  });

  const [selectedPlanId, setSelectedPlanId] = useState<'essencial' | 'plus' | 'premium' | null>(null);

  // Modal states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    vehicleId: '',
    quantity: 1,
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

  // Auto-set return date when plan is selected and pickup date changes
  useEffect(() => {
    if (selectedPlanId && bookingForm.pickupDate) {
      const plan = PLANS.find(p => p.id === selectedPlanId);
      if (plan) {
        const pickupDate = new Date(bookingForm.pickupDate);
        const returnDate = new Date(pickupDate.getTime() + plan.days * 24 * 60 * 60 * 1000);
        setBookingForm(prev => ({
          ...prev,
          returnDate: returnDate.toISOString().slice(0, 16)
        }));
      }
    }
  }, [selectedPlanId, bookingForm.pickupDate]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any | null>(null);
  const [createdReservations, setCreatedReservations] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<any[]>([]);

  // Availability calendar states
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Hero Carousel State
  const heroImages = [posleveHero, posleveHeroBeige];
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const handleSelectPlan = (planId: 'essencial' | 'plus' | 'premium') => {
    setSelectedPlanId(planId);
    if (vehicles.length > 0) {
      setSelectedVehicle(vehicles[0]);
      setBookingForm(prev => ({
        ...prev,
        vehicleId: vehicles[0].id,
        pickupDate: '',
        returnDate: '',
        selectedServices: []
      }));
    }
    setIsBookingOpen(true);
    setBookingStep(1);
  };

  const handleBottomFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlanName = bottomForm.planId === 'sem_plano'
      ? 'Sem seguir plano (Locação livre)'
      : PLANS.find(p => p.id === bottomForm.planId)?.name || '';
    
    const formattedDate = bottomForm.date ? new Date(bottomForm.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada';
    
    const message = `Olá! Gostaria de fazer uma reserva rápida.%0A%0A` +
      `*Nome:* ${bottomForm.name}%0A` +
      `*WhatsApp:* ${bottomForm.phone}%0A` +
      `*Opção de Locação:* ${selectedPlanName}%0A` +
      `*Data de Início Pretendida:* ${formattedDate}%0A%0A` +
      `*Caução de Segurança:* Estou ciente de que as locações necessitam de pagamento de caução de segurança (caução reembolsável). Favor enviar os dados para transferência.`;
    
    window.open(`https://wa.me/558584065904?text=${message}`, '_blank');
  };

  const fetchAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, vehicle_id, pickup_date, return_date, status, observations')
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (error) throw error;

      if (data) {
        setAllReservations(data);
      } else {
        setAllReservations([]);
      }
    } catch (err) {
      console.error('Erro ao buscar disponibilidade:', err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  useEffect(() => {
    // Recalcular occupiedRanges toda vez que a quantidade ou a lista de reservas mudar
    const ranges = getOccupiedRangesForCalendar(bookingForm.quantity, allReservations);
    setOccupiedRanges(ranges);
  }, [bookingForm.quantity, allReservations]);

  useEffect(() => {
    const fetchFleet = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*');
      if (data && data.length > 0) {
        setVehicles(data);
        setSelectedVehicle(data[0]);
        setBookingForm(prev => ({ ...prev, vehicleId: data[0].id }));
      }
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
      return { days: 0, subtotal: 0, dailyRate: 0, servicesTotal: 0, planPrice: 0 };
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

    let subtotal = 0;
    let planPrice = 0;

    if (selectedPlanId) {
      const plan = PLANS.find(p => p.id === selectedPlanId);
      if (plan) {
        planPrice = plan.price;
        subtotal = (planPrice + servicesTotal) * (bookingForm.quantity || 1);
      }
    } else {
      subtotal = ((days * dailyRate) + servicesTotal) * (bookingForm.quantity || 1);
    }
    
    return { days, subtotal, dailyRate, servicesTotal, planPrice };
  };

  const totals = calculateBookingTotals();

  // Step transitions
  const handleNextStep1 = async () => {
    if (!bookingForm.pickupDate || !bookingForm.returnDate) {
      toast.error('Preencha as datas de entrega e coleta.');
      return;
    }
    if (new Date(bookingForm.returnDate) <= new Date(bookingForm.pickupDate)) {
      toast.error('A data de devolução deve ser posterior à data de retirada.');
      return;
    }

    const checkToast = toast.loading('Verificando disponibilidade de estoque...');
    try {
      const { data: conflicts, error: checkError } = await supabase
        .from('reservations')
        .select('id, vehicle_id, pickup_date, return_date, status')
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (checkError) throw checkError;

      const resList = conflicts || [];
      setAllReservations(resList);

      const avail = getAvailableCountForPeriod(bookingForm.pickupDate, bookingForm.returnDate, resList);
      if (avail < bookingForm.quantity) {
        const nextDate = getNextAvailableDateForQuantity(bookingForm.pickupDate, bookingForm.returnDate, bookingForm.quantity, resList);
        const dateStr = nextDate ? nextDate.toLocaleDateString('pt-BR') : 'um período futuro';
        toast.error(`Infelizmente, só temos ${avail} poltrona(s) disponível(eis) no período selecionado. A próxima data com estoque suficiente é a partir de ${dateStr}.`, { id: checkToast });
        return;
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
      // 0. Obter reservas ativas para cálculo final de disponibilidade (concorrência)
      const { data: activeRes, error: checkError } = await supabase
        .from('reservations')
        .select('id, vehicle_id, pickup_date, return_date, status')
        .neq('status', 'reserva cancelada')
        .neq('status', 'reserva perdida')
        .neq('status', 'locação concluída');

      if (checkError) throw checkError;

      const resList = activeRes || [];
      const availCount = getAvailableCountForPeriod(bookingForm.pickupDate, bookingForm.returnDate, resList);

      if (availCount < bookingForm.quantity) {
        toast.error(`Infelizmente, só temos ${availCount} poltrona(s) disponível(eis) no período selecionado. Escolha outras datas ou quantidade.`, { id: loadToast });
        setIsSubmitting(false);
        return;
      }

      // Encontrar as poltronas físicas que estão livres para o período
      const availableIds = getAvailableVehicleIdsForPeriod(bookingForm.pickupDate, bookingForm.returnDate, resList, vehicles);
      if (availableIds.length < bookingForm.quantity) {
        toast.error('Erro de estoque: Não foi possível mapear poltronas livres suficientes para o período.', { id: loadToast });
        setIsSubmitting(false);
        return;
      }

      const selectedIds = availableIds.slice(0, bookingForm.quantity);

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
      
      // 2. Insert reservations (one record per physical chair)
      const valuePerChair = selectedPlanId 
        ? (totals.planPrice + totals.servicesTotal) 
        : ((totals.days * totals.dailyRate) + totals.servicesTotal);
      const reservationPayloads = selectedIds.map((vId, idx) => ({
        client_id: clientId,
        vehicle_id: vId,
        pickup_date: new Date(bookingForm.pickupDate).toISOString(),
        return_date: new Date(bookingForm.returnDate).toISOString(),
        daily_rate: selectedPlanId ? (totals.planPrice / totals.days) : totals.dailyRate,
        days: totals.days,
        total_value: valuePerChair,
        security_deposit: selectedVehicle?.default_security_deposit || 0,
        insurance_value: 0,
        insurance_details: INSURANCE_COVERAGES.map(name => ({ name, value: 0, selected: true })),
        additional_services: bookingForm.selectedServices.map(srvId => {
          const srv = ADDITIONAL_SERVICES.find(s => s.id === srvId);
          return srv ? srv.name : srvId;
        }).join(', '),
        observations: `Poltrona ${idx + 1} de ${bookingForm.quantity}. Reserva efetuada no site público.${selectedPlanId ? ` Plano: ${PLANS.find(p => p.id === selectedPlanId)?.name}.` : ''}`,
        origin: 'site',
        status: 'aguardando retirada'
      }));
      
      const { data: newResList, error: resErr } = await supabase
        .from('reservations')
        .insert(reservationPayloads)
        .select('*');
        
      if (resErr) throw resErr;
      
      toast.success('Reserva(s) cadastrada(s) com sucesso!', { id: loadToast });
      setCreatedReservations(newResList || []);
      setCreatedReservation(newResList && newResList.length > 0 ? newResList[0] : null);
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
    <div className="bg-[#edf1f0] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-primary selection:text-white">
      {/* Glow Orbs de Fundo para Estética Moderna */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <nav className="fixed top-0 w-full z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all no-print">
        <div className="flex items-center gap-3">
          <img src={posleveLogoText} className="h-11 sm:h-16 w-auto object-contain" alt="PÓS LEVE" />
        </div>
        
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-650 dark:text-slate-400 uppercase tracking-wider">
            <a href="#acervo" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-accent-coral hover:after:w-full after:transition-all">Nosso Acervo</a>
            <a href="#sobre" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-accent-coral hover:after:w-full after:transition-all">Quem Somos</a>
            <a href="#contato" className="hover:text-primary dark:hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-accent-coral hover:after:w-full after:transition-all">Contato</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-3.5 sm:px-5 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-full font-bold text-xs hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 sm:gap-2"
          >
            <span className="material-symbols-outlined text-base">lock</span>
            <span className="text-[10px] sm:text-xs">Área Restrita</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-36 pb-12 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center no-print">
        <div className="space-y-8 lg:col-span-7">

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
            Sua recuperação com o <span className="text-accent-coral">máximo de conforto</span> e segurança.
          </h1>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
            Locação de poltronas pós-cirúrgicas reclináveis (motorizadas e manuais). Garantimos higienização profunda de grau clínico e entrega expressa diretamente no seu domicílio.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a href="#acervo" className="px-8 py-4 bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl shadow-accent-coral/25 flex items-center gap-2">
              <span>Explorar Poltronas</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </a>
            <button 
              onClick={() => {
                setSelectedPlanId(null);
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
            {heroImages.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt={`Poltrona PÓS LEVE de Recuperação - Slide ${index + 1}`} 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                  index === currentHeroIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              />
            ))}
            
            {/* Carousel Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-slate-900/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHeroIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentHeroIndex 
                      ? 'bg-accent-coral w-6' 
                      : 'bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Ver imagem ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planos de Locação Section */}
      <section id="planos" className="py-24 bg-[#edf1f0] dark:bg-slate-950 no-print">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex p-2 bg-primary/10 text-primary rounded-xl mb-2">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Planos de Locação</h2>
            <div className="w-16 h-1 bg-accent-coral mx-auto rounded-full"></div>
            <p className="text-slate-700 dark:text-slate-350 font-medium">
              Escolha o plano ideal para a sua necessidade de recuperação. Ao selecionar um plano, a data de devolução é preenchida automaticamente de acordo com o período escolhido.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PLANS.map((plan) => {
              const isHighlight = plan.highlight;
              const planIcon = plan.id === 'essencial' ? 'calendar_month' : plan.id === 'plus' ? 'recommend' : 'workspace_premium';
              
              return (
                <div 
                  key={plan.id}
                  className={`relative bg-white dark:bg-slate-900 rounded-3xl p-8 border transition-all duration-500 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl group ${
                    isHighlight 
                      ? 'border-accent-coral/60 ring-4 ring-accent-coral/5 shadow-xl md:scale-105 z-10 bg-gradient-to-b from-white to-accent-coral/[0.02] dark:from-slate-900 dark:to-accent-coral/[0.02]' 
                      : 'border-slate-200 dark:border-slate-800 shadow-md hover:border-primary/30 dark:hover:border-brand-teal/30'
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`p-3.5 rounded-2xl ${
                        isHighlight 
                          ? 'bg-accent-coral/15 text-accent-coral' 
                          : 'bg-primary/10 text-primary dark:bg-slate-800 dark:text-brand-teal'
                      }`}>
                        <span className="material-symbols-outlined text-2xl font-bold">{planIcon}</span>
                      </div>
                      {isHighlight && (
                        <span className="bg-accent-coral text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md animate-pulse">
                          {plan.highlight}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary dark:group-hover:text-brand-teal transition-colors">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 min-h-[32px]">{plan.description}</p>
                    </div>

                    <div className="border-y border-slate-100 dark:border-slate-800/80 py-5 flex flex-col justify-center">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">R$</span>
                        <span className="text-4xl font-display font-black text-primary dark:text-[#65b0b4]">
                          {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Período de {plan.days} dias</span>
                    </div>

                    <ul className="space-y-3">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-350 font-semibold">
                          <span className="material-symbols-outlined text-emerald-500 font-bold text-base shrink-0 mt-0.5">check</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id as any)}
                    className={`w-full py-4 mt-8 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border shadow-sm ${
                      isHighlight
                        ? 'bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary border-accent-coral/10 hover:shadow-lg hover:shadow-accent-coral/25 hover:scale-[1.01] active:scale-95'
                        : 'bg-transparent text-slate-700 dark:text-slate-355 border-slate-250 dark:border-slate-755 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-350 hover:scale-[1.01] active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base font-bold">shopping_cart</span>
                    Escolher Plano
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fleet Section (Acervo) - Único Modelo Premium */}
      <section id="acervo" className="py-24 bg-[#e3eae8] dark:bg-slate-900 border-y border-slate-200/60 dark:border-slate-800/50 no-print">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex p-2 bg-primary/10 text-primary rounded-xl mb-2">
              <span className="material-symbols-outlined">chair</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Equipamento de Destaque</h2>
            <div className="w-16 h-1 bg-accent-coral mx-auto rounded-full"></div>
            <p className="text-slate-750 dark:text-slate-400 font-medium">
              Oferecemos o melhor em tecnologia de recuperação pós-cirúrgica. Conheça nossa poltrona exclusiva de alto padrão.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
              <p className="text-slate-400 font-semibold text-sm">Carregando dados do estoque...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 font-bold text-sm">Nenhum equipamento cadastrado no momento.</p>
            </div>
          ) : (
            (() => {
              const v = vehicles[0]; // Pegamos a primeira poltrona como referência do modelo
              return (
                <div className="bg-white dark:bg-slate-850 rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-xl max-w-5xl mx-auto grid md:grid-cols-12 gap-0 group">
                  {/* Imagem do Produto (Metade Esquerda) */}
                  <div className="md:col-span-5 relative bg-slate-100 dark:bg-slate-800 min-h-[300px] md:min-h-full overflow-hidden">
                    <div className="absolute inset-0">
                      {/* Carousel de Imagens da Poltrona */}
                      <img 
                        src={heroImages[currentHeroIndex]} 
                        alt={v.model} 
                        className="w-full h-full object-cover transition-all duration-750 ease-in-out animate-in fade-in duration-300" 
                      />
                    </div>
                    {/* Categoria Badge */}
                    <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-primary dark:text-secondary shadow-md z-10">
                      {v.category}
                    </div>

                    {/* Tecnologia Badge */}
                    <div className="absolute bottom-6 left-6 px-3.5 py-1.5 bg-primary/95 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg z-10 border border-primary/20">
                      <span className="material-symbols-outlined text-xs">bolt</span>
                      Motorizada com Controle
                    </div>
                  </div>

                  {/* Detalhes do Produto (Metade Direita) */}
                  <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-8">
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-955 dark:text-white uppercase tracking-tight">{v.model}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{v.brand} • Cor: Marrom Escuro & Bege Disponíveis</p>
                        </div>
                        <div className="bg-[#edf1f0] dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] text-slate-550 font-bold uppercase">Diária</p>
                          <p className="text-lg font-black text-primary dark:text-secondary">R$ {(v.daily_rate || 15).toFixed(2)}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        Idealizada para recuperação pós-operatória confortável e segura. O sistema motorizado Lift eleva e inclina a poltrona suavemente por controle remoto, poupando a musculatura abdominal do paciente ao levantar e deitar.
                      </p>

                      {/* Especificações em Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 dark:text-slate-350">
                          <span className="material-symbols-outlined text-emerald-500 font-bold text-lg">check_circle</span>
                          <span>Sistema Lift de Levante</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 dark:text-slate-350">
                          <span className="material-symbols-outlined text-emerald-500 font-bold text-lg">check_circle</span>
                          <span>Reclinação Elétrica 160°</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 dark:text-slate-350">
                          <span className="material-symbols-outlined text-emerald-500 font-bold text-lg">check_circle</span>
                          <span>Estofado Clínico Higienizável</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 dark:text-slate-350">
                          <span className="material-symbols-outlined text-emerald-500 font-bold text-lg">check_circle</span>
                          <span>Porta-copos Integrados</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                      <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Caução de Segurança</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">R$ {(v.default_security_deposit || 400).toFixed(2)}</span> (Reembolsável)
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedPlanId(null);
                          setSelectedVehicle(v);
                          setBookingForm(prev => ({
                            ...prev,
                            vehicleId: v.id,
                            pickupDate: '',
                            returnDate: ''
                          }));
                          setIsBookingOpen(true);
                          setBookingStep(1);
                        }}
                        className="px-8 py-3.5 bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary font-black text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-coral/20 uppercase tracking-wider flex items-center justify-center gap-2 border border-accent-coral/20"
                      >
                        <span className="material-symbols-outlined">edit_calendar</span>
                        Reservar Agora
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* Missão e Qualidade Section */}
      <section id="sobre" className="py-12 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center no-print">
        <div className="lg:col-span-6 order-2 lg:order-1 relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-secondary/5 to-primary/10 rounded-3xl blur-2xl"></div>
          <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <img 
              src={posleveQuality} 
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
          <div className="w-16 h-1 bg-accent-coral rounded-full"></div>
          
          <div className="space-y-6 text-slate-750 dark:text-slate-300 font-medium leading-relaxed">
            <p>
              A <span className="font-bold text-primary">PÓS LEVE</span> foi idealizada a partir do propósito de fornecer dignidade, conforto e segurança active durante o repouso pós-operatório em Fortaleza - CE. O repouso clínico adequado com elevação de membros e coluna reduz dores e acelera a cicatrização.
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
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-0.5">Esterilização profunda em cada entrega.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">local_shipping</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Entrega no Quarto</h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-0.5">Montagem e ajuste no local do paciente.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">healing</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ergonomia de Cura</h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-0.5">Ângulos de reclinação ideais recomendados.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">support_agent</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Suporte Domiciliar</h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-0.5">Acompanhamento e ajuste do controle.</p>
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
              <span className="material-symbols-outlined text-accent-coral text-2xl">event_available</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black leading-tight uppercase tracking-tight">
              Reserve sua <span className="bg-gradient-to-r from-accent-coral to-white bg-clip-text text-transparent">Poltrona</span> agora.
            </h2>
            <p className="text-white/80 font-medium text-base">
              Preencha o formulário para iniciar sua reserva online em etapas. Você poderá preencher seus dados, escolher opcionais e obter seu voucher de confirmação na hora!
            </p>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
              <span className="material-symbols-outlined text-accent-coral text-3xl">bolt</span>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">Atendimento Autônomo</p>
                <p className="text-xs text-white/60 mt-0.5">Sem filas, preencha tudo online e garanta sua poltrona.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#edf1f0]/95 dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/50 dark:border-slate-800 lg:col-span-7 max-w-xl mx-auto w-full">
            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-accent-coral">assignment</span>
              Reserva Prática e Rápida
            </h3>
            <form 
              onSubmit={handleBottomFormSubmit} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-655 dark:text-slate-400 uppercase tracking-widest">Seu Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                  <input 
                    required
                    type="text" 
                    className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    placeholder="Nome de quem vai alugar"
                    value={bottomForm.name}
                    onChange={e => setBottomForm({ ...bottomForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-655 dark:text-slate-400 uppercase tracking-widest">WhatsApp de Contato</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
                    <input 
                      required
                      type="tel" 
                      className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      placeholder="(85) 98406-5904"
                      value={bottomForm.phone}
                      onChange={e => setBottomForm({ ...bottomForm, phone: maskPhone(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-655 dark:text-slate-400 uppercase tracking-widest">Data de Início Pretendida</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">calendar_today</span>
                    <input 
                      required
                      type="date" 
                      className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      value={bottomForm.date}
                      onChange={e => setBottomForm({ ...bottomForm, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-655 dark:text-slate-400 uppercase tracking-widest">Selecione o Plano Desejado</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">local_mall</span>
                  <select 
                    required
                    className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none"
                    value={bottomForm.planId}
                    onChange={e => setBottomForm({ ...bottomForm, planId: e.target.value })}
                  >
                    <option value="sem_plano">Locação Livre (Sem seguir plano)</option>
                    {PLANS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.days} dias) - R$ {p.price.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-coral/25 flex items-center justify-center gap-2 border border-accent-coral/20"
              >
                <span className="material-symbols-outlined text-base">send</span>
                Enviar Solicitação via WhatsApp
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
                  <p className="text-base font-bold text-slate-200">Fortaleza - CE</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Telefone de Contato</p>
                  <p className="text-base font-bold text-slate-200">(85) 98406-5904</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">E-mail de Contato</p>
                  <p className="text-base font-bold text-slate-200">poslevepoltronas@gmail.com</p>
                </div>
              </div>

              {/* Instagram & Facebook */}
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-primary/20 text-secondary border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">share</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Redes Sociais</p>
                  <div className="flex items-center gap-4 mt-1">
                    <a href="https://www.instagram.com/poslevepoltronas" target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-accent-coral transition-colors flex items-center gap-1.5 text-sm font-bold">
                      <Instagram size={16} className="text-[#ec9b85]" />
                      Instagram
                    </a>
                    <span className="text-slate-600">|</span>
                    <a href="https://www.facebook.com/people/P%C3%B3s-Leve/61585913834540/#" target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-accent-coral transition-colors flex items-center gap-1.5 text-sm font-bold">
                      <Facebook size={16} className="text-[#ec9b85]" />
                      Facebook
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-8">
            <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-video relative group bg-slate-800">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127357.5459388382!2d-38.60155255476315!3d-3.7931326419736853!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7c74c3f464c783f%3A0x463c640d1487508a!2sFortaleza%2C%20CE!5e0!3m2!1spt-BR!2sbr!4v1717947118000!5m2!1spt-BR!2sbr" 
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
                  <span className="text-sm font-bold text-secondary">08:00 - 18:00</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/40">
                  <span className="text-xs font-semibold text-slate-400">Sábado e Domingo</span>
                  <span className="text-sm font-bold text-slate-500">Fechado</span>
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
              <p className="font-semibold text-slate-500">© 2026 PÓS LEVE. Todos os direitos reservados.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-[#edf1f0] dark:bg-slate-900 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] sm:max-w-4xl rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-y-auto overflow-x-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-[#edf1f0]/50 dark:bg-slate-800/50 sticky top-0 z-25 backdrop-blur-md">
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
              <div className="px-4 sm:px-8 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-750 flex items-center justify-center gap-3 sm:gap-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className={`flex items-center gap-2 ${bookingStep === 1 ? 'text-primary dark:text-accent-coral font-bold' : ''}`}>
                  <span className={`size-5 rounded-full flex items-center justify-center border font-bold ${bookingStep === 1 ? 'border-accent-coral bg-accent-coral text-primary' : 'border-slate-300'}`}>1</span>
                  <span>Opções de Locação</span>
                </div>
                <div className="h-0.5 w-6 sm:w-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className={`flex items-center gap-2 ${bookingStep === 2 ? 'text-primary dark:text-accent-coral font-bold' : ''}`}>
                  <span className={`size-5 rounded-full flex items-center justify-center border font-bold ${bookingStep === 2 ? 'border-accent-coral bg-accent-coral text-primary' : 'border-slate-300'}`}>2</span>
                  <span>Dados Cadastrais</span>
                </div>
              </div>
            )}

            {/* Modal Body / Forms */}
            <div className="flex-1 overflow-y-auto">
              
              {/* STEP 1: OPTIONS & PRICING */}
              {bookingStep === 1 && (
                <div className="p-4 sm:p-8 space-y-6">
                  {/* Modalidade de Locação Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Modalidade de Locação</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(null);
                          setBookingForm(prev => ({ ...prev, pickupDate: '', returnDate: '' }));
                        }}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          selectedPlanId === null
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-355 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Personalizada (Diária)
                      </button>
                      {PLANS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlanId(p.id as any);
                            setBookingForm(prev => ({ ...prev, pickupDate: '', returnDate: '' }));
                          }}
                          className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                            selectedPlanId === p.id
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-355 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Vehicle Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poltrona Disponível</label>
                      {selectedVehicle ? (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 h-12">
                          {selectedVehicle.image_url ? (
                            <img src={getImageUrl(selectedVehicle.image_url)} alt={selectedVehicle.model} className="size-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                          ) : (
                            <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                              <span className="material-symbols-outlined text-sm">chair</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">{selectedVehicle.model}</h4>
                            <p className="text-[9px] font-black text-primary dark:text-secondary">
                              {selectedPlanId ? (
                                (() => {
                                  const plan = PLANS.find(p => p.id === selectedPlanId);
                                  return plan 
                                    ? `R$ ${plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ${plan.days} dias`
                                    : `R$ ${(selectedVehicle.daily_rate || 15).toFixed(2)} / dia`;
                                })()
                              ) : (
                                `R$ ${(selectedVehicle.daily_rate || 15).toFixed(2)} / dia`
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <select
                          required
                          className="w-full h-12 bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 dark:text-white"
                          value={bookingForm.vehicleId}
                          onChange={e => {
                            const v = vehicles.find(x => x.id === e.target.value);
                            setSelectedVehicle(v || null);
                            setBookingForm(prev => ({ ...prev, vehicleId: e.target.value }));
                          }}
                        >
                          <option value="">Selecione a poltrona</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.brand} {v.model} - R$ {(v.daily_rate || 15).toFixed(2)}/dia</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Period Input using Calendar Component */}
                    <div className="space-y-2 relative">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {selectedPlanId ? 'Data de Retirada (Início)' : 'Período Desejado'}
                      </label>
                      <button
                        type="button"
                        disabled={!bookingForm.vehicleId || isLoadingAvailability}
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`w-full h-12 flex items-center justify-between px-4 rounded-xl text-xs font-medium transition-all border
                          ${!bookingForm.vehicleId ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-855 border-slate-200 dark:border-slate-700 dark:text-white'}
                          ${showCalendar ? 'ring-2 ring-primary/20 border-primary' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-sm opacity-60">calendar_month</span>
                          <span className="truncate">
                            {bookingForm.pickupDate
                              ? selectedPlanId
                                ? `${new Date(bookingForm.pickupDate).toLocaleDateString('pt-BR')} (Devolução: ${new Date(bookingForm.returnDate).toLocaleDateString('pt-BR')})`
                                : `${new Date(bookingForm.pickupDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${new Date(bookingForm.returnDate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              : !bookingForm.vehicleId ? 'Selecione a poltrona' : 'Selecionar data de início...'}
                          </span>
                        </div>
                        {isLoadingAvailability && <span className="animate-spin material-symbols-outlined text-xs shrink-0">progress_activity</span>}
                      </button>

                      {showCalendar && (
                        <div 
                          className="fixed inset-0 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-[110] flex items-center justify-center sm:block p-4 sm:p-0 bg-slate-900/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none"
                          onClick={(e) => {
                            if (e.target === e.currentTarget) {
                              setShowCalendar(false);
                            }
                          }}
                        >
                          <Calendar
                            occupiedRanges={occupiedRanges}
                            initialPickup={bookingForm.pickupDate}
                            initialReturn={bookingForm.returnDate}
                            planDays={selectedPlanId ? PLANS.find(p => p.id === selectedPlanId)?.days : undefined}
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

                    {/* Quantity Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantidade</label>
                      <select
                        className="w-full h-12 bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-medium dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                        value={bookingForm.quantity}
                        onChange={e => setBookingForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      >
                        {[1, 2, 3, 4, 5].map(q => (
                          <option key={q} value={q}>{q} {q === 1 ? 'poltrona' : 'poltronas'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live availability feedback block */}
                  {bookingForm.pickupDate && (
                    <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-slate-800/50 border-blue-200 dark:border-slate-700 text-xs space-y-2">
                      {(() => {
                        const pickup = bookingForm.pickupDate;
                        const returnD = bookingForm.returnDate || new Date(new Date(pickup).getTime() + 7 * 24 * 3600000).toISOString();
                        const avail = getAvailableCountForPeriod(pickup, returnD, allReservations);
                        const limitDate = getStockLimitDate(pickup, bookingForm.quantity, allReservations);
                        const nextDate = getNextAvailableDateForQuantity(pickup, returnD, bookingForm.quantity, allReservations);
                        const pendingOverlaps = getPendingOverlapsCount(pickup, returnD, allReservations);

                        const isAvailable = avail >= bookingForm.quantity;

                        return (
                          <>
                            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                              <span className={`size-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                              <span>
                                {isAvailable 
                                  ? `Disponível: ${avail} poltronas livres no período.` 
                                  : `Estoque insuficiente: Apenas ${avail} poltrona(s) disponível(eis).`
                                }
                              </span>
                            </div>
                            <div className="text-slate-650 dark:text-slate-400 space-y-1 pl-4.5">
                              {isAvailable ? (
                                <p>
                                  Você pode alugar {bookingForm.quantity} {bookingForm.quantity === 1 ? 'unidade' : 'unidades'} continuamente de {new Date(pickup).toLocaleDateString('pt-BR')} 
                                  {limitDate ? ` até ${limitDate.toLocaleDateString('pt-BR')} (quando o estoque reduzirá).` : ' sem restrições de estoque no período visível.'}
                                </p>
                              ) : (
                                <p className="text-rose-600 dark:text-rose-455 font-semibold">
                                  Para este período só temos {avail} poltronas disponíveis. A próxima data com estoque de {bookingForm.quantity} unidades é a partir de {nextDate ? nextDate.toLocaleDateString('pt-BR') : 'um período futuro'}.
                                </p>
                              )}
                            </div>
                            {pendingOverlaps > 0 && (
                              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 font-bold rounded-lg flex items-start gap-2.5 shadow-sm">
                                <span className="material-symbols-outlined text-[16px] mt-0.5 text-amber-600 dark:text-amber-400">warning</span>
                                <div>
                                  <p className="uppercase tracking-widest text-[8px] text-amber-900 dark:text-amber-300">Urgência de Reserva</p>
                                  <p className="font-semibold text-slate-700 dark:text-slate-350 mt-0.5 leading-normal text-[11px]">
                                    Há {pendingOverlaps} solicitação(ões) de reserva pendente(s) de caução para este período. O equipamento não está garantido para elas até que o pagamento seja realizado. Para garantir a sua vaga com prioridade, confirme o seu caução o quanto antes!
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Additional Services */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Opcionais & Acessórios Adicionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {ADDITIONAL_SERVICES.map(srv => (
                        <label 
                          key={srv.id}
                          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                            bookingForm.selectedServices.includes(srv.id)
                              ? 'bg-accent-coral/10 border-accent-coral/30 dark:bg-accent-coral/20'
                              : 'bg-white dark:bg-slate-850/50 border-slate-200 dark:border-slate-750'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              className="rounded border-slate-350 text-accent-coral focus:ring-accent-coral"
                              checked={bookingForm.selectedServices.includes(srv.id)}
                              onChange={() => handleServiceToggle(srv.id)}
                            />
                            <span className="text-xs font-bold text-slate-850 dark:text-slate-250 leading-tight">{srv.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-[#d67e67] dark:text-[#ec9b85] shrink-0 ml-2">
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
                      <h4 className="text-xs font-black uppercase tracking-wider">Garantias Clínicas PÓS LEVE (Inclusas)</h4>
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
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                    <button 
                      onClick={() => setIsBookingOpen(false)}
                      className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleNextStep1}
                      className="w-full sm:w-auto px-8 py-2.5 bg-accent-coral text-primary rounded-lg text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-md shadow-accent-coral/20"
                    >
                      Continuar Reserva
                    </button>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <form onSubmit={handleSaveBooking} className="p-4 sm:p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b pb-1">Seus Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* CPF */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-widest">CPF</span>
                        <input
                          required
                          type="text"
                          placeholder="000.000.000-00"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.cpf}
                          onChange={handleCpfChange}
                        />
                      </div>
                      {/* Name */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Nome Completo</span>
                        <input
                          required
                          type="text"
                          placeholder="Nome Completo do Locatário"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.name}
                          onChange={e => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      {/* Birth Date */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Data de Nascimento</span>
                        <input
                          required
                          type="date"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.birthDate}
                          onChange={e => setBookingForm(prev => ({ ...prev, birthDate: e.target.value }))}
                        />
                      </div>
                      {/* Phone */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">WhatsApp / Celular</span>
                        <input
                          required
                          type="tel"
                          placeholder="(88) 99999-9999"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.phone}
                          onChange={e => setBookingForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                        />
                      </div>
                      {/* Email */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">E-mail</span>
                        <input
                          required
                          type="email"
                          placeholder="email@exemplo.com"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.email}
                          onChange={e => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      {/* RG */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Documento (RG)</span>
                        <input
                          required
                          type="text"
                          placeholder="Número do seu RG"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
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
                        <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-widest">CEP (Busca Automática)</span>
                        <input
                          required
                          type="text"
                          placeholder="00000-000"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.cep}
                          onChange={handleCepChange}
                        />
                      </div>
                      {/* Street */}
                      <div className="md:col-span-3 space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Logradouro (Rua/Av)</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Rua Monsenhor Franklin"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.street}
                          onChange={e => setBookingForm(prev => ({ ...prev, street: e.target.value }))}
                        />
                      </div>
                      {/* Number */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Número</span>
                        <input
                          required
                          type="text"
                          placeholder="123"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.number}
                          onChange={e => setBookingForm(prev => ({ ...prev, number: e.target.value }))}
                        />
                      </div>
                      {/* Neighborhood */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Bairro</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Centro"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.neighborhood}
                          onChange={e => setBookingForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                        />
                      </div>
                      {/* City */}
                      <div className="md:col-span-3 space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">Cidade</span>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Tianguá"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          value={bookingForm.city}
                          onChange={e => setBookingForm(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      {/* State */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-widest">UF</span>
                        <input
                          required
                          type="text"
                          maxLength={2}
                          placeholder="CE"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white text-center font-bold"
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
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Voltar Etapa
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-accent-coral to-[#e28a73] text-primary rounded-lg text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-md shadow-accent-coral/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
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
              {/* STEP 3: VOUCHER VIEW */}
              {bookingStep === 3 && createdReservation && (
                <div className="p-4 sm:p-8 space-y-6">
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
                        <p className="uppercase tracking-widest text-[9px]">Atenção: Pagamento do Caução & Contrato</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-350 mt-1 leading-normal">
                          A sua reserva <strong className="text-amber-950 dark:text-amber-300">só será confirmada e garantida mediante o pagamento do caução de segurança</strong>. O contrato de locação definitivo será assinado presencialmente pela nossa equipe no momento da entrega da poltrona.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PRINTABLE VOUCHER */}
                  {(() => {
                    const totalValue = createdReservations.reduce((sum, r) => sum + (r.total_value || 0), 0);
                    const totalDeposit = createdReservations.reduce((sum, r) => sum + (r.security_deposit || 0), 0);
                    const reservedPlates = createdReservations.map(r => {
                      const v = vehicles.find(x => x.id === r.vehicle_id);
                      return v ? v.plate : 'Série N/A';
                    }).join(', ');

                    return (
                      <>
                        <div className="w-full overflow-x-auto p-1.5 md:p-0 flex justify-start md:justify-center">
                          <div className="print-area w-full min-w-[580px] sm:min-w-0 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-left max-w-2xl mx-auto">
                            <div className="p-6 bg-slate-50 border-b border-slate-200">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-xl">chair</span>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black tracking-tight text-primary uppercase">PÓS LEVE</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Voucher Oficial do Cliente</p>
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <p className="text-[9px] uppercase tracking-widest text-slate-450 font-bold">Solicitação Site</p>
                                  <p className="text-xs font-mono font-bold text-slate-600">REF: #VR-PL-{createdReservation.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-6 md:p-8 space-y-6">
                              {/* Customer Info */}
                              <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">person</span> Informações do Locatário
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Poltrona Reservada</p>
                                    <p className="font-bold text-slate-800 uppercase">{selectedVehicle?.brand} {selectedVehicle?.model}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Quantidade Reservada</p>
                                    <p className="font-bold text-slate-800">{createdReservations.length} {createdReservations.length === 1 ? 'poltrona' : 'poltronas'}</p>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Nº de Série Alocados (Placas)</p>
                                    <p className="font-bold text-slate-800 font-mono">{reservedPlates}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Period & Costs */}
                              <div className="border-t border-slate-100 pt-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">calendar_today</span> Período & Valores
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Duração / Diária</p>
                                    <p className="font-bold text-slate-800">
                                      {selectedPlanId ? (
                                        `Plano ${PLANS.find(p => p.id === selectedPlanId)?.name} (${PLANS.find(p => p.id === selectedPlanId)?.days} dias) - R$ ${PLANS.find(p => p.id === selectedPlanId)?.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por unidade`
                                      ) : (
                                        `${createdReservation.days} diárias a R$ ${(selectedVehicle?.daily_rate || 15).toFixed(2)}/dia por unidade`
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Valor Total Estimado</p>
                                    <p className="font-black text-emerald-600 text-sm">
                                      R$ {totalValue.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Caução de Segurança Total</p>
                                    <p className="font-bold text-slate-800">
                                      R$ {totalDeposit.toFixed(2)} <span className="text-[10px] text-slate-500 font-medium italic">(Reembolsável)</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Signatures */}
                              <div className="border-t border-slate-150 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center text-[9px] font-bold text-slate-400">
                                <div>
                                  <div className="border-t border-slate-300 pt-1 uppercase">PÓS LEVE Ltda</div>
                                </div>
                                <div>
                                  <div className="border-t border-slate-300 pt-1 uppercase">{bookingForm.name}</div>
                                </div>
                              </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 text-[9px] text-slate-655 border-t border-slate-100 italic text-center leading-normal font-bold">
                              ATENÇÃO: A reserva deste equipamento só será efetivamente confirmada e garantida mediante o pagamento do caução de segurança (caução reembolsável). O contrato definitivo será assinado no ato da entrega.
                            </div>
                          </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="no-print pt-6 border-t border-slate-100 dark:border-slate-850 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center w-full">
                          <button
                            onClick={() => {
                              setIsBookingOpen(false);
                              setCreatedReservation(null);
                              setBookingStep(1);
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                          >
                            Fechar Janela
                          </button>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => window.print()}
                              className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <Printer size={14} />
                              Imprimir Voucher
                            </button>
                            <button
                              onClick={() => {
                                const message = `*PÓS LEVE - Confirmação de Reserva*%0A%0A*Voucher:* #VR-PL-${createdReservation.id.substring(0,8).toUpperCase()}%0A*Cliente:* ${bookingForm.name}%0A*CPF:* ${bookingForm.cpf}%0A*Quantidade:* ${createdReservations.length} poltrona(s)%0A*Poltronas alocadas (Patrimônio):* ${reservedPlates}%0A*Entrega:* ${new Date(bookingForm.pickupDate).toLocaleString('pt-BR')}%0A*Devolução:* ${new Date(bookingForm.returnDate).toLocaleString('pt-BR')}%0A*Valor total:* R$ ${totalValue.toFixed(2)}%0A*Caução:* R$ ${totalDeposit.toFixed(2)}%0A%0A*Confirmação de Caução:* Solicito os dados bancários para o pagamento do caução de R$ ${totalDeposit.toFixed(2)}.%0A%0A_Atenção: O contrato será assinado no ato da entrega._`;
                                window.open(`https://wa.me/558584065904?text=${message}`, '_blank');
                              }}
                              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all animate-pulse"
                            >
                              <Send size={14} />
                              Enviar Confirmação
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
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