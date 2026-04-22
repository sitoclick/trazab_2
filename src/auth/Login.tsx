import React, { useState } from 'react';
import { User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../shared/components/Button';
import { User } from '../shared/types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(false);

    setTimeout(() => {
      const userLower = usernameInput.toLowerCase();
      let newUser: User | null = null;

      if (usernameInput === 'ADMIN' && passwordInput === (import.meta as any).env.VITE_ADMIN_PASSWORD) {
        newUser = { name: 'Administrador', role: 'Gerente de Operativa' };
      } else if (userLower === 'alicia' && passwordInput === (import.meta as any).env.VITE_ALICIA_PASSWORD) {
        newUser = { name: 'Alicia', role: 'Operadora' };
      } else if (userLower === 'rosa' && passwordInput === (import.meta as any).env.VITE_ROSA_PASSWORD) {
        newUser = { name: 'Rosa', role: 'Ventas' };
      } else if (userLower === 'sandra' && passwordInput === (import.meta as any).env.VITE_SANDRA_PASSWORD) {
        newUser = { name: 'Sandra', role: 'Gerente de Operativa' };
      }

      if (newUser) {
        onLoginSuccess(newUser);
      } else {
        setLoginError(true);
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-red-950 to-black p-4">
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-800 to-red-600" />
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="https://doniberico.net/cdn/shop/files/logodi.png?v=1769436193&width=100" alt="Don Ibérico Logo" className="h-24 object-contain" />
          </div>
          <p className="text-slate-500 text-sm uppercase tracking-widest font-medium">Operations Center</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
            <div className="relative">
              <UserIcon className={`absolute left-3 top-3 ${loginError ? 'text-red-400' : 'text-slate-400'}`} size={18} />
              <input type="text" value={usernameInput} onChange={e => { setUsernameInput(e.target.value); setLoginError(false); }}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 transition-colors outline-none text-slate-800 ${loginError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-red-900/20 focus:border-red-900'}`}
                placeholder="ID de Operador" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-3 ${loginError ? 'text-red-400' : 'text-slate-400'}`} size={18} />
              <input type="password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setLoginError(false); }}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 transition-colors outline-none text-slate-800 ${loginError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-red-900/20 focus:border-red-900'}`}
                placeholder="••••••••" required />
            </div>
          </div>
          {loginError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} />
              <span>Credenciales inválidas. Acceso denegado.</span>
            </div>
          )}
          <Button type="submit" className="w-full py-3" isLoading={isLoading}>Entrar al Sistema</Button>
        </form>
        <div className="mt-8 text-center text-xs text-slate-400">&copy; 2024 Don Ibérico Logistics Dept.</div>
      </div>
    </div>
  );
}
