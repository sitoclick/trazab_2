import React from 'react';
import { ArrowRightLeft, ShoppingCart, Database, Users, Briefcase, Package, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
  setIsPedidosOnlineOpen: (isOpen: boolean) => void;
}

const StatusIndicator = ({ label, status }: { label: string; status: 'operational' | 'degraded' | 'down' }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex items-center gap-2">
      {status === 'operational' && <CheckCircle2 size={16} className="text-emerald-500" />}
      {status === 'degraded' && <AlertCircle size={16} className="text-amber-500" />}
      {status === 'down' && <AlertCircle size={16} className="text-red-500" />}
      <span className={`text-xs font-bold uppercase tracking-wider ${status === 'operational' ? 'text-emerald-600' : status === 'degraded' ? 'text-amber-600' : 'text-red-600'}`}>
        {status === 'operational' ? 'Operativo' : status === 'degraded' ? 'Degradado' : 'Caído'}
      </span>
    </div>
  </div>
);

export default function Dashboard({ user, setActiveTab, setIsPedidosOnlineOpen }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bienvenido al Centro de Operativa</h2>
          <p className="text-slate-500 mb-8">Selecciona una de las áreas de trabajo para continuar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {user?.role !== 'Ventas' && (
              <>
                <button onClick={() => setActiveTab('operations')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><ArrowRightLeft size={32} /></div>
                  <h3 className="text-lg font-bold text-slate-800">Operativa</h3>
                </button>
                <button onClick={() => { setActiveTab('pedidos_online'); setIsPedidosOnlineOpen(true); }} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><ShoppingCart size={32} /></div>
                  <h3 className="text-lg font-bold text-slate-800">Pedidos Online</h3>
                </button>
                <button onClick={() => setActiveTab('traceability')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><Database size={32} /></div>
                  <h3 className="text-lg font-bold text-slate-800">Trazabilidad</h3>
                </button>
                <button onClick={() => setActiveTab('maestros')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><Users size={32} /></div>
                  <h3 className="text-lg font-bold text-slate-800">Maestros</h3>
                </button>
              </>
            )}
            <button onClick={() => setActiveTab('agents')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><Briefcase size={32} /></div>
              <h3 className="text-lg font-bold text-slate-800">Agentes</h3>
            </button>
            {user?.role === 'Ventas' && (
              <button onClick={() => setActiveTab('maestros')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><Users size={32} /></div>
                <h3 className="text-lg font-bold text-slate-800">Maestros</h3>
              </button>
            )}
            <button onClick={() => setActiveTab('tarifas')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><Package size={32} /></div>
              <h3 className="text-lg font-bold text-slate-800">Tarifas</h3>
            </button>
            <button onClick={() => setActiveTab('sales')} className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-900 hover:shadow-md transition-all group">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform text-red-900"><CreditCard size={32} /></div>
              <h3 className="text-lg font-bold text-slate-800">Ventas/Cobros</h3>
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        {user?.role !== 'Ventas' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle size={16} /> Estado del Sistema
            </h3>
            <div className="space-y-3">
              <StatusIndicator label="Base de Datos SQL Trazabilidad" status="operational" />
              <StatusIndicator label="Shopify" status="operational" />
              <StatusIndicator label="Miravia" status="operational" />
              <StatusIndicator label="Impresora de etiquetas" status="operational" />
            </div>
          </div>
        )}
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <h4 className="text-red-900 font-bold text-sm mb-2">¿Problemas Técnicos?</h4>
          <p className="text-xs text-red-800/80 mb-3">Si la sincronización falla más de 3 veces consecutivas, contacta con soporte IT.</p>
          <a href="#" className="text-xs font-bold text-red-900 underline">Contactar Soporte &rarr;</a>
        </div>
      </div>
    </div>
  );
}
