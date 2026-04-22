import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, Send, Package, CheckCircle2, AlertCircle, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Eye, ChevronDown, ChevronRight, Printer, Lock, RotateCcw, Unlock, Database, Search, FileText, Download, Table as TableIcon, X
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CALICER_LOGO, FIRMA_LOGO } from '../../../assets/images';

const ASICI_CLIENTS = [
  { id: 'A00234567', name: 'Deshuesado en fábrica' },
  { id: 'A01234567', name: 'Loncheado en fábrica' },
  { id: 'B75954792', name: 'MARLON' },
  { id: 'B37310604', name: 'Bernardino Perez' },
  { id: 'B34102012', name: 'Ind. Carnicas Peñafria' },
  { id: 'A28885614', name: 'Grasas del centro' }
];

interface TraceabilityProps {
  user: any;
  setConfirmDialog: any;
}

export default function Traceability({ user, setConfirmDialog }: TraceabilityProps) {
  const [depcPedido, setDepcPedido] = useState('');
  const [depcAlbaran, setDepcAlbaran] = useState('');
  const [isGeneratingDEPC, setIsGeneratingDEPC] = useState(false);
  const [depcError, setDepcError] = useState<string | null>(null);

  const [simpleQueryData, setSimpleQueryData] = useState<any[]>([]);
  const [simpleQueryLoading, setSimpleQueryLoading] = useState(false);
  const [simpleQueryError, setSimpleQueryError] = useState<string | null>(null);

  // Corregir Precinto state
  const [corregirLote, setCorregirLote] = useState('');
  const [corregirTipo, setCorregirTipo] = useState('Jamon');
  const [corregirPrecinto, setCorregirPrecinto] = useState('');
  const [isCorrigiendoPrecinto, setIsCorrigiendoPrecinto] = useState(false);
  const [corregirPrecintoMessage, setCorregirPrecintoMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Clear Orders State
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [isPickingReportLoading, setIsPickingReportLoading] = useState(false);
  const [isPickingSectionOpen, setIsPickingSectionOpen] = useState(false);
  const [showPickingPreview, setShowPickingPreview] = useState(false);
  const [pickingPreviewData, setPickingPreviewData] = useState<{ enteros: any[], resto: any[] } | null>(null);
  const [expandedPickingOrders, setExpandedPickingOrders] = useState<string[]>([]);

  const [clearOrdersMessage, setClearOrdersMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isLoadingPendingOrders, setIsLoadingPendingOrders] = useState(false);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [ordersMode, setOrdersMode] = useState<'pending' | 'sent' | 'reservas'>('pending');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const [pendingOrdersFilters, setPendingOrdersFilters] = useState({
    Cerrado: '',
    CodigoCliente: '',
    'F.Pedido': '',
    SeriePedido: '',
    NumeroPedido: '',
    'Razon Social': '',
    Transportista: '',
    BultosEnvio: '',
    CodigoEmpresa: ''
  });

  const filteredOrders = useMemo(() => {
    let result = pendingOrders.filter(order => {
      return Object.entries(pendingOrdersFilters).every(([key, value]) => {
        if (!value) return true;
        const orderValue = String((order as any)[key] || '').toLowerCase();
        const filterValue = String(value).toLowerCase();
        return orderValue.includes(filterValue);
      });
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        
        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [pendingOrders, pendingOrdersFilters, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null; // Cycle: asc -> desc -> none
      }
      return { key, direction: 'asc' };
    });
  };

  // Order Lines & Pesadas State
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [orderLines, setOrderLines] = useState<Record<string, any[]>>({});
  const [isLoadingLines, setIsLoadingLines] = useState<Record<string, boolean>>({});
  const [expandedLines, setExpandedLines] = useState<string[]>([]);
  const [linePesadas, setLinePesadas] = useState<Record<string, any[]>>({});
  const [isLoadingLinePesadas, setIsLoadingLinePesadas] = useState<Record<string, boolean>>({});

  // Holded Invoices Details State
  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([]);
  const [invoiceDetails, setInvoiceDetails] = useState<Record<string, any>>({});
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState<Record<string, boolean>>({});
  const [isLoadingAction, setIsLoadingAction] = useState<Record<string, boolean>>({});

  // ASICI Query State
  const [showAsiciForm, setShowAsiciForm] = useState(false);
  const [asiciCliente, setAsiciCliente] = useState('B75954792');
  const [asiciFechaDesde, setAsiciFechaDesde] = useState('2026-01-03');
  const [asiciFechaHasta, setAsiciFechaHasta] = useState('2026-01-20');

  // Calicer Query State
  const [showCalicerForm, setShowCalicerForm] = useState(false);
  const [calicerYear, setCalicerYear] = useState('2026');

  // Pesadas Query State
  const [showPesadasForm, setShowPesadasForm] = useState(false);
  const [pesadasEjercicio, setPesadasEjercicio] = useState('2026');
  const [pesadasSerie, setPesadasSerie] = useState('ATR26');
  const [pesadasNumero, setPesadasNumero] = useState('3');

  // Cambiar Pesadas State
  const [showCambiarPesadasModal, setShowCambiarPesadasModal] = useState(false);
  const [cambiarPesadasData, setCambiarPesadasData] = useState<{
    ejercicioOrigen: string;
    serieOrigen: string;
    numeroOrigen: string;
    lineaOrigen: string;
    codigoArticulo: string;
  } | null>(null);
  const [cambiarPesadasDestino, setCambiarPesadasDestino] = useState({
    ejercicio: new Date().getFullYear().toString(),
    serie: '',
    numero: ''
  });
  const [isCambiandoPesadas, setIsCambiandoPesadas] = useState(false);
  const [cambiarPesadasError, setCambiarPesadasError] = useState<string | null>(null);

  const handleOpenCambiarPesadas = (order: any, line: any) => {
    setCambiarPesadasData({
      ejercicioOrigen: order.EjercicioPedido,
      serieOrigen: order.SeriePedido,
      numeroOrigen: order.NumeroPedido,
      lineaOrigen: line.LineasPosicion,
      codigoArticulo: line.Codigo
    });
    setCambiarPesadasDestino({
      ejercicio: new Date().getFullYear().toString(),
      serie: '',
      numero: ''
    });
    setCambiarPesadasError(null);
    setShowCambiarPesadasModal(true);
  };

  const handleCambiarPesadasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cambiarPesadasData) return;
    
    setIsCambiandoPesadas(true);
    setCambiarPesadasError(null);
    
    try {
      const response = await fetch('/api/orders/cambiar-pesadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cambiarPesadasData,
          ejercicioDestino: cambiarPesadasDestino.ejercicio,
          serieDestino: cambiarPesadasDestino.serie,
          numeroDestino: cambiarPesadasDestino.numero
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cambiar pesadas');
      
      alert('Pesadas cambiadas correctamente');
      setShowCambiarPesadasModal(false);
      
      // Reload pesadas for this line to reflect changes (it should be empty now)
      const lineId = `${cambiarPesadasData.ejercicioOrigen}-${cambiarPesadasData.serieOrigen}-${cambiarPesadasData.numeroOrigen}-${cambiarPesadasData.codigoArticulo}`;
      setIsLoadingLinePesadas(prev => ({ ...prev, [lineId]: true }));
      try {
        const response = await fetch(`/api/orders/pesadas-linea?ejercicioPedido=${cambiarPesadasData.ejercicioOrigen}&seriePedido=${cambiarPesadasData.serieOrigen}&numeroPedido=${cambiarPesadasData.numeroOrigen}&codigoArticulo=${cambiarPesadasData.codigoArticulo}`);
        if (response.ok) {
          const data = await response.json();
          setLinePesadas(prev => ({ ...prev, [lineId]: data }));
        }
      } catch (error) {
        console.error("Load Line Pesadas Error:", error);
      } finally {
        setIsLoadingLinePesadas(prev => ({ ...prev, [lineId]: false }));
      }
      
    } catch (error: any) {
      setCambiarPesadasError(error.message);
    } finally {
      setIsCambiandoPesadas(false);
    }
  };
  const handleRunPesadasQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSimpleQueryLoading(true);
    setSimpleQueryError(null);
    setSimpleQueryData([]);
    setShowPesadasForm(false);

    try {
      const response = await fetch('/api/queries/pesadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejercicioPedido: pesadasEjercicio,
          seriePedido: pesadasSerie,
          numeroPedido: pesadasNumero
        })
      });
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSimpleQueryData(data);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Formato de respuesta desconocido');
      }
    } catch (error: any) {
      console.error("Pesadas Query Error:", error);
      setSimpleQueryError(error.message || 'Error al ejecutar la consulta');
    } finally {
      setSimpleQueryLoading(false);
    }
  };

  const handleRunCalicerQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSimpleQueryLoading(true);
    setSimpleQueryError(null);
    setSimpleQueryData([]);
    setShowCalicerForm(false);

    try {
      const response = await fetch(`/api/queries/calicer?year=${calicerYear}`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSimpleQueryData(data);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Formato de respuesta desconocido');
      }
    } catch (error: any) {
      console.error("Calicer Query Error:", error);
      setSimpleQueryError(error.message || 'Error al ejecutar la consulta');
    } finally {
      setSimpleQueryLoading(false);
    }
  };

  const handleRunAsiciQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSimpleQueryLoading(true);
    setSimpleQueryError(null);
    setSimpleQueryData([]);
    setShowAsiciForm(false);

    try {
      const response = await fetch('/api/queries/asici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: asiciCliente,
          fechaDesde: asiciFechaDesde.replace(/-/g, ''),
          fechaHasta: asiciFechaHasta.replace(/-/g, '')
        })
      });
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSimpleQueryData(data);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Formato de respuesta desconocido');
      }
    } catch (error: any) {
      console.error("ASICI Query Error:", error);
      setSimpleQueryError(error.message || 'Error al ejecutar la consulta');
    } finally {
      setSimpleQueryLoading(false);
    }
  };

  const handleGenerateAllAsici = async () => {
    setSimpleQueryLoading(true);
    setSimpleQueryError(null);
    setShowAsiciForm(false);

    try {
      for (const client of ASICI_CLIENTS) {
        const response = await fetch('/api/queries/asici', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: client.id,
            fechaDesde: asiciFechaDesde.replace(/-/g, ''),
            fechaHasta: asiciFechaHasta.replace(/-/g, '')
          })
        });
        
        if (!response.ok) continue;
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          const csvContent = [
            headers.join(','),
            ...data.map((row: any) => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))
          ].join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${client.name}_${asiciFechaDesde}_${asiciFechaHasta}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error: any) {
      console.error("Generate All ASICI Error:", error);
      setSimpleQueryError(error.message || 'Error al generar los ficheros');
    } finally {
      setSimpleQueryLoading(false);
    }
  };

  const handleLoadPendingOrders = async (mode: 'pending' | 'sent' | 'reservas' = ordersMode) => {
    setIsLoadingPendingOrders(true);
    setClearOrdersMessage(null);
    setOrdersMode(mode);
    setShowPendingOrders(true); // Always show when loading
    try {
      let url = `/api/orders/pending?sent=${mode === 'sent'}&year=${selectedYear}`;
      if (mode === 'reservas') {
        url = '/api/orders/reservas';
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al cargar pedidos');
      const data = await response.json();
      setPendingOrders(data);
      setSelectedOrders([]); // Reset selection
    } catch (error: any) {
      console.error("Load Pending Orders Error:", error);
      setClearOrdersMessage({ type: 'error', text: error.message || 'Error al cargar los pedidos' });
    } finally {
      setIsLoadingPendingOrders(false);
    }
  };

  const handleCorregirPrecinto = async () => {
    if (!corregirLote || !corregirTipo || !corregirPrecinto) return;
    
    setIsCorrigiendoPrecinto(true);
    setCorregirPrecintoMessage(null);
    try {
      const response = await fetch('/api/trazabilidad/corregir-precinto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lote: corregirLote,
          tipo: corregirTipo,
          precinto: corregirPrecinto
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al corregir el precinto');
      }
      
      setCorregirPrecintoMessage({ type: 'success', text: data.message || 'Precinto corregido y añadido correctamente.' });
      setCorregirLote('');
      setCorregirPrecinto('');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setCorregirPrecintoMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error:', err);
      setCorregirPrecintoMessage({ type: 'error', text: err.message || 'Error al corregir el precinto' });
    } finally {
      setIsCorrigiendoPrecinto(false);
    }
  };

  const handleGenerateDEPC = async () => {
    if (!depcPedido || !depcAlbaran) return;
    
    setIsGeneratingDEPC(true);
    setDepcError(null);
    
    try {
      // Parse depcPedido (e.g. 2026-PTR26-6)
      const parts = depcPedido.split('-');
      if (parts.length !== 3) {
        throw new Error('El formato del pedido debe ser Ejercicio-Serie-Numero (ej: 2026-PTR26-6)');
      }
      const [ejercicio, serie, numero] = parts;
      
      const response = await fetch(`/api/depc?ejercicio=${ejercicio}&serie=${serie}&numero=${numero}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener datos para DEPC');
      }
      
      const data = await response.json();
      if (!data || data.length === 0) {
        throw new Error('No se encontraron datos para ese pedido');
      }
      
      // Generate PDF
      const doc = new jsPDF();
      
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      const timeStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}:${today.getSeconds().toString().padStart(2, '0')}`;
      
      // Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DEPC: Documento de Expedición de producto Conforme", 105, 15, { align: "center" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      // Left box
      doc.rect(10, 20, 100, 30);
      doc.setFont("helvetica", "bold");
      doc.text("D.IBERICO,ARTESANOS DEL CERDO IBERICO", 12, 26);
      doc.setFont("helvetica", "normal");
      doc.text("Polígono Industrial el Montecillo, Finca 213", 12, 31);
      doc.text("37770 GUIJUELO", 12, 36);
      doc.text("CIF.: B37282563", 12, 41);
      doc.text("Tel.: 923580404           Fax: 923158194", 12, 46);
      
      // Health Mark (Oval)
      doc.setDrawColor(150);
      doc.setLineWidth(0.5);
      doc.ellipse(135, 35, 18, 11);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("ESPAÑA", 135, 29, { align: "center", baseline: "middle" });
      doc.text("10.13159/SA", 135, 35, { align: "center", baseline: "middle" });
      doc.text("U.E.", 135, 41, { align: "center", baseline: "middle" });

      // CALICER Logo (Right box) - 10% smaller
      try {
        doc.addImage(CALICER_LOGO, 'PNG', 163, 17, 27, 36);
      } catch (err) {
        console.warn("Could not load CALICER logo", err);
        doc.rect(163, 17, 27, 36);
        doc.text("LOGO CALICER", 176, 35, { align: "center" });
      }
      
      // Client box
      const client = data[0];
      
      let orderDateStr = dateStr;
      if (client.FechaPedido) {
        const d = new Date(client.FechaPedido);
        orderDateStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
      }

      // Dates and Albaran box
      doc.rect(10, 55, 90, 20);
      doc.text("Fecha Expedición/Emisión:", 12, 61);
      doc.text(orderDateStr, 55, 61);
      doc.text("Albaran de Venta:", 12, 67);
      doc.text(depcAlbaran, 55, 67);
      doc.text("Num. Certificado:", 12, 73);
      doc.text(depcAlbaran.split(' ').pop() || depcAlbaran, 55, 73);
      
      doc.rect(110, 55, 90, 20);
      doc.text(client.RazonSocial || '', 112, 61);
      doc.text(client.Domicilio || '', 112, 67);
      
      const cp = client.CodigoPostal || '';
      const prov = client.Provincia || '';
      const mun = client.Municipio || '';
      doc.text(`${cp}  ${mun}  ${prov}`.trim(), 112, 73);
      
      // Text
      doc.setFontSize(7);
      doc.text("Según la norma de calidad para el Jamón Ibérico, Paleta Ibérica y Caña de Lomo Ibérico elaborados en España (R.D. 4 del 10 de Enero 2014)", 10, 82);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Declara :", 15, 90);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Que los productos abajo relacionados cumplen hasta nuestra expedición con los requisitos especificados en el R.D. 4/2014 por el que se establece la Norma de", 10, 96);
      doc.text("Calidad para el Jamón Ibérico, Paleta Ibérica y caña de Lomo Ibérico elaborados en España.", 10, 100);
      
      doc.text("La trazabilidad de estos productos se encuentra soportada por los certificados de entidades de inspección, el control físico y documental de los lotes de sacrificio, y", 10, 108);
      doc.text("su correlación a la identificación de las piezas.", 10, 112);
      
      // Group by article
      const articles = [...new Set(data.map((d: any) => d.CodigoArticulo))];
      
      let startY = 118;
      
      articles.forEach((artCode) => {
        const artData = data
          .filter((d: any) => d.CodigoArticulo === artCode)
          .sort((a: any, b: any) => {
            const valA = String(a.NumeroSerieLc || '');
            const valB = String(b.NumeroSerieLc || '');
            return valA.localeCompare(valB, undefined, { numeric: true });
          });
        const artDesc = artData[0].DescripcionArticulo;
        
        // Article Header
        autoTable(doc, {
          startY: startY,
          head: [['Descripción Articulo']],
          body: [[artDesc]],
          theme: 'plain',
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
          margin: { left: 10, right: 10 }
        });
        
        startY = (doc as any).lastAutoTable.finalY + 2;
        
        // Article Details
        const tableData = artData.map((d: any) => [
          d.Partida || '',
          d.Peso?.toFixed(2) || '',
          d.NumeroSerieLc || '',
          d.Raza || '',
          d.Alimentacion || '',
          d.EntidadInspeccion || '',
          d.NroCertificado || '',
          d.LoteSacrificio || '',
          d.FechaSalazon ? new Date(d.FechaSalazon).toLocaleDateString() : ''
        ]);
        
        autoTable(doc, {
          startY: startY,
          head: [['Partida', 'Kg', 'Número de Serie', 'Raza', 'Alimentación', 'Entidad Inspección', 'NroCertificado', 'LoteSacrificio', 'Fecha Salazon']],
          body: tableData,
          theme: 'plain',
          styles: { fontSize: 6, cellPadding: 1 },
          headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
          margin: { left: 10, right: 10, bottom: 30 }
        });
        
        startY = (doc as any).lastAutoTable.finalY + 5;
        
        const totalPiezas = artData.length;
        const totalPeso = artData.reduce((sum: number, d: any) => sum + (d.Peso || 0), 0);
        
        if (startY > 260) {
          doc.addPage();
          startY = 20;
        }
        
        doc.setFontSize(7);
        doc.text(`Total Nº de Serie Certificados : ${totalPiezas} | ${totalPeso.toFixed(3)} kg del Articulo ${artDesc}`, 10, startY);
        
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.line(10, startY + 4, 200, startY + 4);
        
        startY += 10;
      });
      
      // Add footer to all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Separator line
        doc.setDrawColor(150);
        doc.line(10, 274, 200, 274);
        
        doc.setFontSize(7);
        doc.text(`${dateStr} ${timeStr}`, 10, 278);
        doc.text(`Página: ${i} / ${pageCount}`, 190, 278, { align: "right" });
        
        doc.text([
          "Las piezas anteriormente relacionadas cumplen el tiempo mínimo de elaboración, así como el peso mínimo en curado",
          "en el momento de la expedición establecidos en el R. D. 4/2014."
        ], 10, 284);
        
        try {
          doc.addImage(FIRMA_LOGO, 'PNG', 140, 275, 30, 11);
        } catch (err) {
          console.warn("Could not load signature image", err);
          doc.rect(140, 275, 30, 11);
          doc.text("FIRMA", 155, 280, { align: "center" });
        }
      }
      
      doc.save(`DEPC_${depcAlbaran.replace(/\s/g, '_')}.pdf`);
      
    } catch (error: any) {
      console.error("Generate DEPC Error:", error);
      setDepcError(error.message || 'Error al generar el PDF');
    } finally {
      setIsGeneratingDEPC(false);
    }
  };

  const toggleLinePesadas = async (order: any, line: any) => {
    const lineId = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}-${line.Codigo}-${line.Orden}`;
    
    if (expandedLines.includes(lineId)) {
      setExpandedLines(expandedLines.filter(id => id !== lineId));
      return;
    }

    setExpandedLines([...expandedLines, lineId]);
    
    if (!linePesadas[lineId]) {
      setIsLoadingLinePesadas(prev => ({ ...prev, [lineId]: true }));
      try {
        const response = await fetch(`/api/orders/pesadas-linea?ejercicioPedido=${order.EjercicioPedido}&seriePedido=${order.SeriePedido}&numeroPedido=${order.NumeroPedido}&codigoArticulo=${line.Codigo}`);
        if (!response.ok) throw new Error('Error al cargar pesadas de la línea');
        const data = await response.json();
        setLinePesadas(prev => ({ ...prev, [lineId]: data }));
      } catch (error) {
        console.error("Load Line Pesadas Error:", error);
      } finally {
        setIsLoadingLinePesadas(prev => ({ ...prev, [lineId]: false }));
      }
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => `${o.CodigoEmpresa}-${o.EjercicioPedido}-${o.SeriePedido}-${o.NumeroPedido}`));
    }
  };

  const handleExportExcel = () => {
    if (simpleQueryData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(simpleQueryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    XLSX.writeFile(workbook, "consulta_resultados.xlsx");
  };

  const handleExportCSV = () => {
    if (simpleQueryData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(simpleQueryData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "consulta_resultados.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectPendingNoPesadas = () => {
    const noPesadas = pendingOrders.filter(o => o.Estado === 0);
    setSelectedOrders(noPesadas.map(o => `${o.CodigoEmpresa}-${o.EjercicioPedido}-${o.SeriePedido}-${o.NumeroPedido}`));
  };

  const getPickingData = async () => {
    if (selectedOrders.length === 0) {
      alert('Selecciona al menos un pedido para generar el informe.');
      return null;
    }
    
    setIsPickingReportLoading(true);
    try {
      let allLines: any[] = [];
      
      // Fetch lines for each selected order
      for (const orderId of selectedOrders) {
        const [empresa, ejercicio, serie, numero] = orderId.split('-');
        const res = await fetch(`/api/orders/lines?ejercicioPedido=${ejercicio}&seriePedido=${serie}&numeroPedido=${numero}`);
        if (!res.ok) throw new Error(`Error fetching lines for order ${orderId}`);
        const lines = await res.json();
        
        // Find the order to get the client name
        const order = pendingOrders.find(o => `${o.CodigoEmpresa}-${o.EjercicioPedido}-${o.SeriePedido}-${o.NumeroPedido}` === orderId);
        const clientName = order ? order['Razon Social'] : 'Desconocido';
        const carrier = order ? order.Transportista : '-';
        const orderRef = `${serie}-${numero}/${ejercicio}`;
        
        lines.forEach((line: any) => {
          allLines.push({
            'Pedido': orderRef,
            'Cliente': clientName,
            'Transportista': carrier,
            'Código Artículo': line.Codigo,
            'Artículo': line.Articulo,
            'Cantidad (Unidades)': line.UnidadesPedidas || 0,
            'Observaciones': line.Observaciones || ''
          });
        });
      }
      
      if (allLines.length === 0) {
        alert('No se encontraron líneas para los pedidos seleccionados.');
        return null;
      }
      
      // Group data
      const isEntero = (desc: string) => {
        // Normalize string to remove accents (e.g., JAMÓN -> JAMON)
        const d = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return (d.includes('JAMON') || d.includes('PALETA')) && 
               !d.includes('DESH') && 
               !d.includes('LONCH') && 
               !d.includes('CENTRO') && 
               !d.includes('TACO') && 
               !d.includes('PORCION') &&
               !d.includes('LONCHAS');
      };

      const enteros = allLines.filter(l => isEntero(l['Artículo'])).sort((a, b) => a['Artículo'].localeCompare(b['Artículo']));
      const resto = allLines.filter(l => !isEntero(l['Artículo'])).sort((a, b) => a['Artículo'].localeCompare(b['Artículo']));

      return { enteros, resto };
    } catch (err: any) {
      console.error(err);
      alert('Error fetching data: ' + err.message);
      return null;
    } finally {
      setIsPickingReportLoading(false);
    }
  };

  const handleGeneratePickingReport = async () => {
    const data = await getPickingData();
    if (!data) return;

    const doc = new jsPDF('landscape');
    
    const generateTable = (title: string, lines: any[], startNewPage = false) => {
      if (startNewPage) doc.addPage();
      
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableColumn = ["Pedido", "Cliente", "Transportista", "Cód. Artículo", "Artículo", "Cant.", "Observaciones"];
      const tableRows = lines.map(line => [
        line['Pedido'],
        line['Cliente'],
        line['Transportista'],
        line['Código Artículo'],
        line['Artículo'],
        line['Cantidad (Unidades)'],
        line['Observaciones']
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [63, 63, 70] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 80 },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 'auto' }
        }
      });
    };

    if (data.enteros.length > 0) {
      generateTable('Informe de Picking - Jamones y Paletas Enteros', data.enteros);
      if (data.resto.length > 0) {
        generateTable('Informe de Picking - Otros Productos', data.resto, true);
      }
    } else if (data.resto.length > 0) {
      generateTable('Informe de Picking - Otros Productos', data.resto);
    }

    doc.save(`Picking_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleViewPicking = async () => {
    const data = await getPickingData();
    if (data) {
      setPickingPreviewData(data);
      setShowPickingPreview(true);
    }
  };

  const handleClearOrders = async () => {
    if (selectedOrders.length === 0) {
      setClearOrdersMessage({ type: 'error', text: 'Selecciona al menos un pedido para actualizar.' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que quieres quitar ${selectedOrders.length} pedido(s) de la pantalla?`,
      onConfirm: async () => {
        setIsClearingOrders(true);
        setClearOrdersMessage(null);
        
        try {
          // Map selected string IDs back to objects
          const ordersToUpdate = pendingOrders
            .filter(o => selectedOrders.includes(`${o.CodigoEmpresa}-${o.EjercicioPedido}-${o.SeriePedido}-${o.NumeroPedido}`))
            .map(o => ({
              CodigoEmpresa: o.CodigoEmpresa,
              EjercicioPedido: o.EjercicioPedido,
              SeriePedido: o.SeriePedido,
              NumeroPedido: o.NumeroPedido
            }));

          const res = await fetch('/api/orders/clear-selected', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: ordersToUpdate })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al limpiar pedidos');
          
          setClearOrdersMessage({ 
            type: 'success', 
            text: `Se han actualizado ${data.rowsAffected || selectedOrders.length} pedidos correctamente.` 
          });
          
          // Reload pending orders to refresh the list
          await handleLoadPendingOrders();
          
        } catch (error: any) {
          console.error("Clear Orders Error:", error);
          setClearOrdersMessage({ type: 'error', text: error.message || 'Error al limpiar pedidos' });
        } finally {
          setIsClearingOrders(false);
        }
      }
    });
  };

  const handleCloseAndPrintSingleOrder = async (order: any) => {
    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que quieres cerrar y sacar etiqueta del pedido ${order.NumeroPedido}?`,
      onConfirm: async () => {
        setIsLoadingPendingOrders(true);
        setClearOrdersMessage(null);
        
        try {
          const ordersToUpdate = [{
            CodigoEmpresa: order.CodigoEmpresa,
            EjercicioPedido: order.EjercicioPedido,
            SeriePedido: order.SeriePedido,
            NumeroPedido: order.NumeroPedido
          }];

          const res = await fetch('/api/orders/close-and-print-selected', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: ordersToUpdate })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al actualizar pedido');
          
          setClearOrdersMessage({ 
            type: 'success', 
            text: `Se ha cerrado y sacado etiqueta del pedido ${order.NumeroPedido} correctamente.` 
          });
          
          // Reload pending orders to refresh the list
          await handleLoadPendingOrders();
          
        } catch (error: any) {
          console.error("Close and Print Single Order Error:", error);
          setClearOrdersMessage({ type: 'error', text: error.message || 'Error al actualizar pedido' });
        } finally {
          setIsLoadingPendingOrders(false);
        }
      }
    });
  };

  const handleForceClose = async (order: any) => {
    // We use a custom modal or just a simple confirm for now, but the user asked for a tooltip "Forzar cerrado?"
    // The actual action should be confirmed.
    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que deseas forzar el cerrado del pedido ${order.NumeroPedido}?`,
      onConfirm: async () => {
        setIsLoadingPendingOrders(true);
        setClearOrdersMessage(null);
        
        try {
          const res = await fetch('/api/orders/force-close', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              empresa: order.CodigoEmpresa,
              ejercicio: order.EjercicioPedido,
              serie: order.SeriePedido,
              numero: order.NumeroPedido
            })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al forzar cerrado');
          
          setClearOrdersMessage({ 
            type: 'success', 
            text: `Pedido ${order.NumeroPedido} cerrado forzosamente con éxito.` 
          });
          
          // Reload orders to refresh the list
          await handleLoadPendingOrders(ordersMode);
          
        } catch (error: any) {
          console.error("Force Close Error:", error);
          setClearOrdersMessage({ type: 'error', text: error.message || 'Error al forzar el cerrado' });
        } finally {
          setIsLoadingPendingOrders(false);
        }
      }
    });
  };

  const handleRevertToPending = async (order: any) => {
    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que deseas enviar el pedido ${order.NumeroPedido} a pendientes?`,
      onConfirm: async () => {
        const orderId = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}`;
        setIsLoadingAction(prev => ({ ...prev, [`revert-${orderId}`]: true }));
        setClearOrdersMessage(null);
        
        try {
          const res = await fetch('/api/orders/revert-pending', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              empresa: order.CodigoEmpresa,
              ejercicio: order.EjercicioPedido,
              serie: order.SeriePedido,
              numero: order.NumeroPedido
            })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al revertir pedido');
          
          setClearOrdersMessage({ 
            type: 'success', 
            text: `Pedido ${order.NumeroPedido} enviado a pendientes con éxito.` 
          });
          
          // Reload orders to refresh the list
          await handleLoadPendingOrders(ordersMode);
          
        } catch (error: any) {
          console.error("Revert to Pending Error:", error);
          setClearOrdersMessage({ type: 'error', text: error.message || 'Error al revertir el pedido' });
        } finally {
          setIsLoadingAction(prev => ({ ...prev, [`revert-${orderId}`]: false }));
        }
      }
    });
  };

  const handleReopenOrder = async (order: any) => {
    setConfirmDialog({
      isOpen: true,
      message: `¿Estás seguro de que deseas re-abrir el pedido ${order.NumeroPedido}?`,
      onConfirm: async () => {
        const orderId = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}`;
        setIsLoadingAction(prev => ({ ...prev, [`reopen-${orderId}`]: true }));
        setClearOrdersMessage(null);
        
        try {
          const res = await fetch('/api/orders/reopen', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              empresa: order.CodigoEmpresa,
              ejercicio: order.EjercicioPedido,
              serie: order.SeriePedido,
              numero: order.NumeroPedido
            })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al re-abrir pedido');
          
          setClearOrdersMessage({ 
            type: 'success', 
            text: `Pedido ${order.NumeroPedido} re-abierto con éxito.` 
          });
          
          // Reload orders to refresh the list
          await handleLoadPendingOrders(ordersMode);
          
        } catch (error: any) {
          console.error("Reopen Order Error:", error);
          setClearOrdersMessage({ type: 'error', text: error.message || 'Error al re-abrir el pedido' });
        } finally {
          setIsLoadingAction(prev => ({ ...prev, [`reopen-${orderId}`]: false }));
        }
      }
    });
  };

  const toggleOrderLines = async (order: any) => {
    const orderId = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}`;
    
    if (expandedOrders.includes(orderId)) {
      setExpandedOrders(expandedOrders.filter(id => id !== orderId));
      return;
    }

    setExpandedOrders([...expandedOrders, orderId]);
    
    if (!orderLines[orderId]) {
      setIsLoadingLines(prev => ({ ...prev, [orderId]: true }));
      try {
        const response = await fetch(`/api/orders/lines?ejercicioPedido=${order.EjercicioPedido}&seriePedido=${order.SeriePedido}&numeroPedido=${order.NumeroPedido}`);
        if (!response.ok) throw new Error('Error al cargar líneas del pedido');
        const data = await response.json();
        setOrderLines(prev => ({ ...prev, [orderId]: data }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingLines(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  return (
    <>
          <div className="space-y-6">
            {/* Ver Trazabilidad Pedidos Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-lg text-red-700">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Ver Trazabilidad Pedidos</h2>
                    <p className="text-sm text-slate-500">
                      {ordersMode === 'sent' 
                        ? 'Mostrando pedidos enviados (últimos 30 días)' 
                        : ordersMode === 'reservas'
                        ? 'Mostrando reservas y depósitos'
                        : 'Selecciona los pedidos que deseas actualizar (Estado <> 2)'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Ejercicio</label>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 outline-none min-w-[100px]"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    onClick={() => handleLoadPendingOrders('pending')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    disabled={isLoadingPendingOrders}
                  >
                    <RefreshCw size={16} className={isLoadingPendingOrders && ordersMode === 'pending' ? "animate-spin" : ""} />
                    Ver pedidos pendientes
                  </Button>
                  <Button 
                    onClick={() => handleLoadPendingOrders('sent')}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    disabled={isLoadingPendingOrders}
                  >
                    <Send size={16} className={isLoadingPendingOrders && ordersMode === 'sent' ? "animate-spin" : ""} />
                    Ver pedidos enviados
                  </Button>
                  <Button 
                    onClick={() => handleLoadPendingOrders('reservas')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isLoadingPendingOrders}
                  >
                    <Package size={16} className={isLoadingPendingOrders && ordersMode === 'reservas' ? "animate-spin" : ""} />
                    Ver Reservas y Depósitos
                  </Button>
                </div>
              </div>
              
              {showPendingOrders && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Button 
                      onClick={() => handleLoadPendingOrders(ordersMode)} 
                      disabled={isLoadingPendingOrders}
                      className="flex items-center gap-2"
                    >
                      {isLoadingPendingOrders ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Recargar Lista
                    </Button>
                    
                    {ordersMode === 'pending' && (
                      <Button 
                        onClick={handleClearOrders} 
                        disabled={isClearingOrders || selectedOrders.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isClearingOrders ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Quitar de la pantalla pedidos seleccionados
                      </Button>
                    )}
                  </div>

                  {clearOrdersMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${clearOrdersMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {clearOrdersMessage.text}
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 py-2 w-10 text-center">
                              {ordersMode === 'pending' && (
                                <input 
                                  type="checkbox" 
                                  checked={pendingOrders.length > 0 && selectedOrders.length === pendingOrders.length}
                                  onChange={toggleAllOrders}
                                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                />
                              )}
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('Cerrado')}>
                              <div className="flex items-center gap-1">
                                Cerrado
                                {sortConfig?.key === 'Cerrado' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('CodigoCliente')}>
                              <div className="flex items-center gap-1">
                                Cód. Cliente
                                {sortConfig?.key === 'CodigoCliente' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('F.Pedido')}>
                              <div className="flex items-center gap-1">
                                F. Pedido
                                {sortConfig?.key === 'F.Pedido' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('SeriePedido')}>
                              <div className="flex items-center gap-1">
                                Serie
                                {sortConfig?.key === 'SeriePedido' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('NumeroPedido')}>
                              <div className="flex items-center gap-1">
                                Nº
                                {sortConfig?.key === 'NumeroPedido' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('Razon Social')}>
                              <div className="flex items-center gap-1">
                                Razón Social
                                {sortConfig?.key === 'Razon Social' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('Transportista')}>
                              <div className="flex items-center gap-1">
                                Transportista
                                {sortConfig?.key === 'Transportista' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('BultosEnvio')}>
                              <div className="flex items-center gap-1">
                                Bultos
                                {sortConfig?.key === 'BultosEnvio' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                            <th className="px-2 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-100 group" onClick={() => handleSort('CodigoEmpresa')}>
                              <div className="flex items-center gap-1">
                                Empresa
                                {sortConfig?.key === 'CodigoEmpresa' ? (
                                  sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                ) : <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                              </div>
                            </th>
                          </tr>
                          <tr className="bg-slate-100/50 border-b border-slate-200">
                            <th className="px-2 py-2"></th>
                            {Object.keys(pendingOrdersFilters).map((key) => (
                              <th key={key} className="px-2 py-2">
                                <input
                                  type="text"
                                  placeholder="Filtrar..."
                                  value={pendingOrdersFilters[key as keyof typeof pendingOrdersFilters]}
                                  onChange={(e) => setPendingOrdersFilters(prev => ({ ...prev, [key]: e.target.value }))}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-red-500 outline-none"
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isLoadingPendingOrders ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 size={24} className="animate-spin text-red-900 opacity-50" />
                                  <span>Cargando pedidos...</span>
                                </div>
                              </td>
                            </tr>
                          ) : filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                  <CheckCircle2 size={24} className="opacity-50 text-emerald-500" />
                                  <span>No hay pedidos que coincidan con los filtros.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredOrders.map((order, idx) => {
                              const orderId = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}`;
                              const isSelected = selectedOrders.includes(orderId);
                              
                              return (
                                <React.Fragment key={orderId}>
                                  <tr 
                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-red-50/50' : ''}`}
                                    onClick={() => ordersMode === 'pending' && toggleOrderSelection(orderId)}
                                  >
                                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center gap-2">
                                        {ordersMode === 'pending' && (
                                          <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => toggleOrderSelection(orderId)}
                                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                          />
                                        )}
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); toggleOrderLines(order); }}
                                          className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"
                                          title="Ver Lineas"
                                        >
                                          {expandedOrders.includes(orderId) ? <ChevronDown size={16} /> : <Eye size={16} />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${order.Cerrado === 'SI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {order.Cerrado}
                                        </span>
                                        {order.Cerrado === 'NO' && (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleCloseAndPrintSingleOrder(order); }}
                                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                              title="Cerrar y sacar etiqueta"
                                            >
                                              <Printer size={14} />
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleForceClose(order); }}
                                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                              title="Forzar cerrado?"
                                            >
                                              <Lock size={14} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">{order.CodigoCliente}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">
                                      {new Date(order['F.Pedido']).toLocaleDateString()}
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">{order.SeriePedido}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap font-medium text-slate-800">{order.NumeroPedido}</td>
                                    <td className="px-2 py-1.5 text-slate-600 max-w-xs truncate text-xs" title={order['Razon Social']}>{order['Razon Social']}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 text-xs">{order.Transportista || '-'}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 text-xs">{order.BultosEnvio || '-'}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 text-xs">{order.CodigoEmpresa}</td>
                                  </tr>
                                  {expandedOrders.includes(orderId) && (
                                    <tr key={`${orderId}-lines`}>
                                      <td colSpan={10} className="p-0 bg-slate-50/50">
                                        <div className="p-4 border-l-4 border-red-900 ml-4 my-2 bg-white rounded-r-lg shadow-inner">
                                          <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                              <Package size={14} /> Líneas del Pedido {order.NumeroPedido}
                                            </h4>
                                            
                                            {ordersMode === 'sent' && (
                                              <div className="flex gap-2">
                                                <button 
                                                  onClick={() => handleRevertToPending(order)}
                                                  disabled={isLoadingAction[`revert-${orderId}`]}
                                                  className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10px] font-bold transition-colors border border-amber-200 disabled:opacity-50"
                                                  title="Mover pedido de vuelta a la lista de pendientes"
                                                >
                                                  {isLoadingAction[`revert-${orderId}`] ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                  Enviar a pendientes
                                                </button>
                                                
                                                {order.Cerrado === 'SI' && (
                                                  <button 
                                                    onClick={() => handleReopenOrder(order)}
                                                    disabled={isLoadingAction[`reopen-${orderId}`]}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold transition-colors border border-emerald-200 disabled:opacity-50"
                                                    title="Re-abrir pedido cerrado"
                                                  >
                                                    {isLoadingAction[`reopen-${orderId}`] ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                                                    Re-abrir pedido
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {isLoadingLines[orderId] ? (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 p-4">
                                              <Loader2 size={14} className="animate-spin" /> Cargando líneas...
                                            </div>
                                          ) : orderLines[orderId]?.length === 0 ? (
                                            <div className="text-xs text-slate-400 p-4 italic">No hay líneas para este pedido.</div>
                                          ) : (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-100 text-slate-500 font-medium">
                                                  <tr>
                                                    <th className="px-2 py-1">Acciones</th>
                                                    <th className="px-2 py-1">Ord.</th>
                                                    <th className="px-2 py-1">Código</th>
                                                    <th className="px-2 py-1">Artículo</th>
                                                    <th className="px-2 py-1">Precio</th>
                                                    <th className="px-2 py-1">Partida</th>
                                                    <th className="px-2 py-1">U. Pesadas</th>
                                                    <th className="px-2 py-1">P. Pesado</th>
                                                    <th className="px-2 py-1">Estado</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {orderLines[orderId]?.map((line, lIdx) => {
                                                    const lineId = `${orderId}-${line.Codigo}-${line.Orden}`;
                                                    return (
                                                      <React.Fragment key={lineId}>
                                                        <tr className="hover:bg-slate-50">
                                                          <td className="px-2 py-1">
                                                            <button 
                                                              onClick={() => toggleLinePesadas(order, line)}
                                                              className="flex items-center gap-1 text-red-900 hover:text-red-700 font-medium"
                                                            >
                                                              {expandedLines.includes(lineId) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                              Ver Pesadas
                                                            </button>
                                                          </td>
                                                          <td className="px-2 py-1 text-slate-600">{line.Orden}</td>
                                                          <td className="px-2 py-1 text-slate-600 font-medium">{line.Codigo}</td>
                                                          <td className="px-2 py-1 text-slate-600">{line.Articulo}</td>
                                                          <td className="px-2 py-1 text-slate-600 font-medium">{line.Precio?.toFixed(2)}€</td>
                                                          <td className="px-2 py-1 text-slate-600">{line.Partida || '-'}</td>
                                                          <td className="px-2 py-1 text-slate-600 font-bold">{line.UnidadesPesadas || 0}</td>
                                                          <td className="px-2 py-1 text-slate-600 font-bold">{line.Unidades2_Pesadas?.toFixed(2) || 0} kg</td>
                                                          <td className="px-2 py-1">
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${line.Estado === 'Serv.' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                              {line.Estado}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                        {expandedLines.includes(lineId) && (
                                                          <tr key={`${lineId}-pesadas`}>
                                                            <td colSpan={9} className="p-0 bg-red-50/30">
                                                              <div className="p-3 border-l-2 border-red-300 ml-8 my-1 bg-white rounded shadow-sm">
                                                                <div className="flex justify-between items-center mb-2">
                                                                  <h5 className="text-[10px] font-bold text-slate-600">Detalle de Pesadas</h5>
                                                                  {linePesadas[lineId]?.length > 0 && (
                                                                    <button
                                                                      onClick={() => handleOpenCambiarPesadas(order, line)}
                                                                      className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors font-bold flex items-center gap-1"
                                                                    >
                                                                      <RefreshCw size={10} />
                                                                      Cambiar Pesadas a otro pedido
                                                                    </button>
                                                                  )}
                                                                </div>
                                                                {isLoadingLinePesadas[lineId] ? (
                                                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 p-2">
                                                                    <Loader2 size={12} className="animate-spin" /> Cargando pesadas...
                                                                  </div>
                                                                ) : linePesadas[lineId]?.length === 0 ? (
                                                                  <div className="text-[10px] text-slate-400 p-2 italic">No hay pesadas registradas.</div>
                                                                ) : (
                                                                  <table className="w-full text-[10px] text-left">
                                                                    <thead className="text-slate-400 border-b border-slate-100">
                                                                      <tr>
                                                                        <th className="px-2 py-1">Caja</th>
                                                                        <th className="px-2 py-1">Bulto</th>
                                                                        <th className="px-2 py-1">Unid.</th>
                                                                        <th className="px-2 py-1">Peso</th>
                                                                        <th className="px-2 py-1">Partida</th>
                                                                        <th className="px-2 py-1">Serie LC</th>
                                                                        <th className="px-2 py-1">Fecha</th>
                                                                      </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                      {linePesadas[lineId]?.map((p, pIdx) => (
                                                                        <tr key={pIdx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                                                          <td className="px-2 py-1">{p.NumeroCaja}</td>
                                                                          <td className="px-2 py-1">{p.OrdenBulto_}</td>
                                                                          <td className="px-2 py-1 font-medium">{p.Unidades}</td>
                                                                          <td className="px-2 py-1 font-bold">{p.Peso} kg</td>
                                                                          <td className="px-2 py-1">{p.Partida}</td>
                                                                          <td className="px-2 py-1">{p.NumeroSerieLc}</td>
                                                                          <td className="px-2 py-1">{new Date(p.FechaRegistro).toLocaleString()}</td>
                                                                        </tr>
                                                                      ))}
                                                                    </tbody>
                                                                  </table>
                                                                )}
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        )}
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
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
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                        <Database size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Consultas base de datos trazabilidad</h2>
                        <p className="text-sm text-slate-500">Herramienta automatizada para la generación de Documentos Electrónicos de Protección Civil., DEPC significa Documento de Expedición de producto Conforme</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Consultas Disponibles</h3>
                      <div className="flex flex-wrap gap-4">
                        <Button 
                          onClick={() => {
                            setShowPesadasForm(!showPesadasForm);
                            setShowCalicerForm(false);
                            setShowAsiciForm(false);
                          }} 
                          disabled={simpleQueryLoading}
                          className="flex items-center gap-2"
                        >
                          {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                          Consulta Pesadas pedido
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowCalicerForm(!showCalicerForm);
                            setShowPesadasForm(false);
                            setShowAsiciForm(false);
                          }} 
                          disabled={simpleQueryLoading}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                          CONSULTA EXCEL CALICER
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowAsiciForm(!showAsiciForm);
                            setShowPesadasForm(false);
                            setShowCalicerForm(false);
                          }} 
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Database size={16} />
                          Consulta precintos ITACA
                        </Button>
                      </div>

                      {showPesadasForm && (
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <h4 className="text-sm font-bold text-slate-800 mb-3">Parámetros Consulta Pesadas</h4>
                          <form onSubmit={handleRunPesadasQuery} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Ejercicio Pedido</label>
                              <input 
                                type="number" 
                                value={pesadasEjercicio}
                                onChange={(e) => setPesadasEjercicio(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Serie Pedido</label>
                              <input 
                                type="text" 
                                value={pesadasSerie}
                                onChange={(e) => setPesadasSerie(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Número Pedido</label>
                              <input 
                                type="number" 
                                value={pesadasNumero}
                                onChange={(e) => setPesadasNumero(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-sm"
                                required
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                              <Button 
                                type="submit"
                                disabled={simpleQueryLoading}
                                className="flex items-center gap-2"
                              >
                                {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Buscar
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}

                      {showCalicerForm && (
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <h4 className="text-sm font-bold text-slate-800 mb-3">Parámetros Consulta Calicer</h4>
                          <form onSubmit={handleRunCalicerQuery} className="flex items-end gap-4">
                            <div className="flex-1 max-w-xs">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Año (EjercicioPedido)</label>
                              <select 
                                value={calicerYear}
                                onChange={(e) => setCalicerYear(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                              >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 2 - i).map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                            <Button 
                              type="submit"
                              disabled={simpleQueryLoading}
                              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                              Buscar
                            </Button>
                          </form>
                        </div>
                      )}
                      
                      {showAsiciForm && (
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <h4 className="text-sm font-bold text-slate-800 mb-3">Parámetros Consulta ITACA</h4>
                          <form onSubmit={handleRunAsiciQuery} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
                              <select 
                                value={asiciCliente}
                                onChange={(e) => setAsiciCliente(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                required
                              >
                                {ASICI_CLIENTS.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Desde</label>
                              <input 
                                type="date" 
                                value={asiciFechaDesde}
                                onChange={(e) => setAsiciFechaDesde(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Hasta</label>
                              <input 
                                type="date" 
                                value={asiciFechaHasta}
                                onChange={(e) => setAsiciFechaHasta(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                required
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-2">
                              <Button 
                                type="button"
                                onClick={handleGenerateAllAsici}
                                disabled={simpleQueryLoading}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                Generar todos los ficheros
                              </Button>
                              <Button 
                                type="submit"
                                disabled={simpleQueryLoading}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                {simpleQueryLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Buscar
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Results Table */}
                    <div className="border rounded-lg overflow-hidden">
                      {simpleQueryError && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100 flex items-center gap-2">
                          <AlertCircle size={16} /> {simpleQueryError}
                        </div>
                      )}
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                              {simpleQueryData.length > 0 ? (
                                Object.keys(simpleQueryData[0]).map((key) => (
                                  <th key={key} className="px-4 py-3 whitespace-nowrap">{key}</th>
                                ))
                              ) : (
                                <th className="px-4 py-3">Resultados</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {simpleQueryData.length === 0 && !simpleQueryLoading && !simpleQueryError && (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                  <div className="flex flex-col items-center gap-2">
                                    <TableIcon size={24} className="opacity-50" />
                                    <span>No hay resultados para mostrar.</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {simpleQueryLoading && (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 size={24} className="animate-spin text-red-900 opacity-50" />
                                    <span>Ejecutando consulta...</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {simpleQueryData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                {Object.values(row).map((val: any, i) => (
                                  <td key={i} className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                                    {val === null ? '-' : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Export Buttons */}
                    {simpleQueryData.length > 0 && (
                      <div className="mt-4 flex justify-end gap-3">
                        <Button 
                          onClick={handleExportCSV} 
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Download size={16} />
                          Exportar a CSV
                        </Button>
                        <Button 
                          onClick={handleExportExcel} 
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Download size={16} />
                          Exportar a Excel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Widget C: Generador DEPC */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-700 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <FileText size={100} />
                  </div>
                  <div className="p-6 relative z-10">
                    <h3 className="text-xl font-bold mb-4">Generador DEPC</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Pedido (Ej: 2026-PTR26-6)</label>
                        <input 
                          type="text" 
                          value={depcPedido}
                          onChange={(e) => setDepcPedido(e.target.value)}
                          placeholder="2026-PTR26-6"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-sm text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Albarán de Venta</label>
                        <input 
                          type="text" 
                          value={depcAlbaran}
                          onChange={(e) => setDepcAlbaran(e.target.value)}
                          placeholder="Ej: 2.025 3 325140"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-sm text-white placeholder-slate-500"
                        />
                      </div>
                      
                      {depcError && (
                        <div className="p-2 bg-red-900/50 border border-red-800 rounded text-xs text-red-200">
                          {depcError}
                        </div>
                      )}
                      
                      <button 
                        onClick={handleGenerateDEPC}
                        disabled={isGeneratingDEPC || !depcPedido || !depcAlbaran}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-500 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                        {isGeneratingDEPC ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Generar PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Widget D: Corrección Lotes Precintos Rotos */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 p-2 rounded-lg text-amber-700">
                        <RefreshCw size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Corrección Lotes Precintos Rotos</h2>
                        <p className="text-sm text-slate-500">Duplica un precinto de entrada para corregir roturas</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Lote (Partida)</label>
                      <input 
                        type="text" 
                        value={corregirLote}
                        onChange={(e) => setCorregirLote(e.target.value)}
                        placeholder="Ej: 210462"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de pieza</label>
                      <select
                        value={corregirTipo}
                        onChange={(e) => setCorregirTipo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none text-sm bg-white"
                      >
                        <option value="Jamon">Jamón</option>
                        <option value="Paleta">Paleta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nuevo Número de Precinto</label>
                      <input 
                        type="text" 
                        value={corregirPrecinto}
                        onChange={(e) => setCorregirPrecinto(e.target.value)}
                        placeholder="Número de serie LC / Fabricante"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none text-sm"
                      />
                    </div>
                    <button 
                      onClick={handleCorregirPrecinto}
                      disabled={isCorrigiendoPrecinto || !corregirLote || !corregirPrecinto}
                      className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {isCorrigiendoPrecinto ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Corregir Precinto
                    </button>
                    {corregirPrecintoMessage && (
                      <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
                        corregirPrecintoMessage.type === 'success' 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {corregirPrecintoMessage.type === 'success' ? (
                          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        )}
                        <p>{corregirPrecintoMessage.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* Cambiar Pesadas Modal */}
      {showCambiarPesadasModal && cambiarPesadasData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleCambiarPesadasSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-700">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Cambiar Pesadas a otro pedido</h3>
                  <p className="text-xs text-slate-500">Mover pesadas de la línea actual</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCambiarPesadasModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                <p className="text-xs text-slate-500 font-bold mb-1">Origen:</p>
                <p className="text-sm text-slate-800">
                  Pedido: {cambiarPesadasData.ejercicioOrigen}-{cambiarPesadasData.serieOrigen}-{cambiarPesadasData.numeroOrigen} <br/>
                  Artículo: {cambiarPesadasData.codigoArticulo}
                </p>
              </div>
              
              <h4 className="text-sm font-bold text-slate-700 border-b pb-2">Destino</h4>
              
              {cambiarPesadasError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{cambiarPesadasError}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ejercicio</label>
                  <input 
                    type="number" 
                    required 
                    value={cambiarPesadasDestino.ejercicio}
                    onChange={(e) => setCambiarPesadasDestino({...cambiarPesadasDestino, ejercicio: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Serie</label>
                  <input 
                    type="text" 
                    required 
                    value={cambiarPesadasDestino.serie}
                    onChange={(e) => setCambiarPesadasDestino({...cambiarPesadasDestino, serie: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900 text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número</label>
                  <input 
                    type="number" 
                    required 
                    value={cambiarPesadasDestino.numero}
                    onChange={(e) => setCambiarPesadasDestino({...cambiarPesadasDestino, numero: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCambiarPesadasModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isCambiandoPesadas || !cambiarPesadasDestino.ejercicio || !cambiarPesadasDestino.serie || !cambiarPesadasDestino.numero}
                className="px-4 py-2 text-sm font-bold text-white bg-red-900 hover:bg-red-800 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isCambiandoPesadas ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Cambiar Pesadas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Picking Preview Modal */}
      {showPickingPreview && pickingPreviewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Vista Previa de Picking</h3>
                  <p className="text-xs text-slate-500">Fecha: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleGeneratePickingReport}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download size={18} />
                  Descargar PDF
                </Button>
                <button 
                  onClick={() => setShowPickingPreview(false)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full hover:bg-slate-100 border border-slate-200 shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-8 space-y-12">
              {/* Section 1: Enteros */}
              {pickingPreviewData.enteros.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b-2 border-indigo-100 pb-2">
                    <h4 className="text-lg font-bold text-indigo-900 uppercase tracking-tight">Jamones y Paletas Enteros</h4>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {pickingPreviewData.enteros.length} líneas
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Transportista</th>
                          <th className="px-4 py-3">Cód. Artículo</th>
                          <th className="px-4 py-3">Artículo</th>
                          <th className="px-4 py-3 text-center">Cant.</th>
                          <th className="px-4 py-3">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pickingPreviewData.enteros.map((line, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{line['Pedido']}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{line['Cliente']}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{line['Transportista']}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{line['Código Artículo']}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{line['Artículo']}</td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-700">{line['Cantidad (Unidades)']}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 italic">{line['Observaciones']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 2: Resto */}
              {pickingPreviewData.resto.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <h4 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Otros Productos (Deshuesados, Loncheados, Embutidos...)</h4>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {pickingPreviewData.resto.length} líneas
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Transportista</th>
                          <th className="px-4 py-3">Cód. Artículo</th>
                          <th className="px-4 py-3">Artículo</th>
                          <th className="px-4 py-3 text-center">Cant.</th>
                          <th className="px-4 py-3">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pickingPreviewData.resto.map((line, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{line['Pedido']}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{line['Cliente']}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{line['Transportista']}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{line['Código Artículo']}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{line['Artículo']}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">{line['Cantidad (Unidades)']}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 italic">{line['Observaciones']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="text-sm text-slate-500">
                Total líneas: <span className="font-bold text-slate-800">{pickingPreviewData.enteros.length + pickingPreviewData.resto.length}</span>
              </div>
              <Button onClick={() => setShowPickingPreview(false)}>Cerrar Vista Previa</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
