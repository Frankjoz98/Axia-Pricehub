import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: string[]; // YYYY-MM-DD
}

export default function MiniCalendar({ selectedDate, onSelectDate, eventDates }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const todayYMD = formatYMD(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Lunes, 6 = Domingo
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Cabecera del mes y navegación */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;

          const dateStr = formatYMD(day);
          const isSelected = formatYMD(selectedDate) === dateStr;
          const isToday = todayYMD === dateStr;
          const hasEvents = eventDates.includes(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all font-bold text-sm",
                isSelected
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-slate-700 hover:bg-slate-100 hover:text-violet-600",
                isToday && !isSelected && "text-violet-600"
              )}
            >
              <span>{day.getDate()}</span>
              
              <div className="absolute bottom-1.5 flex gap-0.5 justify-center w-full">
                {hasEvents && (
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-white" : "bg-violet-500"
                  )} />
                )}
                {isToday && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
