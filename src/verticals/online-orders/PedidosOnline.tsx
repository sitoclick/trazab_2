import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, ChevronUp, ChevronDown, Loader2, RefreshCw, Play, FileText, Printer, AlertCircle, Download, User as UserIcon, Truck, Package, Rss, RotateCcw
} from 'lucide-react';
import { Button } from '../../shared/components/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { MiraviaOrder } from '../../shared/types';

interface PedidosOnlineProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
}

export default function PedidosOnline({ isOpen, onToggle, activeTab }: PedidosOnlineProps) {
  const [pedidosOnlineSubTab, setPedidosOnlineSubTab] = useState<'todos' | 'web' | 'miravia' | 'sendcloud'>('todos');

  // Shopify State
  const [shopifyOrders, setShopifyOrders] = useState<any[]>([]);
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [shopifySubTab, setShopifySubTab] = useState<'no_preparado' | 'en_espera' | 'pago_pendiente'>('no_preparado');
  const [shopifyExclusions, setShopifyExclusions] = useState<Set<string>>(new Set());
  const [isReleasingHold, setIsReleasingHold] = useState(false);

  // Miravia State
  const [miraviaOrders, setMiraviaOrders] = useState<MiraviaOrder[]>([]);
  const [isMiraviaLoading, setIsMiraviaLoading] = useState(false);
  const [selectedMiraviaYear, setSelectedMiraviaYear] = useState<string>(new Date().getFullYear().toString());
  const [miraviaError, setMiraviaError] = useState<string | null>(null);
  const [showMiraviaAuth, setShowMiraviaAuth] = useState(false);
  const [miraviaAuthCode, setMiraviaAuthCode] = useState('');
  const [isMiraviaAuthLoading, setIsMiraviaAuthLoading] = useState(false);
  const [miraviaStartDate, setMiraviaStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });

  // Sendcloud State
  const [sendcloudParcels, setSendcloudParcels] = useState<any[]>([]);
  const [isSendcloudLoading, setIsSendcloudLoading] = useState(false);
  const [sendcloudError, setSendcloudError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'operations' && isOpen) {
      if (pedidosOnlineSubTab === 'web' && shopifyOrders.length === 0) {
        fetchShopifyOrders();
      } else if (pedidosOnlineSubTab === 'miravia' && miraviaOrders.length === 0) {
        fetchMiraviaOrders();
      } else if (pedidosOnlineSubTab === 'sendcloud' && sendcloudParcels.length === 0) {
        fetchSendcloudParcels();
      }
    }
  }, [activeTab, isOpen, pedidosOnlineSubTab]);

  const fetchShopifyOrders = async () => {
    setIsShopifyLoading(true);
    setShopifyError(null);
    try {
      const response = await fetch('/api/shopify/orders');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar pedidos de Shopify');
      }
      
      setShopifyOrders(data);
    } catch (err: any) {
      console.error('Error fetching Shopify orders:', err);
      setShopifyError(err.message);
    } finally {
      setIsShopifyLoading(false);
    }
  };

  const releaseShopifyHold = async (storeIndex: string, orderId: string) => {
    try {
      const response = await fetch(`/api/shopify/orders/${storeIndex}/${orderId}/release_hold`, {
        method: 'POST'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al liberar el pedido');
      }
      return true;
    } catch (err) {
      console.error('Error releasing hold:', err);
      return false;
    }
  };

  const handleReleaseTodaysHolds = async () => {
    setIsReleasingHold(true);
    const today = new Date().toISOString().split('T')[0];
    let count = 0;

    const ordersToRelease = shopifyOrders.filter(order => {
      const deliveryDate = order.note_attributes?.find((a: any) => a.name === 'Preferred Delivery Date')?.value;
      return order.fulfillment_status === 'on_hold' && deliveryDate === today;
    });

    for (const order of ordersToRelease) {
      const success = await releaseShopifyHold(order.store_index, order.id);
      if (success) count++;
    }

    if (count > 0) {
      await fetchShopifyOrders();
      alert(`${count} pedidos han sido liberados y pasados a "No preparado".`);
    } else {
      alert('No se encontraron pedidos retenidos con fecha de envío para hoy.');
    }
    setIsReleasingHold(false);
  };

  const generateShopifyPickingList = () => {
    const doc = new jsPDF();
    const filtered = shopifyOrders.filter(order => {
      const deliveryDate = order.note_attributes?.find((a: any) => a.name === 'Preferred Delivery Date')?.value;
      const isCOD = order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery');
      const isPendingPayment = order.financial_status !== 'paid' && !isCOD;
      const isEnEspera = !!deliveryDate || order.fulfillment_status === 'on_hold';
      
      if (shopifySubTab === 'pago_pendiente') return isPendingPayment;
      if (shopifySubTab === 'en_espera') return !isPendingPayment && isEnEspera;
      return !isPendingPayment && !isEnEspera && (order.fulfillment_status === null || order.fulfillment_status === 'unfulfilled');
    }).filter(o => !shopifyExclusions.has(o.id));

    if (filtered.length === 0) {
      alert('No hay pedidos seleccionados para el informe.');
      return;
    }

    doc.setFontSize(18);
    doc.text('LISTADO DE PICKING - SHOPIFY', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = filtered.map(order => [
      order.name,
      order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '-',
      order.line_items.map((item: any) => `${item.quantity}x ${item.title}`).join('\n'),
      order.shipping_lines?.[0]?.title || '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Pedido', 'Cliente', 'Artículos', 'Envío']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [200, 0, 0] },
      styles: { fontSize: 8 }
    });

    doc.save(`picking_shopify_${new Date().getTime()}.pdf`);
  };

  const generateShopifyPackingLabels = async () => {
    const filtered = shopifyOrders.filter(order => {
      const deliveryDate = order.note_attributes?.find((a: any) => a.name === 'Preferred Delivery Date')?.value;
      const isCOD = order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery');
      const isPendingPayment = order.financial_status !== 'paid' && !isCOD;
      const isEnEspera = !!deliveryDate || order.fulfillment_status === 'on_hold';
      
      if (shopifySubTab === 'pago_pendiente') return isPendingPayment;
      if (shopifySubTab === 'en_espera') return !isPendingPayment && isEnEspera;
      return !isPendingPayment && !isEnEspera && (order.fulfillment_status === null || order.fulfillment_status === 'unfulfilled');
    }).filter(o => !shopifyExclusions.has(o.id));

    if (filtered.length === 0) {
      alert('No hay pedidos seleccionados para las etiquetas.');
      return;
    }

    setIsShopifyLoading(true);
    const doc = new jsPDF();
    let yPos = 20;

    for (const order of filtered) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pedido: ${order.name}`, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Cliente: ${order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '-'}`, 14, yPos + 6);
      doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`, 14, yPos + 12);

      try {
        const scResponse = await fetch(`/api/sendcloud/parcel_by_order/${order.name}`);
        if (scResponse.ok) {
          const parcel = await scResponse.json();
          if (parcel.tracking_number) {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, parcel.tracking_number, { format: 'CODE128', width: 2, height: 40 });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 14, yPos + 15, 60, 20);
            doc.setFontSize(8);
            doc.text(parcel.tracking_number, 14, yPos + 38);
          }
        }
      } catch (e) {
        console.warn(`No se encontró tracking en Sendcloud para ${order.name}`);
      }

      let itemY = yPos + 45;
      doc.setFontSize(9);
      doc.text('Artículos:', 14, itemY);
      order.line_items.forEach((item: any, idx: number) => {
        doc.text(`${item.quantity}x ${item.title}`, 20, itemY + 5 + (idx * 5));
      });

      yPos += 70 + (order.line_items.length * 5);
      doc.line(14, yPos - 5, 196, yPos - 5);
      yPos += 10;
    }

    doc.save(`packing_labels_shopify_${new Date().getTime()}.pdf`);
    setIsShopifyLoading(false);
  };

  const fetchSendcloudParcels = async () => {
    setIsSendcloudLoading(true);
    setSendcloudError(null);
    try {
      const response = await fetch('/api/sendcloud/parcels');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar paquetes de Sendcloud');
      }
      
      setSendcloudParcels(data);
    } catch (err: any) {
      console.error('Error fetching Sendcloud parcels:', err);
      setSendcloudError(err.message);
    } finally {
      setIsSendcloudLoading(false);
    }
  };

  const fetchMiraviaOrders = async () => {
    setIsMiraviaLoading(true);
    setMiraviaError(null);
    setShowMiraviaAuth(false);
    try {
      const [pendingRes, readyRes, shippedRes] = await Promise.all([
        fetch(`/api/miravia/orders?status=pending&created_after=${miraviaStartDate}`),
        fetch(`/api/miravia/orders?status=ready_to_ship&created_after=${miraviaStartDate}`),
        fetch(`/api/miravia/orders?status=shipped&created_after=${miraviaStartDate}`)
      ]);
      
      const pendingData = await pendingRes.json();
      const readyData = await readyRes.json();
      const shippedData = await shippedRes.json();
      
      if (pendingData.error === 'auth_required' || readyData.error === 'auth_required' || shippedData.error === 'auth_required') {
        setShowMiraviaAuth(true);
        throw new Error('Se requiere autenticación de Miravia');
      }

      if (!pendingRes.ok || !readyRes.ok || !shippedRes.ok) {
        throw new Error('Error al cargar pedidos de Miravia');
      }
      
      const allOrders = [
        ...(pendingData.data?.orders || []),
        ...(readyData.data?.orders || []),
        ...(shippedData.data?.orders || [])
      ];
      
      const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.order_id, o])).values());
      
      uniqueOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setMiraviaOrders(uniqueOrders);
    } catch (err: any) {
      console.error('Error fetching Miravia orders:', err);
      setMiraviaError(err.message);
    } finally {
      setIsMiraviaLoading(false);
    }
  };

  const handleMiraviaAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMiraviaAuthLoading(true);
    try {
      const tokenData = JSON.parse(miraviaAuthCode);
      
      if (!tokenData.access_token) {
        throw new Error('El JSON no contiene access_token');
      }

      const response = await fetch('/api/miravia/auth/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el token');
      }

      setShowMiraviaAuth(false);
      setMiraviaAuthCode('');
      fetchMiraviaOrders();
    } catch (err: any) {
      setMiraviaError(err.message || 'Error al importar token de Miravia');
    } finally {
      setIsMiraviaAuthLoading(false);
    }
  };

  const printMiraviaLabels = async () => {
    const toPackOrders = miraviaOrders.filter(o => {
      const status = (o.status || (o.statuses && o.statuses[0]) || '').toLowerCase();
      return ['ready_to_ship', 'to pack', 'pending', 'unpacked'].includes(status) || o.statuses?.some(s => ['ready_to_ship', 'to pack', 'pending', 'unpacked'].includes(s.toLowerCase()));
    });

    if (toPackOrders.length === 0) {
      alert('No hay pedidos en estado "To Pack" o "Ready to Ship" para imprimir.');
      return;
    }

    setIsMiraviaLoading(true);
    try {
      const response = await fetch('/api/miravia/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: toPackOrders })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al obtener documentos');
      }

      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      } else if (data.html) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        }
      } else {
        throw new Error('No se recibió un formato de documento válido');
      }

      setTimeout(() => {
        fetchMiraviaOrders();
      }, 3000);

    } catch (err: any) {
      console.error('Error printing Miravia labels:', err);
      alert(`Error al imprimir etiquetas: ${err.message}`);
    } finally {
      setIsMiraviaLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="text-red-900" />
          Pedidos Online
        </h2>
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          {isOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="bg-white">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px px-6" aria-label="Tabs">
              <button
                onClick={() => setPedidosOnlineSubTab('todos')}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  pedidosOnlineSubTab === 'todos'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Sacar Listado Pedidos (TODOS)
              </button>
              <button
                onClick={() => setPedidosOnlineSubTab('web')}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  pedidosOnlineSubTab === 'web'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Pedidos Shopify
              </button>
              <button
                onClick={() => setPedidosOnlineSubTab('miravia')}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  pedidosOnlineSubTab === 'miravia'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Sacar Listado Pedidos Miravia
              </button>
              <button
                onClick={() => setPedidosOnlineSubTab('sendcloud')}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  pedidosOnlineSubTab === 'sendcloud'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Sendcloud
              </button>
            </nav>
          </div>

          <div className="p-6">
            {pedidosOnlineSubTab === 'todos' && (
              <div className="text-center py-12">
                <p className="text-slate-500">Funcionalidad para listar todos los pedidos en desarrollo.</p>
              </div>
            )}
            
            {pedidosOnlineSubTab === 'web' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <h3 className="text-lg font-medium text-slate-800">Pedidos Shopify</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setShopifySubTab('no_preparado')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          shopifySubTab === 'no_preparado'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        No preparado
                      </button>
                      <button
                        onClick={() => setShopifySubTab('en_espera')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          shopifySubTab === 'en_espera'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        En Espera
                      </button>
                      <button
                        onClick={() => setShopifySubTab('pago_pendiente')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          shopifySubTab === 'pago_pendiente'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Pago Pendiente
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {shopifySubTab === 'en_espera' && (
                      <Button 
                        variant="outline" 
                        onClick={handleReleaseTodaysHolds} 
                        disabled={isReleasingHold || isShopifyLoading}
                        className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {isReleasingHold ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Preparar Pedidos de Hoy
                      </Button>
                    )}
                    <Button variant="outline" onClick={fetchShopifyOrders} disabled={isShopifyLoading} className="flex items-center gap-2">
                      {isShopifyLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Actualizar Pedidos
                    </Button>
                    {shopifySubTab === 'no_preparado' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={generateShopifyPickingList} 
                          disabled={isShopifyLoading}
                          className="flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-200"
                        >
                          <FileText size={16} />
                          Picking List
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={generateShopifyPackingLabels} 
                          disabled={isShopifyLoading}
                          className="flex items-center gap-2 bg-green-50 text-green-600 border-green-200"
                        >
                          <Printer size={16} />
                          Packing Labels
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {shopifyError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{shopifyError}</p>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              const filtered = shopifyOrders.filter(order => {
                                const deliveryDate = order.note_attributes?.find((a: any) => a.name === 'Preferred Delivery Date')?.value;
                                const isCOD = order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery');
                                const isPendingPayment = order.financial_status !== 'paid' && !isCOD;
                                const isEnEspera = !!deliveryDate || order.fulfillment_status === 'on_hold';
                                
                                if (shopifySubTab === 'pago_pendiente') return isPendingPayment;
                                if (shopifySubTab === 'en_espera') return !isPendingPayment && isEnEspera;
                                return !isPendingPayment && !isEnEspera && (order.fulfillment_status === null || order.fulfillment_status === 'unfulfilled');
                              });
                              
                              if (e.target.checked) {
                                setShopifyExclusions(new Set());
                              } else {
                                setShopifyExclusions(new Set(filtered.map(o => o.id)));
                              }
                            }}
                            checked={shopifyOrders.length > 0 && !shopifyOrders.some(o => shopifyExclusions.has(o.id))}
                          />
                        </th>
                        <th className="px-4 py-3">Pedido</th>
                        <th className="px-4 py-3">Fecha</th>
                        {shopifySubTab === 'en_espera' && <th className="px-4 py-3">Fecha Envío</th>}
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Estado Pago</th>
                        <th className="px-4 py-3">Envío</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Artículos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const getPreferredDeliveryDate = (order: any) => {
                          const attr = order.note_attributes?.find((a: any) => a.name === 'Preferred Delivery Date');
                          return attr ? attr.value : null;
                        };

                        const filteredOrders = shopifyOrders.filter(order => {
                          const deliveryDate = getPreferredDeliveryDate(order);
                          const isCOD = order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery');
                          const isPendingPayment = order.financial_status !== 'paid' && !isCOD;
                          const isEnEspera = !!deliveryDate || order.fulfillment_status === 'on_hold';
                          
                          if (shopifySubTab === 'pago_pendiente') {
                            return isPendingPayment;
                          } else if (shopifySubTab === 'en_espera') {
                            return !isPendingPayment && isEnEspera;
                          } else {
                            return !isPendingPayment && !isEnEspera && (order.fulfillment_status === null || order.fulfillment_status === 'unfulfilled');
                          }
                        });

                        if (filteredOrders.length === 0) {
                          const tabNames = {
                            no_preparado: 'No preparados',
                            en_espera: 'En Espera',
                            pago_pendiente: 'Pago Pendiente'
                          };
                          return (
                            <tr>
                              <td colSpan={shopifySubTab === 'en_espera' ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                                {isShopifyLoading ? 'Cargando pedidos...' : `No hay pedidos "${tabNames[shopifySubTab]}" en Shopify.`}
                              </td>
                            </tr>
                          );
                        }

                        return filteredOrders.map((order: any) => (
                          <tr key={order.id} className={`hover:bg-slate-50 ${shopifyExclusions.has(order.id) ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                checked={!shopifyExclusions.has(order.id)}
                                onChange={() => {
                                  const newExclusions = new Set(shopifyExclusions);
                                  if (newExclusions.has(order.id)) {
                                    newExclusions.delete(order.id);
                                  } else {
                                    newExclusions.add(order.id);
                                  }
                                  setShopifyExclusions(newExclusions);
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex flex-col">
                                <span>{order.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{order.store_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                            {shopifySubTab === 'en_espera' && (
                              <td className="px-4 py-3 text-red-600 font-bold">
                                {getPreferredDeliveryDate(order) || '-'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-slate-600">
                              {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Sin cliente'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.financial_status === 'paid' ? 'bg-green-100 text-green-700' : 
                                (order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery')) ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.financial_status} {(order.gateway === 'cash_on_delivery' || order.payment_gateway_names?.includes('cash_on_delivery')) ? '(COD)' : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {order.shipping_lines?.[0]?.title || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-medium">{order.total_price} {order.currency}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {order.line_items?.map((item: any) => (
                                <div key={item.id} className="text-xs">
                                  {item.quantity}x {item.title}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pedidosOnlineSubTab === 'miravia' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-slate-800">Pedidos Miravia (Delivery By Miravia)</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-slate-600">Desde:</label>
                      <input 
                        type="date" 
                        value={miraviaStartDate}
                        onChange={(e) => setMiraviaStartDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <Button variant="outline" onClick={fetchMiraviaOrders} disabled={isMiraviaLoading} className="flex items-center gap-2">
                      {isMiraviaLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Actualizar Pedidos
                    </Button>
                    <Button onClick={printMiraviaLabels} disabled={isMiraviaLoading || miraviaOrders.filter(o => {
                      const status = (o.status || (o.statuses && o.statuses[0]) || '').toLowerCase();
                      return ['ready_to_ship', 'to pack', 'pending', 'unpacked'].includes(status) || o.statuses?.some(s => ['ready_to_ship', 'to pack', 'pending', 'unpacked'].includes(s.toLowerCase()));
                    }).length === 0} className="flex items-center gap-2">
                      <Printer size={16} />
                      Imprimir Etiquetas A6 (To Pack)
                    </Button>
                    <Button onClick={async () => {
                      setIsMiraviaLoading(true);
                      try {
                        const res = await fetch('/api/miravia/orders/export');
                        const data = await res.json();
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Miravia');
                        XLSX.writeFile(wb, 'Pedidos_Miravia.xlsx');
                      } catch (err) {
                        console.error(err);
                        alert('Error al exportar pedidos');
                      } finally {
                        setIsMiraviaLoading(false);
                      }
                    }} disabled={isMiraviaLoading} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Download size={16} />
                      Exportar Excel
                    </Button>
                  </div>
                </div>
                
                {showMiraviaAuth && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h4 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Migrar Tokens desde Excel
                    </h4>
                    <p className="text-blue-800 mb-4">
                      Como la URL de autorización de Miravia no te funciona, vamos a importar el token que ya tienes en tu Excel.
                    </p>
                    <ol className="list-decimal list-inside text-blue-800 mb-6 space-y-2">
                      <li>Abre tu Google Sheet original.</li>
                      <li>Ve a la pestaña llamada <strong>"tokens"</strong>.</li>
                      <li>Copia <strong>TODO el texto</strong> que hay en la <strong>celda A1</strong>.</li>
                      <li>Pégalo en el recuadro de abajo y haz clic en "Importar Token".</li>
                    </ol>
                    
                    <form onSubmit={handleMiraviaAuthSubmit} className="flex flex-col gap-3 max-w-xl">
                      <textarea
                        value={miraviaAuthCode}
                        onChange={(e) => setMiraviaAuthCode(e.target.value)}
                        placeholder='Ejemplo: {"access_token":"...","refresh_token":"..."}'
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono text-sm"
                        required
                      />
                      <Button type="submit" disabled={isMiraviaAuthLoading || !miraviaAuthCode.trim()} className="bg-blue-600 hover:bg-blue-700 text-white self-end">
                        {isMiraviaAuthLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        Importar Token
                      </Button>
                    </form>
                  </div>
                )}

                {miraviaError && !showMiraviaAuth && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    <p>{miraviaError}</p>
                  </div>
                )}

                {miraviaOrders.length > 0 ? (
                  <div className="space-y-8">
                    {/* Pendientes de Enviar */}
                    <div>
                      <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs">Pendientes de Enviar (To Pack)</span>
                        <span className="text-sm text-slate-500 font-normal">({miraviaOrders.filter(o => o.statuses?.includes('ready_to_ship') || o.statuses?.includes('To pack') || o.status === 'ready_to_ship' || o.status === 'To pack').length} pedidos)</span>
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pedido</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Artículos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {miraviaOrders.filter(o => {
                                const isToPack = o.statuses?.includes('ready_to_ship') || o.statuses?.includes('To pack') || o.status === 'ready_to_ship' || o.status === 'To pack';
                                return isToPack;
                              }).map((order) => (
                                <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{order.order_id}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      {order.statuses?.join(', ') || order.status || 'Desconocido'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-500">
                                    <ul className="list-disc list-inside">
                                      {order.items?.map(item => (
                                        <li key={item.order_item_id} className="mb-1">
                                          <span className="font-semibold">{item.quantity}x</span> {item.name} 
                                          <br/>
                                          <span className="text-xs text-slate-400 ml-4">SKU: {item.sku}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                              ))}
                              {miraviaOrders.filter(o => o.statuses?.includes('ready_to_ship') || o.statuses?.includes('To pack') || o.status === 'ready_to_ship' || o.status === 'To pack').length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                                    No hay pedidos pendientes de enviar en este rango de fechas.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Enviados */}
                    <div>
                      <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">Enviados (Shipped)</span>
                        <span className="text-sm text-slate-500 font-normal">({miraviaOrders.filter(o => o.statuses?.includes('shipped') || o.statuses?.includes('Shipped') || o.status === 'shipped' || o.status === 'Shipped').length} pedidos)</span>
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pedido</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Artículos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {miraviaOrders.filter(o => o.statuses?.includes('shipped') || o.statuses?.includes('Shipped') || o.status === 'shipped' || o.status === 'Shipped').map((order) => (
                                <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{order.order_id}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      {order.statuses?.join(', ') || order.status || 'Desconocido'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-500">
                                    <ul className="list-disc list-inside">
                                      {order.items?.map(item => (
                                        <li key={item.order_item_id} className="mb-1">
                                          <span className="font-semibold">{item.quantity}x</span> {item.name}
                                          <br/>
                                          <span className="text-xs text-slate-400 ml-4">SKU: {item.sku}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                              ))}
                              {miraviaOrders.filter(o => o.statuses?.includes('shipped') || o.statuses?.includes('Shipped') || o.status === 'shipped' || o.status === 'Shipped').length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                                    No hay pedidos enviados en este rango de fechas.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
                    <p className="text-slate-500 mb-4">Haz clic en "Actualizar Pedidos" para cargar los pedidos de Miravia.</p>
                  </div>
                )}

                {/* TEST APIS Section */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    ZONA TEST APIS
                  </h3>
                  
                  <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
                    <label className="text-sm font-medium text-slate-700">Seleccionar Año:</label>
                    <select 
                      value={selectedMiraviaYear} 
                      onChange={(e) => setSelectedMiraviaYear(e.target.value)}
                      className="px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch(`/api/miravia/test/orders?year=${selectedMiraviaYear}`);
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, `Orders ${selectedMiraviaYear}`);
                          XLSX.writeFile(wb, `Miravia_Orders_${selectedMiraviaYear}.xlsx`);
                        } catch (err: any) {
                          alert('Error API Orders: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Download size={16} />
                      Get Orders ({selectedMiraviaYear})
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch(`/api/miravia/test/order-items?year=${selectedMiraviaYear}`);
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, `Order Items ${selectedMiraviaYear}`);
                          XLSX.writeFile(wb, `Miravia_OrderItems_${selectedMiraviaYear}.xlsx`);
                        } catch (err: any) {
                          alert('Error API Order Items: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Download size={16} />
                      Get Order Items ({selectedMiraviaYear})
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch(`/api/miravia/test/payouts?year=${selectedMiraviaYear}`);
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, `Payouts ${selectedMiraviaYear}`);
                          XLSX.writeFile(wb, `Miravia_Payouts_${selectedMiraviaYear}.xlsx`);
                        } catch (err: any) {
                          alert('Error API Payouts: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Download size={16} />
                      Get Payout Status ({selectedMiraviaYear})
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch(`/api/miravia/test/transactions?year=${selectedMiraviaYear}`);
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, `Transactions ${selectedMiraviaYear}`);
                          XLSX.writeFile(wb, `Miravia_Transactions_${selectedMiraviaYear}.xlsx`);
                        } catch (err: any) {
                          alert('Error API Transactions: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Download size={16} />
                      Query Transaction Details ({selectedMiraviaYear})
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/seller');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          alert('Seller Info: ' + JSON.stringify(data.data || data));
                        } catch (err: any) {
                          alert('Error API Seller: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <UserIcon size={16} />
                      Get Seller Info
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/shipping-permission');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          alert('Shipping Permission: ' + JSON.stringify(data.data || data));
                        } catch (err: any) {
                          alert('Error API Shipping: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Truck size={16} />
                      Shipping Permission
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/products');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          
                          const ws = XLSX.utils.json_to_sheet(data.data?.products || []);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'Products');
                          XLSX.writeFile(wb, 'Miravia_Products.xlsx');
                        } catch (err: any) {
                          alert('Error API Products: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Package size={16} />
                      Get Products
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/feeds');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          alert('Feeds: ' + JSON.stringify(data.data || data));
                        } catch (err: any) {
                          alert('Error API Feeds: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Rss size={16} />
                      Get Feeds
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/reverse-reasons');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          alert('Reverse Reasons: ' + JSON.stringify(data.data || data));
                        } catch (err: any) {
                          alert('Error API Reasons: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <RotateCcw size={16} />
                      Reverse Reasons
                    </Button>

                    <Button 
                      onClick={async () => {
                        setIsMiraviaLoading(true);
                        try {
                          const res = await fetch('/api/miravia/test/sof-providers');
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          alert('SOF Providers: ' + JSON.stringify(data.data || data));
                        } catch (err: any) {
                          alert('Error API SOF: ' + err.message);
                        } finally {
                          setIsMiraviaLoading(false);
                        }
                      }}
                      disabled={isMiraviaLoading}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <Truck size={16} />
                      SOF Providers
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {pedidosOnlineSubTab === 'sendcloud' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-slate-800">Envíos Sendcloud</h3>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={fetchSendcloudParcels} disabled={isSendcloudLoading} className="flex items-center gap-2">
                      {isSendcloudLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Actualizar Envíos
                    </Button>
                  </div>
                </div>

                {sendcloudError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{sendcloudError}</p>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">ID Paquete</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Destinatario</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Transportista</th>
                        <th className="px-4 py-3">Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sendcloudParcels.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            {isSendcloudLoading ? 'Cargando envíos...' : 'No hay envíos recientes en Sendcloud.'}
                          </td>
                        </tr>
                      ) : (
                        sendcloudParcels.map((parcel: any) => (
                          <tr key={parcel.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{parcel.id}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(parcel.date_created).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-slate-600">{parcel.name}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {parcel.status?.message || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{parcel.carrier?.name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{parcel.tracking_number || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
