import React, { useState, useEffect } from 'react';
import { LogOut, AlertCircle, X, Loader2 } from 'lucide-react';
import { User } from './shared/types';
import { Button } from './shared/components/Button';
import Login from './auth/Login';
import Dashboard from './shared/components/Dashboard';
import Operations from './verticals/operations/Operations';
import Traceability from './verticals/traceability/Traceability';
import Agentes from './verticals/agents/Agentes';
import Maestros from './verticals/masters/Maestros';
import Tarifas from './verticals/pricing/Tarifas';
import Sales from './verticals/sales/Sales';
import PedidosOnline from './verticals/online-orders/PedidosOnline';

type Tab = 'dashboard' | 'operations' | 'traceability' | 'maestros' | 'tarifas' | 'agents' | 'sales' | 'pedidos_online';

export interface ConfirmDialogState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Holded products — managed here so Tarifas can reuse across renders
  const [holdedProducts, setHoldedProducts] = useState<any[]>([]);
  const [isHoldedLoading, setIsHoldedLoading] = useState(false);

  // PedidosOnline panel state
  const [isPedidosOnlineOpen, setIsPedidosOnlineOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('don_iberico_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('don_iberico_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('don_iberico_user');
    setActiveTab('dashboard');
  };

  const handleLoadHoldedProducts = async () => {
    setIsHoldedLoading(true);
    try {
      const response = await fetch('/api/holded/products');
      if (!response.ok) throw new Error('Error al cargar productos de Holded');
      const data = await response.json();
      setHoldedProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading Holded products:', error);
    } finally {
      setIsHoldedLoading(false);
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const navTabs: { id: Tab; label: string; restricted?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'operations', label: 'Operativa', restricted: true },
    { id: 'traceability', label: 'Trazabilidad', restricted: true },
    { id: 'maestros', label: 'Maestros' },
    { id: 'agents', label: 'Agentes' },
    { id: 'tarifas', label: 'Tarifas' },
    { id: 'sales', label: 'Ventas/Cobros' },
    { id: 'pedidos_online', label: 'Pedidos Online', restricted: true },
  ];

  const visibleTabs = navTabs.filter(t => !t.restricted || user.role !== 'Ventas');

  return (
    <div className="min-h-screen bg-slate-50/50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <img
                src="https://doniberico.net/cdn/shop/files/logodi.png?v=1769436193&width=100"
                alt="Don Ibérico Logo"
                className="h-10 object-contain"
              />
              <div className="hidden sm:block w-px h-8 bg-slate-200" />
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none font-medium block">Torre de Control</span>
                <span className="text-xs font-bold text-slate-800">Operations Center</span>
              </div>
              <div className="ml-4 flex flex-wrap gap-1">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-slate-900">{user.name}</span>
                <span className="text-xs text-slate-500">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            setActiveTab={(tab) => setActiveTab(tab as Tab)}
            setIsPedidosOnlineOpen={setIsPedidosOnlineOpen}
          />
        )}
        {activeTab === 'operations' && user.role !== 'Ventas' && (
          <Operations user={user} setConfirmDialog={setConfirmDialog} />
        )}
        {activeTab === 'traceability' && user.role !== 'Ventas' && (
          <Traceability user={user} setConfirmDialog={setConfirmDialog} />
        )}
        {activeTab === 'agents' && (
          <Agentes user={user} setConfirmDialog={setConfirmDialog} />
        )}
        {activeTab === 'maestros' && (
          <Maestros user={user} />
        )}
        {activeTab === 'tarifas' && (
          <Tarifas
            user={user}
            holdedProducts={holdedProducts}
            handleLoadHoldedProducts={handleLoadHoldedProducts}
          />
        )}
        {activeTab === 'sales' && (
          <Sales user={user} setConfirmDialog={setConfirmDialog} />
        )}
        {activeTab === 'pedidos_online' && user.role !== 'Ventas' && (
          <PedidosOnline
            isOpen={isPedidosOnlineOpen}
            onToggle={() => setIsPedidosOnlineOpen(p => !p)}
            activeTab={activeTab}
          />
        )}

        {/* Confirm Dialog */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg text-red-700">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Confirmación</h3>
                </div>
                <button
                  onClick={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-700">{confirmDialog.message}</p>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(d => ({ ...d, isOpen: false }));
                }}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
