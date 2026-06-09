import React, { useState } from 'react';

interface CalendarProps {
    occupiedRanges: { start: Date; end: Date }[];
    onSelectRange: (start: Date, end: Date) => void;
    onClose: () => void;
    initialPickup?: string;
    initialReturn?: string;
    planDays?: number;
}

const Calendar: React.FC<CalendarProps> = ({
    occupiedRanges,
    onSelectRange,
    onClose,
    initialPickup,
    initialReturn,
    planDays
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selection, setSelection] = useState<{ start: Date | null; end: Date | null }>({
        start: initialPickup ? new Date(initialPickup) : null,
        end: initialReturn ? new Date(initialReturn) : null
    });

    const [startTime, setStartTime] = useState(initialPickup ? new Date(initialPickup).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '09:00');
    const [endTime, setEndTime] = useState(initialReturn ? new Date(initialReturn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '09:00');

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const isPast = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isOccupied = (date: Date) => {
        return occupiedRanges.some(range => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const start = new Date(range.start);
            start.setHours(0, 0, 0, 0);
            const end = new Date(range.end);
            end.setHours(23, 59, 59, 999);
            return d >= start && d <= end;
        });
    };

    const isSelected = (date: Date) => {
        if (!selection.start) return false;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const start = new Date(selection.start);
        start.setHours(0, 0, 0, 0);

        if (!selection.end) {
            return d.getTime() === start.getTime();
        }
        const end = new Date(selection.end);
        end.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
    };

    const handleConfirm = (start: Date, end: Date) => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const finalStart = new Date(start);
        finalStart.setHours(startH, startM, 0, 0);

        const finalEnd = new Date(end);
        finalEnd.setHours(endH, endM, 0, 0);

        onSelectRange(finalStart, finalEnd);
    };

    const handleDateClick = (date: Date) => {
        if (isOccupied(date) || isPast(date)) return;

        if (planDays) {
            const endDate = new Date(date.getTime() + planDays * 24 * 60 * 60 * 1000);
            const hasConflict = occupiedRanges.some(range => {
                const start = new Date(range.start);
                return start >= date && start <= endDate;
            });

            if (hasConflict) {
                alert("Conflito de datas: Algumas datas neste plano de " + planDays + " dias já possuem reservas.");
                return;
            }
            setSelection({ start: date, end: endDate });
            return;
        }

        if (!selection.start || (selection.start && selection.end)) {
            setSelection({ start: date, end: null });
        } else {
            if (date < selection.start) {
                setSelection({ start: date, end: null });
            } else {
                // Verificar se há bloqueios no intervalo
                const hasConflict = occupiedRanges.some(range => {
                    const start = new Date(range.start);
                    // const end = new Date(range.end);
                    return start >= selection.start! && start <= date;
                });

                if (hasConflict) {
                    setSelection({ start: date, end: null });
                } else {
                    setSelection({ ...selection, end: date });
                }
            }
        }
    };

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-[340px] sm:w-[340px] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((date, i) => {
                    if (!date) return <div key={i} />;

                    const occupied = isOccupied(date);
                    const past = isPast(date);
                    const disabled = occupied || past;
                    const selected = isSelected(date);
                    const isStart = selection.start && date.getTime() === selection.start.getTime();
                    const isEnd = selection.end && date.getTime() === selection.end.getTime();

                    return (
                        <button
                            key={i}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleDateClick(date); }}
                            disabled={disabled}
                            className={`
                h-10 w-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center relative
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
                ${selected ? 'bg-primary text-white hover:bg-primary/90 rounded-none' : ''}
                ${isStart ? 'rounded-l-xl' : ''}
                ${isEnd ? 'rounded-r-xl outline outline-2 outline-white dark:outline-slate-900 z-10' : ''}
                ${isStart && !selection.end ? 'rounded-xl' : ''}
              `}
                        >
                            {date.getDate()}
                            {occupied && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-rose-400" />}
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Hora Retirada</label>
                        <input
                            type="time"
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold p-2 dark:text-white"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Hora Devolução</label>
                        <input
                            type="time"
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold p-2 dark:text-white"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>Indisponível</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Sua Seleção</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!selection.start || !selection.end}
                            onClick={() => selection.start && selection.end && handleConfirm(selection.start, selection.end)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
