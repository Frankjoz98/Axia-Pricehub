import { useState } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import type { CitaMedica } from '../../types';

interface CitaFormProps {
  onClose: () => void;
  onSave: (cita: Omit<CitaMedica, 'id' | 'created_at' | 'estado'>) => Promise<any>;
}

export default function CitaForm({ onClose, onSave }: CitaFormProps) {
  const [paciente, setPaciente] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!paciente.trim() || !fecha || !hora) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        paciente: paciente.trim(),
        fecha,
        hora
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Hubo un error al guardar la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Agendar Cita Médica</h2>
            <p className="text-blue-100 text-sm font-medium mt-1">Ingresa los datos del paciente</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Paciente</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={paciente}
                  onChange={e => setPaciente(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Juan Pérez"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Hora</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="time"
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                'Agendar Cita'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
