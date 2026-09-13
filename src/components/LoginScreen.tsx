import { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Credenciales incorrectas o acceso denegado.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl shadow-black/20">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Lock className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-center text-slate-900 mb-1">Axia PriceHub Pro</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">Plataforma Confidencial de Compras y Rentabilidad</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100 font-medium text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Autorizado</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña de Bóveda</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all">
            {loading ? 'Verificando...' : 'Acceder a Sistemas'}
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">Protegido por Supabase RLS Encryption</div>
      </div>
    </div>
  );
}
