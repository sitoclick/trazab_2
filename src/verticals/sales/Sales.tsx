import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, FileText, Download, Mail, CheckCircle, 
  Clock, AlertCircle, ChevronDown, ChevronUp, 
  ExternalLink, FileEdit, RefreshCw, Filter,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '../shared/components/Button';

interface SalesProps {
  user: any;
  setConfirmDialog: (dialog: {isOpen: boolean, message: string, onConfirm: () => void}) => void;
}

export default function Sales({ user, setConfirmDialog }: SalesProps) {
  const [salesSubTab, setSalesSubTab] = useState<'pending' | 'overdue' | 'paid' | 'all'>('pending');
  const [holdedPaidInvoices, setHoldedPaidInvoices] = useState<any[]>([]);
  const [holdedUnpaidInvoices, setHoldedUnpaidInvoices] = useState<any[]>([]);
  const [holdedContacts, setHoldedContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [unpaidInvoicesFilters, setUnpaidInvoicesFilters] = useState({
    contactName: '',
    agentName: '',
    docNumber: ''
  });
  const [salesSort, setSalesSort] = useState<{field: string, direction: 'asc' | 'desc'}>({field: 'dueDate', direction: 'asc'});
  
  // Initialize dates
  const [salesDateRange, setSalesDateRange] = useState(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    return {
      start: startOfYear.toISOString().split('T')[0],
      end: endOfYear.toISOString().split('T')[0]
    };
  });

  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([]);
  const [invoiceDetails, setInvoiceDetails] = useState<Record<string, any>>({});
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState<Record<string, boolean>>({});
  const [isLoadingAction, setIsLoadingAction] = useState<Record<string, boolean>>({});

  const handleLoadHoldedContacts = async () => {
    try {
      const response = await fetch('/api/holded/contacts');
      if (response.ok) {
        const data = await response.json();
        setHoldedContacts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Load Holded Contacts Error:", error);
    }
  };

  const handleLoadHoldedInvoices = async (type: 'pending' | 'overdue' | 'paid' | 'all') => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = type === 'paid' ? '/api/holded/invoices?paid=1' : '/api/holded/invoices';
      let url = baseUrl;
      if (salesDateRange.start && salesDateRange.end) {
        const startTmp = Math.floor(new Date(salesDateRange.start).getTime() / 1000);
        const endTmp = Math.floor(new Date(salesDateRange.end + 'T23:59:59').getTime() / 1000);
        url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}starttmp=${startTmp}&endtmp=${endTmp}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error al cargar facturas ${type === 'paid' ? 'pagadas' : 'impagadas'}`);
      const data = await response.json();
      if (type === 'paid') {
        setHoldedPaidInvoices(Array.isArray(data) ? data : []);
      } else {
        setHoldedUnpaidInvoices(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error(`Load Holded ${type} Invoices Error:`, err);
      setError(err.message || `Error al cargar facturas ${type === 'paid' ? 'pagadas' : 'impagadas'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleLoadHoldedContacts();
  }, []);

  useEffect(() => {
    handleLoadHoldedInvoices(salesSubTab);
  }, [salesSubTab]);

  const filteredInvoices = useMemo(() => {
    const invoices = salesSubTab === 'paid' ? holdedPaidInvoices : 
                     salesSubTab === 'all' ? [...holdedPaidInvoices, ...holdedUnpaidInvoices] : 
                     holdedUnpaidInvoices;

    let filtered = invoices.filter(inv => {
      const contact = holdedContacts.find(c => c.id === inv.contactId || c.id === inv.contact);
      const contactName = contact?.name || inv.contactName || '';
      const agentName = inv.salesChannel || inv.customFields?.find((f: any) => f.field === 'Agente')?.value || '';
      
      const matchContact = contactName.toLowerCase().includes(unpaidInvoicesFilters.contactName.toLowerCase());
      const matchAgent = agentName.toLowerCase().includes(unpaidInvoicesFilters.agentName.toLowerCase());
      const matchDoc = (inv.docNumber || '').toLowerCase().includes(unpaidInvoicesFilters.docNumber.toLowerCase());
      
      let matchStatus = true;
      if (salesSubTab === 'overdue') {
        matchStatus = inv.status === 2 || (inv.dueDate && inv.dueDate < Math.floor(Date.now() / 1000) && inv.status !== 1);
      } else if (salesSubTab === 'pending') {
        matchStatus = inv.status === 0 || inv.status === 2;
      }

      return matchContact && matchAgent && matchDoc && matchStatus;
    });

    filtered.sort((a, b) => {
      let valA = a[salesSort.field];
      let valB = b[salesSort.field];
      
      if (salesSort.field === 'contactName') {
        const contactA = holdedContacts.find(c => c.id === a.contactId || c.id === a.contact);
        const contactB = holdedContacts.find(c => c.id === b.contactId || c.id === b.contact);
        valA = contactA?.name || a.contactName || '';
        valB = contactB?.name || b.contactName || '';
      }

      if (valA < valB) return salesSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return salesSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [holdedUnpaidInvoices, holdedPaidInvoices, salesSubTab, unpaidInvoicesFilters, holdedContacts, salesSort]);

  const handleSort = (field: string) => {
    setSalesSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleLoadInvoiceDetails = async (invoiceId: string) => {
    if (expandedInvoices.includes(invoiceId)) {
      setExpandedInvoices(prev => prev.filter(id => id !== invoiceId));
      return;
    }

    setExpandedInvoices(prev => [...prev, invoiceId]);
    
    if (!invoiceDetails[invoiceId]) {
      setIsLoadingInvoiceDetails(prev => ({ ...prev, [invoiceId]: true }));
      try {
        const response = await fetch(`/api/holded/invoices/${invoiceId}`);
        if (response.ok) {
          const data = await response.json();
          setInvoiceDetails(prev => ({ ...prev, [invoiceId]: data }));
        }
      } catch (error) {
        console.error("Error loading invoice details:", error);
      } finally {
        setIsLoadingInvoiceDetails(prev => ({ ...prev, [invoiceId]: false }));
      }
    }
  };

  const handleHoldedAction = async (action: string, invoiceId: string) => {
    setIsLoadingAction(prev => ({ ...prev, [invoiceId]: true }));
    try {
      // Simulate action
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Action ${action} completed for invoice ${invoiceId}`);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setIsLoadingAction(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleDownloadHoldedPdf = async (invoiceId: string, docNumber: string) => {
    setIsLoadingAction(prev => ({ ...prev, [`pdf_${invoiceId}`]: true }));
    try {
      const response = await fetch(`/api/holded/invoices/${invoiceId}/pdf`);
      if (!response.ok) throw new Error('Error al generar PDF');
      
      const data = await response.json();
      if (data.data) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.data}`;
        link.download = `Factura_${docNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error al descargar el PDF");
    } finally {
      setIsLoadingAction(prev => ({ ...prev, [`pdf_${invoiceId}`]: false }));
    }
  };

  const handleSendHoldedEmail = async (invoiceId: string, emails: string) => {
    if (!emails) {
      alert("El cliente no tiene un email configurado en Holded.");
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que deseas enviar la factura por email a ${emails}?`,
      onConfirm: async () => {
        setIsLoadingAction(prev => ({ ...prev, [`email_${invoiceId}`]: true }));
        try {
          const response = await fetch(`/api/holded/invoices/${invoiceId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails })
          });
          
          if (!response.ok) throw new Error('Error al enviar email');
          alert("Email enviado correctamente");
        } catch (error) {
          console.error("Error sending email:", error);
          alert("Error al enviar el email");
        } finally {
          setIsLoadingAction(prev => ({ ...prev, [`email_${invoiceId}`]: false }));
        }
      }
    });
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setConfirmDialog({
      isOpen: true,
      message: '¿Confirmas que esta factura ha sido cobrada? Esto actualizará el estado en Holded.',
      onConfirm: async () => {
        setIsLoadingAction(prev => ({ ...prev, [`pay_${invoiceId}`]: true }));
        try {
          const response = await fetch(`/api/holded/invoices/${invoiceId}/pay`, {
            method: 'POST'
          });
          
          if (!response.ok) throw new Error('Error al registrar cobro');
          
          // Refresh list
          handleLoadHoldedInvoices(salesSubTab);
        } catch (error) {
          console.error("Error marking as paid:", error);
          alert("Error al registrar el cobro");
        } finally {
          setIsLoadingAction(prev => ({ ...prev, [`pay_${invoiceId}`]: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ventas / Cobros</h2>
          <p className="text-slate-500">Facturas del año actual {salesSubTab === 'pending' ? 'pendientes de cobro' : salesSubTab === 'overdue' ? 'impagadas' : salesSubTab === 'paid' ? 'pagadas' : 'todas'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Desde:</span>
              <input 
                type="date" 
                value={salesDateRange.start}
                onChange={(e) => setSalesDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              />
            </div>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</span>
              <input 
                type="date" 
                value={salesDateRange.end}
                onChange={(e) => setSalesDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleLoadHoldedInvoices(salesSubTab)}
            disabled={isLoading}
            className="bg-white"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setSalesSubTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            salesSubTab === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setSalesSubTab('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            salesSubTab === 'overdue' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Vencidas
        </button>
        <button
          onClick={() => setSalesSubTab('paid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            salesSubTab === 'paid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cobradas
        </button>
        <button
          onClick={() => setSalesSubTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            salesSubTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Todas
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Error de conexión</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={unpaidInvoicesFilters.contactName}
              onChange={(e) => setUnpaidInvoicesFilters(prev => ({ ...prev, contactName: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por agente..."
              value={unpaidInvoicesFilters.agentName}
              onChange={(e) => setUnpaidInvoicesFilters(prev => ({ ...prev, agentName: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nº factura..."
              value={unpaidInvoicesFilters.docNumber}
              onChange={(e) => setUnpaidInvoicesFilters(prev => ({ ...prev, docNumber: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('docNumber')}>
                  <div className="flex items-center gap-1">
                    Nº Factura
                    {salesSort.field === 'docNumber' && (salesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Fecha
                    {salesSort.field === 'date' && (salesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('contactName')}>
                  <div className="flex items-center gap-1">
                    Cliente
                    {salesSort.field === 'contactName' && (salesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agente</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('total')}>
                  <div className="flex items-center gap-1">
                    Total
                    {salesSort.field === 'total' && (salesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('dueDate')}>
                  <div className="flex items-center gap-1">
                    Vencimiento
                    {salesSort.field === 'dueDate' && (salesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p>Cargando facturas desde Holded...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron facturas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isOverdue = inv.status === 2 || (inv.dueDate && inv.dueDate < Math.floor(Date.now() / 1000) && inv.status !== 1);
                  const isPaid = inv.status === 1;
                  const isExpanded = expandedInvoices.includes(inv.id);
                  const contact = holdedContacts.find(c => c.id === inv.contactId || c.id === inv.contact);
                  
                  return (
                    <React.Fragment key={inv.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4 font-medium text-slate-900">{inv.docNumber}</td>
                        <td className="p-4 text-slate-600">
                          {inv.date ? new Date(inv.date * 1000).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{contact?.name || inv.contactName}</div>
                          <div className="text-xs text-slate-500">{contact?.email || inv.contactEmail}</div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {inv.salesChannel || inv.customFields?.find((f: any) => f.field === 'Agente')?.value || '-'}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {inv.total?.toLocaleString('es-ES', { style: 'currency', currency: inv.currency || 'EUR' })}
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isPaid ? 'bg-emerald-100 text-emerald-700' :
                            isOverdue ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <Clock size={12} />
                            {inv.dueDate ? new Date(inv.dueDate * 1000).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isPaid ? 'bg-emerald-100 text-emerald-700' :
                            isOverdue ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {isPaid ? 'Cobrada' : isOverdue ? 'Vencida' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user?.role === 'Admin' && !isPaid && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleMarkAsPaid(inv.id)}
                                disabled={isLoadingAction[`pay_${inv.id}`]}
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                title="Marcar como cobrada"
                              >
                                {isLoadingAction[`pay_${inv.id}`] ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleLoadInvoiceDetails(inv.id)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 border-b border-slate-200">
                            <div className="bg-slate-50 p-6 border-t border-slate-100 shadow-inner">
                              {isLoadingInvoiceDetails[inv.id] ? (
                                <div className="flex items-center justify-center py-8 text-slate-500">
                                  <RefreshCw size={24} className="animate-spin mr-3 text-blue-500" />
                                  Cargando detalles de la factura...
                                </div>
                              ) : invoiceDetails[inv.id] ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  <div className="lg:col-span-2 space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Líneas de Factura</h4>
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                          <tr>
                                            <th className="p-3 text-left font-semibold text-slate-600">Concepto</th>
                                            <th className="p-3 text-right font-semibold text-slate-600">Uds</th>
                                            <th className="p-3 text-right font-semibold text-slate-600">Precio</th>
                                            <th className="p-3 text-right font-semibold text-slate-600">Dto</th>
                                            <th className="p-3 text-right font-semibold text-slate-600">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {invoiceDetails[inv.id].products?.map((prod: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                              <td className="p-3">
                                                <div className="font-medium text-slate-800">{prod.name}</div>
                                                {prod.desc && <div className="text-xs text-slate-500 mt-0.5">{prod.desc}</div>}
                                              </td>
                                              <td className="p-3 text-right text-slate-600">{prod.units}</td>
                                              <td className="p-3 text-right text-slate-600">{prod.price?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                              <td className="p-3 text-right text-slate-600">{prod.discount}%</td>
                                              <td className="p-3 text-right font-medium text-slate-800">{prod.total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                                          <tr>
                                            <td colSpan={4} className="p-3 text-right text-slate-600">Subtotal:</td>
                                            <td className="p-3 text-right text-slate-800">{invoiceDetails[inv.id].subtotal?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                          </tr>
                                          <tr>
                                            <td colSpan={4} className="p-3 text-right text-slate-600">Impuestos:</td>
                                            <td className="p-3 text-right text-slate-800">{invoiceDetails[inv.id].taxes?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                          </tr>
                                          <tr className="text-lg">
                                            <td colSpan={4} className="p-3 text-right text-slate-800">Total:</td>
                                            <td className="p-3 text-right text-blue-700">{invoiceDetails[inv.id].total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Acciones Rápidas</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                      <Button 
                                        variant="outline" 
                                        className="justify-start bg-white"
                                        onClick={() => handleDownloadHoldedPdf(inv.id, inv.docNumber)}
                                        disabled={isLoadingAction[`pdf_${inv.id}`]}
                                      >
                                        {isLoadingAction[`pdf_${inv.id}`] ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2 text-slate-500" />}
                                        Descargar PDF
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        className="justify-start bg-white"
                                        onClick={() => handleSendHoldedEmail(inv.id, contact?.email || inv.contactEmail)}
                                        disabled={isLoadingAction[`email_${inv.id}`]}
                                      >
                                        {isLoadingAction[`email_${inv.id}`] ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Mail size={16} className="mr-2 text-slate-500" />}
                                        Enviar por Email
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        className="justify-start bg-white"
                                        onClick={() => window.open(`https://app.holded.com/invoicing/sales/invoices/${inv.id}`, '_blank')}
                                      >
                                        <ExternalLink size={16} className="mr-2 text-slate-500" />
                                        Abrir en Holded
                                      </Button>
                                    </div>
                                    
                                    {invoiceDetails[inv.id].notes && (
                                      <div className="mt-4">
                                        <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">Notas</h4>
                                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm text-amber-800 whitespace-pre-wrap">
                                          {invoiceDetails[inv.id].notes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-500 py-4">No se pudieron cargar los detalles.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
