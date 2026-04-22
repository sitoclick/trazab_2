import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Search, FileText, Download, Mail, CheckCircle, 
  Clock, AlertCircle, ChevronDown, ChevronUp, 
  ExternalLink, FileEdit, RefreshCw, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, Play, Printer,
  Trash2, X, Send, Database, MessageSquare, Plus,
  FileSpreadsheet, Settings, Box, Truck
} from 'lucide-react';
import { Button } from '../../shared/components/Button';
import PedidosOnline from '../online-orders/PedidosOnline';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';

import { ArrowRightLeft, Loader2, CheckCircle2, Terminal, Bot, Eye } from 'lucide-react';
import { CALICER_LOGO, FIRMA_LOGO } from '../../../assets/images';

const ASICI_CLIENTS = [
  { id: 'A00234567', name: 'Deshuesado en fábrica' },
  { id: 'A01234567', name: 'Loncheado en fábrica' },
  { id: 'B75954792', name: 'MARLON' },
  { id: 'B37310604', name: 'Bernardino Perez' },
  { id: 'B34102012', name: 'Ind. Carnicas Peñafria' },
  { id: 'B37350725', name: 'Jamoneria de la Cruz' },
  { id: 'B37516804', name: 'Jamoneria de la Cruz 2' },
  { id: 'B37568516', name: 'Jamoneria de la Cruz 3' },
  { id: 'B10468940', name: 'Jamoneria de la Cruz 4' },
  { id: 'B37392685', name: 'Jamoneria de la Cruz 5' },
  { id: 'B10492809', name: 'Jamoneria de la Cruz 6' },
  { id: 'B10492817', name: 'Jamoneria de la Cruz 7' },
  { id: 'B10492825', name: 'Jamoneria de la Cruz 8' },
  { id: 'B10492833', name: 'Jamoneria de la Cruz 9' },
  { id: 'B10492841', name: 'Jamoneria de la Cruz 10' },
  { id: 'B10492858', name: 'Jamoneria de la Cruz 11' },
  { id: 'B10492866', name: 'Jamoneria de la Cruz 12' },
  { id: 'B10492874', name: 'Jamoneria de la Cruz 13' },
  { id: 'B10492882', name: 'Jamoneria de la Cruz 14' },
  { id: 'B10492890', name: 'Jamoneria de la Cruz 15' },
  { id: 'B10492908', name: 'Jamoneria de la Cruz 16' }
];

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface OperationsProps {
  user: any;
  setConfirmDialog: (dialog: {isOpen: boolean, message: string, onConfirm: () => void}) => void;
}


const ConsoleLine = ({ log, key }: { log: any, key?: any }) => (
  <div className={`text-xs font-mono ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
    {'>'} {log.message}
  </div>
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
export default function Operations({ user, setConfirmDialog }: OperationsProps) {


  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [syncLogs, setSyncLogs] = useState<any[]>([]);

  const handleSync = async () => {
    if (syncStatus === 'running') return;
    setSyncStatus('running');
    setSyncLogs([{ type: 'info', message: 'Iniciando sincronización con Holded...' }]);
    
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSyncLogs(prev => [...prev, { type: 'success', message: 'Sincronización completada correctamente.' }]);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      setSyncLogs(prev => [...prev, { type: 'error', message: 'Error en la sincronización.' }]);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };
  const [isPedidosHoldedOpen, setIsPedidosHoldedOpen] = useState(true);
  const [isPedidosOnlineOpen, setIsPedidosOnlineOpen] = useState(true);

const [errorQueryInput, setErrorQueryInput] = useState('');
const [errorChat, setErrorChat] = useState<{sender: 'user'|'bot', text: string}[]>([]);
const [isErrorChatLoading, setIsErrorChatLoading] = useState(false);
const errorChatEndRef = useRef<HTMLDivElement>(null);
const [simpleQueryData, setSimpleQueryData] = useState<any[]>([]);
const [simpleQueryLoading, setSimpleQueryLoading] = useState(false);
const [simpleQueryError, setSimpleQueryError] = useState<string | null>(null);
const [depcPedido, setDepcPedido] = useState('');
const [depcAlbaran, setDepcAlbaran] = useState('');
const [isGeneratingDEPC, setIsGeneratingDEPC] = useState(false);
const [depcError, setDepcError] = useState<string | null>(null);
const [corregirLote, setCorregirLote] = useState('');
const [corregirTipo, setCorregirTipo] = useState('Jamon');
const [corregirPrecinto, setCorregirPrecinto] = useState('');
const [isCorrigiendoPrecinto, setIsCorrigiendoPrecinto] = useState(false);
const [corregirPrecintoMessage, setCorregirPrecintoMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
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
    contactName: '',
    docNumber: '',
    status: 'all'
  });
const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
const [orderLines, setOrderLines] = useState<Record<string, any[]>>({});
const [isLoadingLines, setIsLoadingLines] = useState<Record<string, boolean>>({});
const [expandedLines, setExpandedLines] = useState<string[]>([]);
const [linePesadas, setLinePesadas] = useState<Record<string, any[]>>({});
const [isLoadingLinePesadas, setIsLoadingLinePesadas] = useState<Record<string, boolean>>({});
const [showAsiciForm, setShowAsiciForm] = useState(false);
const [asiciCliente, setAsiciCliente] = useState('B75954792');
const [asiciFechaDesde, setAsiciFechaDesde] = useState('2026-01-03');
const [asiciFechaHasta, setAsiciFechaHasta] = useState('2026-01-20');
const [showCalicerForm, setShowCalicerForm] = useState(false);
const [calicerYear, setCalicerYear] = useState('2026');
const [showPesadasForm, setShowPesadasForm] = useState(false);
const [pesadasEjercicio, setPesadasEjercicio] = useState('2026');
const [pesadasSerie, setPesadasSerie] = useState('ATR26');
const [pesadasNumero, setPesadasNumero] = useState('3');

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(order => {
      const matchContact = (order.RazonSocial || '').toLowerCase().includes(pendingOrdersFilters.contactName.toLowerCase());
      const matchDoc = (order.NumeroPedido?.toString() || '').toLowerCase().includes(pendingOrdersFilters.docNumber.toLowerCase());
      return matchContact && matchDoc;
    });
  }, [pendingOrders, pendingOrdersFilters]);


  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null; // Cycle: asc -> desc -> none
      }
      return { key, direction: 'asc' };
    });
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
        setIsLoadingLines(prev => ({ ...prev, [`revert-${orderId}`]: true }));
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
          setIsLoadingLines(prev => ({ ...prev, [`revert-${orderId}`]: false }));
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
        setIsLoadingLines(prev => ({ ...prev, [`reopen-${orderId}`]: true }));
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
          setIsLoadingLines(prev => ({ ...prev, [`reopen-${orderId}`]: false }));
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
        console.error("Load Order Lines Error:", error);
      } finally {
        setIsLoadingLines(prev => ({ ...prev, [orderId]: false }));
      }
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


const handleErrorQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorQueryInput.trim() || isErrorChatLoading) return;
    
    const orderNum = errorQueryInput.trim();
    setErrorChat(prev => [...prev, { sender: 'user', text: `Consultar pedido: ${orderNum}` }]);
    setErrorQueryInput('');
    setIsErrorChatLoading(true);
    
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNum })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en la consulta');
      }

      if (!data.logs) {
        setErrorChat(prev => [...prev, { sender: 'bot', text: data.message }]);
        return;
      }
      
      const prompt = `
        Eres un asistente técnico experto en interpretar logs de sincronización ERP.
        El usuario está consultando el estado del pedido/documento: "${orderNum}".
        
        Aquí tienes las líneas del log correspondientes a este pedido (en formato CSV, donde la columna B suele ser el documento):
        
        ${data.logs}
        
        Analiza qué ha pasado con este pedido. 
        - Si ha fallado, explica claramente el motivo del error basándote en los detalles del log.
        - Si se ha procesado correctamente, confírmalo.
        - Si hay múltiples intentos, resume la historia brevemente (ej. "Falló primero por X, pero luego se sincronizó correctamente").
        
        Responde de forma directa, concisa y amigable, como en un chat. No uses formato markdown complejo, solo texto claro y directo.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setErrorChat(prev => [...prev, { sender: 'bot', text: result.text?.trim() || 'No pude analizar los logs.' }]);
    } catch (err: any) {
      setErrorChat(prev => [...prev, { sender: 'bot', text: 'Error al consultar los logs. Asegúrate de que el documento sea público o inténtalo más tarde.' }]);
    } finally {
      setIsErrorChatLoading(false);
    }
  };

  // --- Handlers ---



  return (
    <>
      <div className="space-y-6">
            
            {/* Collapsible Section 1: Pedidos Holded */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setIsPedidosHoldedOpen(!isPedidosHoldedOpen)}
                className="w-full p-6 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-slate-800">Pedidos Holded</h2>
                    <p className="text-sm text-slate-500">Sincronizador ERP y Consulta de Errores</p>
                  </div>
                </div>
                {isPedidosHoldedOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
              </button>
              
              {isPedidosHoldedOpen && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white">
                  {/* Widget A: Sincronizador */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-700">
                          <ArrowRightLeft size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Sincronizador ERP</h3>
                          <p className="text-xs text-slate-500">Holded <span className="mx-1 text-slate-300">&rarr;</span> Sage Integrator</p>
                        </div>
                      </div>
                      <div>
                        {syncStatus === 'idle' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">En Espera</span>}
                        {syncStatus === 'running' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Ejecutando</span>}
                        {syncStatus === 'success' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1"><CheckCircle2 size={12}/> Completado</span>}
                        {syncStatus === 'error' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100 flex items-center gap-1"><AlertCircle size={12}/> Error</span>}
                      </div>
                    </div>
                    
                    <div className="p-6 bg-slate-50/50">
                      {/* Console Window */}
                      <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex flex-col h-80 mb-4">
                        {/* Console Header */}
                        <div className="bg-slate-950 px-4 py-2 grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800">
                          <div className="col-span-2">Fecha</div>
                          <div className="col-span-2">Documento</div>
                          <div className="col-span-2">Acción</div>
                          <div className="col-span-6">Detalles</div>
                        </div>
                        
                        {/* Console Body */}
                        <div className="flex-grow overflow-y-auto terminal-scroll p-2">
                          {syncLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-60">
                              <Terminal size={32} />
                              <span className="text-sm font-mono">Conectando a servidor de logs...</span>
                            </div>
                          ) : (
                            syncLogs.map((log, i) => <ConsoleLine key={i} log={log} />)
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={handleSync} 
                          disabled={syncStatus === 'running'}
                          className="w-full sm:w-auto"
                        >
                          {syncStatus === 'running' ? 'Sincronizando...' : 'Lanzar Sincronización'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Widget C: Consulta de Errores */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[480px]">
                    <div className="p-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50">
                      <div className="bg-red-50 p-2 rounded-lg text-red-700">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 className="text-md font-bold text-slate-800">Consulta de Errores</h3>
                        <p className="text-xs text-slate-500">Análisis inteligente de logs</p>
                      </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                      {errorChat.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center px-4">
                          <Bot size={32} className="mb-2 opacity-50" />
                          <p>Introduce un número de pedido para analizar su estado en los logs.</p>
                        </div>
                      ) : (
                        errorChat.map((msg, i) => (
                          <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                              msg.sender === 'user' 
                                ? 'bg-slate-800 text-white rounded-br-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                      {isErrorChatLoading && (
                        <div className="flex items-start">
                           <div className="bg-white border border-slate-200 rounded-xl rounded-bl-none px-3 py-2 shadow-sm flex gap-1">
                             <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                             <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                             <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                           </div>
                        </div>
                      )}
                      <div ref={errorChatEndRef} />
                    </div>
                    
                    <form onSubmit={handleErrorQuerySubmit} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                      <input 
                        type="text" 
                        value={errorQueryInput}
                        onChange={(e) => setErrorQueryInput(e.target.value)}
                        placeholder="Nº de pedido (ej: PED-123)"
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900/20"
                      />
                      <Button type="submit" disabled={!errorQueryInput.trim() || isErrorChatLoading} className="px-3">
                        <Send size={16} />
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section: Informes y Picking */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setIsPickingSectionOpen(!isPickingSectionOpen)}
                className="w-full p-6 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-700 shadow-sm">
                    <FileText size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-slate-800">Informes y Picking</h2>
                    <p className="text-sm text-slate-500">Generación de informes para preparación de pedidos</p>
                  </div>
                </div>
                {isPickingSectionOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
              </button>
              
              {isPickingSectionOpen && (
                <div className="p-6 bg-white">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button 
                      onClick={() => handleLoadPendingOrders('pending')} 
                      disabled={isLoadingPendingOrders}
                      className="flex items-center gap-2"
                    >
                      {isLoadingPendingOrders ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Cargar Pedidos
                    </Button>
                    <Button 
                      onClick={handleSelectPendingNoPesadas}
                      disabled={pendingOrders.length === 0}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      <CheckCircle2 size={16} />
                      Seleccionar Pendientes (Sin pesadas)
                    </Button>
                    <Button 
                      onClick={handleGeneratePickingReport}
                      disabled={selectedOrders.length === 0 || isPickingReportLoading}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isPickingReportLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      Generar Picking
                    </Button>
                    <Button 
                      onClick={handleViewPicking}
                      disabled={selectedOrders.length === 0 || isPickingReportLoading}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye size={16} />
                      Ver Picking
                    </Button>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-4">
                    {selectedOrders.length} pedidos seleccionados de {pendingOrders.length} disponibles.
                  </div>
                  
                  {/* Simple table to show loaded orders */}
                  {pendingOrders.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input 
                                type="checkbox" 
                                checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                                onChange={() => {
                                  if (selectedOrders.length === pendingOrders.length) {
                                    setSelectedOrders([]);
                                  } else {
                                    setSelectedOrders(pendingOrders.map(o => `${o.CodigoEmpresa}-${o.EjercicioPedido}-${o.SeriePedido}-${o.NumeroPedido}`));
                                  }
                                }}
                                className="rounded border-slate-300 text-slate-800 focus:ring-slate-800"
                              />
                            </th>
                            <th className="px-4 py-3">Pedido</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span>Cliente</span>
                                <input
                                  type="text"
                                  placeholder="Filtrar..."
                                  value={pendingOrdersFilters['Razon Social']}
                                  onChange={(e) => setPendingOrdersFilters(prev => ({ ...prev, 'Razon Social': e.target.value }))}
                                  className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded focus:ring-1 focus:ring-red-500 outline-none font-normal normal-case"
                                />
                              </div>
                            </th>
                            <th className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span>Transportista</span>
                                <input
                                  type="text"
                                  placeholder="Filtrar..."
                                  value={pendingOrdersFilters.Transportista}
                                  onChange={(e) => setPendingOrdersFilters(prev => ({ ...prev, Transportista: e.target.value }))}
                                  className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded focus:ring-1 focus:ring-red-500 outline-none font-normal normal-case"
                                />
                              </div>
                            </th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order, idx) => {
                            const id = `${order.CodigoEmpresa}-${order.EjercicioPedido}-${order.SeriePedido}-${order.NumeroPedido}`;
                            const isSelected = selectedOrders.includes(id);
                            const isExpanded = expandedOrders.includes(id);
                            return (
                              <React.Fragment key={idx}>
                                <tr className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          setSelectedOrders(selectedOrders.filter(o => o !== id));
                                        } else {
                                          setSelectedOrders([...selectedOrders, id]);
                                        }
                                      }}
                                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-800"
                                    />
                                  </td>
                                  <td className="px-4 py-3 font-medium">{order.SeriePedido}-{order.NumeroPedido}/{order.EjercicioPedido}</td>
                                  <td className="px-4 py-3">{new Date(order['F.Pedido']).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">{order['Razon Social']}</td>
                                  <td className="px-4 py-3 text-xs text-slate-500">{order.Transportista || '-'}</td>
                                  <td className="px-4 py-3">
                                    {order.Estado === 0 ? (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pendiente</span>
                                    ) : order.Estado === 1 ? (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Parcial</span>
                                    ) : (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Servido</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button 
                                      onClick={() => toggleOrderLines(order)}
                                      className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"
                                      title="Ver Lineas"
                                    >
                                      {isExpanded ? <ChevronDown size={16} /> : <Eye size={16} />}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan={6} className="px-8 py-4">
                                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                            <tr>
                                              <th className="px-4 py-2">Artículo</th>
                                              <th className="px-4 py-2 text-right">Cant.</th>
                                              <th className="px-4 py-2 text-right">Precio</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {isLoadingLines[id] ? (
                                              <tr>
                                                <td colSpan={3} className="px-4 py-4 text-center">
                                                  <Loader2 size={16} className="animate-spin inline mr-2" />
                                                  Cargando líneas...
                                                </td>
                                              </tr>
                                            ) : orderLines[id]?.length > 0 ? (
                                              orderLines[id].map((line: any, lIdx: number) => (
                                                <tr key={lIdx} className="hover:bg-slate-50">
                                                  <td className="px-4 py-2">
                                                    <div className="font-medium text-slate-800">{line.Articulo}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{line.Codigo}</div>
                                                  </td>
                                                  <td className="px-4 py-2 text-right font-bold text-slate-700">
                                                    {line.UnidadesPedidas}
                                                  </td>
                                                  <td className="px-4 py-2 text-right text-slate-600">
                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(line.Precio)}
                                                  </td>
                                                </tr>
                                              ))
                                            ) : (
                                              <tr>
                                                <td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">
                                                  No hay líneas para este pedido.
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
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
              )}
            </div>

            {/* Collapsible Section 2: Pedidos Online */}
            <PedidosOnline 
              isOpen={isPedidosOnlineOpen} 
              onToggle={() => setIsPedidosOnlineOpen(!isPedidosOnlineOpen)} 
              activeTab={'operations'} 
            />
          </div>

    </>
  );
}
