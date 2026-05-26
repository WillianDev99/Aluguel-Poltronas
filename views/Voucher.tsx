import React from 'react';
import { Reservation } from '../types';

interface VoucherProps {
  reservation: Reservation | null;
  onBack: () => void;
}

const Voucher: React.FC<VoucherProps> = ({ reservation, onBack }) => {
  if (!reservation) return null;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 min-h-screen">
      <header className="no-print flex items-center justify-between border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 py-3">
        <div className="flex items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-3xl text-primary">chair</span>
          <h2 className="text-lg font-bold leading-tight tracking-tight dark:text-white">ComfortCare</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8 items-center">
          <button
            onClick={onBack}
            className="text-sm font-bold text-primary dark:text-accent-sunshine flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar para Locações
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center text-center w-full max-w-2xl mx-auto py-10 min-h-[calc(100vh-64px)] p-4 md:p-10">
        <div className="flex items-center gap-3 mb-6 text-primary">
          <span className="material-symbols-outlined text-5xl">chair</span>
          <span className="text-2xl font-black tracking-tight dark:text-white">ComfortCare</span>
        </div>

        <div className="print-area w-full bg-white text-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden text-left">
          <div className="p-8 md:p-12 border-b-4 border-primary bg-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary">chair</span>
                <div>
                  <h1 className="text-xl font-black tracking-tighter text-primary uppercase">ComfortCare</h1>
                  <p className="text-xs text-slate-500 font-medium">SISTEMA ADMINISTRATIVO DE ACERVO</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Documento Oficial</p>
                <h2 className="text-lg font-bold leading-tight text-primary">VOUCHER DE LOCAÇÃO DE POLTRONA</h2>
                <p className="text-sm font-mono text-slate-500">REF: #VR-CC-{reservation.id.toString().substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Informações do Locatário</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Nome Completo</p>
                  <p className="text-sm font-semibold">{reservation.clientName}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Documento (CPF)</p>
                  <p className="text-sm font-semibold">---</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">E-mail de Contato</p>
                  <p className="text-sm font-semibold">cliente@email.com</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Telefone / WhatsApp</p>
                  <p className="text-sm font-semibold">(00) 99999-9999</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-xl">chair</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Detalhes da Poltrona Reservada</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Modelo</p>
                  <p className="text-sm font-semibold">{reservation.vehicleModel}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Nº de Série</p>
                  <p className="text-sm font-semibold">{reservation.vehiclePlate}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Acionamento</p>
                  <p className="text-sm font-semibold">Elétrico / Manual</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Período de Locação</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col p-4 border border-slate-200 rounded-lg text-left">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Data e Hora de Entrega</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">local_shipping</span>
                    <p className="text-lg font-bold text-primary">
                      {new Date(reservation.pickup_date).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col p-4 border border-slate-200 rounded-lg text-left">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Data e Hora de Coleta</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">assignment_return</span>
                    <p className="text-lg font-bold text-primary">
                      {new Date(reservation.return_date).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-12 text-center">
              <div className="text-center">
                <div className="border-t border-slate-400 mt-8 mb-2"></div>
                <p className="text-[10px] font-bold uppercase text-slate-500">ComfortCare Ltda.</p>
                <p className="text-[9px] text-slate-400">Representante Autorizado</p>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 mt-8 mb-2"></div>
                <p className="text-[10px] font-bold uppercase text-slate-500">{reservation.clientName}</p>
                <p className="text-[9px] text-slate-400">Locatário / Responsável</p>
              </div>
            </section>
          </div>

          <div className="px-12 py-6 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100 italic text-center leading-relaxed">
            Este voucher é um documento administrativo e deve ser apresentado juntamente com o documento de identificação original com foto do locatário no momento do recebimento. A ComfortCare reserva-se o direito de reagendar a entrega caso os requisitos cadastrais ou de segurança não sejam preenchidos.
          </div>

          <div className="no-print p-6 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-left">
            <button onClick={onBack} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-primary flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-lg">close</span>
              Fechar
            </button>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-lg">print</span>
                Imprimir Voucher
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } .print-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; } body { background: white !important; display: flex !important; flex-direction: column !important; align-items: center !important; } }`}</style>
    </div>
  );
};

export default Voucher;