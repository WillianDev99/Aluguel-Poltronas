import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { clientSchema } from '../schemas/client.schema';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { supabase } from '../lib/supabase';

interface ClientsViewProps {
  clients: Client[];
  isLoading?: boolean;
  onAddClient: (c: Omit<Client, 'id'>) => Promise<void>;
  onUpdateClient: (id: string, c: Partial<Omit<Client, 'id'>>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
}

const ClientsView: React.FC<ClientsViewProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient, isLoading }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    cpf: '',
    rg: '',
    birth_date: '',
    cnh_number: '',
    cnh_category: 'B',
    cnh_expiration: '',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    status: 'Ativo',
    vip: false,
    score: 0,
    cnh_url: '',
    address_proof_url: '',
    selfie_url: ''
  });

  const [attachedFiles, setAttachedFiles] = useState<{
    cnh?: File;
    address?: File;
    selfie?: File;
  }>({});

  const resetForm = () => {
    setFormData({
      name: '', cpf: '', rg: '', birth_date: '', cnh_number: '',
      cnh_category: 'B', cnh_expiration: '',
      email: '', phone: '', cep: '', street: '', number: '',
      neighborhood: '', city: '', state: '', status: 'Ativo',
      vip: false, score: 0,
      cnh_url: '', address_proof_url: '', selfie_url: ''
    });
    setAttachedFiles({});
    setEditingClient(null);
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro.toUpperCase(),
        neighborhood: data.bairro.toUpperCase(),
        city: data.localidade.toUpperCase(),
        state: data.uf.toUpperCase()
      }));
      
      toast.success('Endereço preenchido automaticamente!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar endereço pelo CEP.');
    }
  };

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file: File, path: string) => {
    try {
      return await compressImage(file);
    } catch (err) {
      console.error('Erro ao otimizar imagem, usando fallback:', err);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const handleCpfMask = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handlePhoneMask = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '$1 $2')
      .replace(/^(\d{2})\s(\d{1})(\d)/g, '$1 $2 $3')
      .replace(/^(\d{2})\s(\d{1})\s(\d{4})(\d)/g, '$1 $2 $3-$4')
      .slice(0, 15);
  };

  const handleCepMask = (value: string) => {
    const masked = value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
    
    if (masked.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(masked);
    }
    
    return masked;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = clientSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Salvando dados do cliente...');

    try {
      const finalData = { ...formData };
      
      if (attachedFiles.cnh) {
        finalData.cnh_url = await uploadFile(attachedFiles.cnh, 'cnh');
      }
      if (attachedFiles.address) {
        finalData.address_proof_url = await uploadFile(attachedFiles.address, 'address');
      }
      if (attachedFiles.selfie) {
        finalData.selfie_url = await uploadFile(attachedFiles.selfie, 'selfie');
      }

      if (editingClient) {
        await onUpdateClient(editingClient.id, finalData);
      } else {
        await onAddClient(finalData);
      }
      
      toast.success('Cliente salvo com sucesso!', { id: loadingToast });
      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Falha na conexão'), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Clientes Cadastrados</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie sua base de clientes e novos registros no sistema.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span>
          <span>Novo Cliente</span>
        </button>
      </div>

      <section className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto p-4 sm:p-6">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPF / RG</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade/UF</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {c.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                        <div>{c.cpf}</div>
                        <div className="text-[10px] opacity-70">RG: {c.rg || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span 
                            title={c.cnh_url ? "RG/CPF Anexado" : "RG/CPF Pendente"} 
                            className={`material-symbols-outlined text-lg ${c.cnh_url ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}
                          >
                            badge
                          </span>
                          <span 
                            title={c.address_proof_url ? "Comprovante de Residência Anexado" : "Comprovante de Residência Pendente"} 
                            className={`material-symbols-outlined text-lg ${c.address_proof_url ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}
                          >
                            home_pin
                          </span>
                          <span 
                            title={c.selfie_url ? "Selfie Anexada" : "Selfie Pendente"} 
                            className={`material-symbols-outlined text-lg ${c.selfie_url ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}
                          >
                            add_a_photo
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.city} / {c.state}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingClient(c);
                            setFormData({
                              name: c.name,
                              cpf: c.cpf,
                              rg: c.rg,
                              birth_date: c.birth_date,
                              cnh_number: c.cnh_number,
                              cnh_category: c.cnh_category,
                              cnh_expiration: c.cnh_expiration,
                              email: c.email,
                              phone: c.phone,
                              cep: c.cep,
                              street: c.street,
                              number: c.number,
                              neighborhood: c.neighborhood,
                              city: c.city,
                              state: c.state,
                              status: c.status,
                              vip: c.vip,
                              score: c.score,
                              cnh_url: c.cnh_url || '',
                              address_proof_url: c.address_proof_url || '',
                              selfie_url: c.selfie_url || ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-1 hover:text-primary dark:hover:text-accent-sunshine text-slate-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja excluir o cliente "${c.name}"?`)) {
                              await onDeleteClient(c.id);
                            }
                          }}
                          className="p-1 hover:text-rose-500 text-slate-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado no banco de dados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden flex flex-col">
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingClient ? 'Editar Cliente' : 'Registrar Novo Cliente'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {editingClient ? 'Atualize os dados do cliente selecionado.' : 'Preencha as informações necessárias para o cadastro.'}
                </p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="size-10 flex items-center justify-center rounded-full hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="p-4 sm:p-8 space-y-6 sm:space-y-10" onSubmit={handleSubmit}>
              <div>
                <div className="flex items-center gap-2 mb-6 border-l-4 border-primary pl-3">
                  <span className="text-xs font-black text-primary dark:text-accent-sunshine uppercase tracking-widest">01. Dados Pessoais</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome Completo</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="Nome completo do cliente" type="text" required
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="email@exemplo.com" type="email" required
                      value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CPF</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white font-mono"
                      placeholder="000.000.000-00" type="text" required
                      value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: handleCpfMask(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">RG</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="00.000.000-0" type="text"
                      value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Data de Nascimento</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                      type="date" required
                      value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefone</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white font-mono"
                      placeholder="00 0 0000-0000" type="text" required
                      value={formData.phone} onChange={e => setFormData({ ...formData, phone: handlePhoneMask(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6 border-l-4 border-primary pl-3">
                  <span className="text-xs font-black text-primary dark:text-accent-sunshine uppercase tracking-widest">02. Endereço</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CEP</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white font-mono"
                      placeholder="00.000-000" type="text" required
                      value={formData.cep} onChange={e => setFormData({ ...formData, cep: handleCepMask(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Rua</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="Logradouro" type="text" required
                      value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Número</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="Nº" type="text" required
                      value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bairro</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="Bairro" type="text" required
                      value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cidade</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="Cidade" type="text" required
                      value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Estado (UF)</label>
                    <input
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white uppercase"
                      placeholder="UF" type="text" required
                      value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6 border-l-4 border-primary pl-3">
                  <span className="text-xs font-black text-primary dark:text-accent-sunshine uppercase tracking-widest">03. Documentos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Foto/PDF do RG/CPF</label>
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${attachedFiles.cnh
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                        : 'border-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500'
                        }`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 dark:text-slate-400 px-4 text-center">
                          <span className={`material-symbols-outlined text-3xl mb-1 ${attachedFiles.cnh ? 'text-emerald-500' : ''}`}>
                            {attachedFiles.cnh ? 'check_circle' : 'upload_file'}
                          </span>
                          <p className={`text-xs font-semibold truncate w-full ${attachedFiles.cnh ? 'text-emerald-600' : ''}`}>
                            {attachedFiles.cnh?.name || 'Anexar RG/CPF'}
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setAttachedFiles(prev => ({ ...prev, cnh: file }));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Comprovante de Endereço</label>
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${attachedFiles.address
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                        : 'border-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500'
                        }`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 dark:text-slate-400 px-4 text-center">
                          <span className={`material-symbols-outlined text-3xl mb-1 ${attachedFiles.address ? 'text-emerald-500' : ''}`}>
                            {attachedFiles.address ? 'check_circle' : 'home_pin'}
                          </span>
                          <p className={`text-xs font-semibold truncate w-full ${attachedFiles.address ? 'text-emerald-600' : ''}`}>
                            {attachedFiles.address?.name || 'Anexar Comprovante'}
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setAttachedFiles(prev => ({ ...prev, address: file }));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Selfie com Documento</label>
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${attachedFiles.selfie
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                        : 'border-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500'
                        }`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 dark:text-slate-400 px-4 text-center">
                          <span className={`material-symbols-outlined text-3xl mb-1 ${attachedFiles.selfie ? 'text-emerald-500' : ''}`}>
                            {attachedFiles.selfie ? 'check_circle' : 'add_a_photo'}
                          </span>
                          <p className={`text-xs font-semibold truncate w-full ${attachedFiles.selfie ? 'text-emerald-600' : ''}`}>
                            {attachedFiles.selfie?.name || 'Anexar Selfie'}
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setAttachedFiles(prev => ({ ...prev, selfie: file }));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors w-full sm:w-auto"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                >
                  Cancelar
                </button>
                <button
                  className="px-10 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="animate-spin material-symbols-outlined">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">{editingClient ? 'save' : 'how_to_reg'}</span>
                      <span>{editingClient ? 'Salvar Alterações' : 'Salvar Cliente'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;