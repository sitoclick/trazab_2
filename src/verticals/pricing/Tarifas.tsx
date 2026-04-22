import React, { useState, useEffect } from 'react';
import { 
  Tag, Search, Plus, ChevronUp, ChevronDown, Edit, Trash2, 
  ChevronRight, Download, FileText, Calculator, AlertCircle, 
  Loader2, X, Edit2, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TarifasProps {
  user: any;
  holdedProducts: any[];
  handleLoadHoldedProducts: () => Promise<void>;
}

export default function Tarifas({ user, holdedProducts, handleLoadHoldedProducts }: TarifasProps) {
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [preciosTarifas, setPreciosTarifas] = useState<any[]>([]);
  const [editingTarifa, setEditingTarifa] = useState<any | null>(null);
  const [showTarifaModal, setShowTarifaModal] = useState(false);
  const [expandedTarifaId, setExpandedTarifaId] = useState<number | null>(null);
  const [isTarifasLoading, setIsTarifasLoading] = useState(false);
  const [tarifaSearch, setTarifaSearch] = useState('');
  const [tarifaSortBy, setTarifaSortBy] = useState<'name' | 'active'>('name');
  const [tarifaSortOrder, setTarifaSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPriceToEdit, setSelectedPriceToEdit] = useState<any | null>(null);
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);

  const isAdminOrAlicia = user?.role === 'Admin' || user?.name === 'Alicia';

  const handleLoadTarifas = async () => {
    setIsTarifasLoading(true);
    try {
      const res = await fetch('/api/tarifas');
      if (res.ok) {
        const data = await res.json();
        setTarifas(data);
      }
    } catch (err) {
      console.error('Error loading tarifas:', err);
    } finally {
      setIsTarifasLoading(false);
    }
  };

  const handleLoadPreciosTarifa = async () => {
    try {
      const res = await fetch('/api/precios-tarifa');
      if (res.ok) {
        const data = await res.json();
        setPreciosTarifas(data);
      }
    } catch (err) {
      console.error('Error loading precios tarifa:', err);
    }
  };

  const handleSaveTarifa = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      active: formData.get('active') === 'on' ? 1 : 0
    };

    try {
      if (editingTarifa) {
        await fetch(`/api/tarifas/${editingTarifa.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        await fetch('/api/tarifas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      setShowTarifaModal(false);
      setEditingTarifa(null);
      handleLoadTarifas();
    } catch (err) {
      console.error('Error saving tarifa:', err);
    }
  };

  const handleDeleteTarifa = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarifa?')) return;
    try {
      const res = await fetch(`/api/tarifas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTarifas(tarifas.filter(t => t.id !== id));
        if (expandedTarifaId === id) {
          setExpandedTarifaId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting tarifa:', err);
    }
  };

  const handleDeletePrecioTarifa = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este precio?')) return;
    try {
      const res = await fetch(`/api/precios-tarifa/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPreciosTarifas(preciosTarifas.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting precio tarifa:', err);
    }
  };

  const updatePvpTarifaPrices = async (tarifaId: number) => {
    if (!confirm('¿Estás seguro de que quieres actualizar los precios de esta tarifa con los precios base de Holded?')) return;
    
    try {
      const tarifaProducts = preciosTarifas.filter(pr => pr.tarifaId === tarifaId);
      let updatedCount = 0;

      for (const pr of tarifaProducts) {
        const p = holdedProducts.find(hp => hp.id === pr.productId || hp.sku === pr.productId);
        if (p && p.price !== undefined && p.price !== pr.precio) {
          await fetch(`/api/precios-tarifa/${pr.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tarifaId: pr.tarifaId,
              productId: pr.productId,
              precio: p.price
            })
          });
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        await handleLoadPreciosTarifa();
        alert(`Se han actualizado ${updatedCount} precios.`);
      } else {
        alert('Todos los precios ya están actualizados.');
      }
    } catch (err) {
      console.error('Error updating PVP prices:', err);
      alert('Error al actualizar los precios.');
    }
  };

  const exportTarifaToExcel = (tarifaId: number, tarifaName: string) => {
    const tarifaProducts = preciosTarifas.filter(pr => pr.tarifaId === tarifaId);
    const data = tarifaProducts.map(pr => {
      const p = holdedProducts.find(hp => hp.id === pr.productId || hp.sku === pr.productId);
      return {
        'SKU': pr.productId,
        'Producto': p ? p.name : 'Producto Desconocido',
        'Precio Tarifa': pr.precio
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tarifa');
    XLSX.writeFile(wb, `Tarifa_${tarifaName}.xlsx`);
  };

  const categoriesOrder = ['JAMONES', 'PALETAS', 'DESHUESADOS', 'EMBUTIDOS', 'PIEZAS UNITARIAS €/Ud.', 'OTROS'];

  const getCategory = (name: string, sku: string = '') => {
    const lowerName = name.toLowerCase();
    const upperName = name.toUpperCase();
    const upperSku = sku ? sku.toUpperCase() : '';
    
    if (upperSku.startsWith('U-') || upperName.startsWith('U-')) return 'OTROS';
    if (upperSku.includes('-DESH') || upperName.includes('-DESH') || lowerName.includes('deshuesado') || lowerName.includes('centro')) return 'DESHUESADOS';
    if (upperSku.startsWith('P-JAM') || upperName.startsWith('P-JAM') || lowerName.includes('jamón') || lowerName.includes('jamon')) return 'JAMONES';
    if (upperSku.startsWith('P-PAL') || upperName.startsWith('P-PAL') || lowerName.includes('paleta')) return 'PALETAS';
    if (lowerName.includes('pieza') || lowerName.includes('200g') || lowerName.includes('250g')) return 'PIEZAS UNITARIAS €/Ud.';
    if (upperSku.startsWith('P-EM') || upperName.startsWith('P-EM') || lowerName.includes('lomo') || lowerName.includes('lomito') || lowerName.includes('coppa') || lowerName.includes('salchichón') || lowerName.includes('salchichon') || lowerName.includes('chorizo') || lowerName.includes('vela') || lowerName.includes('longaniza') || lowerName.includes('solomillo')) return 'EMBUTIDOS';
    
    if (upperSku.startsWith('P-') || upperName.startsWith('P-')) return 'EMBUTIDOS';
    
    return 'OTROS';
  };

  const getProductWeight = (name: string, category: string) => {
    const lower = name.toLowerCase();
    if (category === 'JAMONES' || category === 'PALETAS' || category === 'DESHUESADOS') {
      let typeWeight = 0;
      if (lower.includes('jamón') || lower.includes('jamon')) typeWeight = 10;
      else if (lower.includes('paleta')) typeWeight = 20;

      let qualityWeight = 5;
      if (lower.includes('100%') || lower.includes('negro')) qualityWeight = 1;
      else if (lower.includes('bellota') || lower.includes('rojo')) qualityWeight = 2;
      else if (lower.includes('cebo de campo') || lower.includes('verde')) qualityWeight = 3;
      else if (lower.includes('cebo') || lower.includes('blanco')) qualityWeight = 4;

      return typeWeight + qualityWeight;
    } else if (category === 'EMBUTIDOS') {
      if (lower.includes('roscal')) return 1;
      if (lower.includes('lomo') && lower.includes('100%')) return 2;
      if (lower.includes('lomo') && lower.includes('bellota')) return 3;
      if (lower.includes('lomo') && lower.includes('cebo')) return 4;
      if (lower.includes('lomito')) return 5;
      if (lower.includes('coppa')) return 6;
      if (lower.includes('salchichón') && lower.includes('cular')) return 7;
      if (lower.includes('chorizo') && lower.includes('cular')) return 8;
      if (lower.includes('vela')) return 9;
      if (lower.includes('longaniza')) return 10;
      if (lower.includes('solomillo')) return 11;
      return 20;
    } else if (category === 'PIEZAS UNITARIAS €/Ud.') {
      if (lower.includes('chorizo') || lower.includes('salchichón')) return 1;
      if (lower.includes('longaniza')) return 2;
      return 3;
    }
    return 100;
  };

  const exportTarifaToPDF = async (tarifaId: number, tarifaName: string) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Find PVP tarifa to calculate discounts
    const pvpTarifa = tarifas.find(t => t.name.toUpperCase().includes('PVP'));
    const pvpTarifaId = pvpTarifa ? pvpTarifa.id : null;

    const tarifaProducts = preciosTarifas.filter(pr => pr.tarifaId === tarifaId);
    
    const groupedData: Record<string, any[]> = {};
    categoriesOrder.forEach(c => groupedData[c] = []);

    tarifaProducts.forEach(pr => {
      const p = holdedProducts.find(hp => hp.id === pr.productId || hp.sku === pr.productId);
      if (!p) return;

      let pvpPrice = p.price;
      if (pvpTarifaId) {
        const pvpPr = preciosTarifas.find(pt => pt.tarifaId === pvpTarifaId && pt.productId === pr.productId);
        if (pvpPr) pvpPrice = pvpPr.precio;
      }

      const finalPrice = pr.precio;
      let finalPriceText = finalPrice.toFixed(2);
      let pvpText = pvpPrice.toFixed(2);

      if (finalPrice === 0) {
        finalPriceText = 'SIN STOCK';
        pvpText = '';
      }

      const category = getCategory(p.name, p.sku);

      let loncheado = '';
      if (category === 'JAMONES') loncheado = '7,00';
      else if (category === 'PALETAS') loncheado = '8,00';

      groupedData[category].push({
        name: p.name,
        desc: p.desc || '',
        pvp: pvpText,
        final: finalPriceText,
        loncheado,
        weight: getProductWeight(p.name, category),
        originalIndex: holdedProducts.findIndex(hp => hp.id === p.id)
      });
    });

    // Add Logo
    try {
      const logoUrl = "https://doniberico.net/cdn/shop/files/logodi.png?v=1769436193&width=100";
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = logoUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        doc.addImage(dataUrl, 'PNG', 450, 20, 100, 100);
      }
    } catch (error) {
      console.warn("Could not load logo for PDF", error);
      // Fallback to text if image fails
      doc.setFillColor(150, 0, 0); // Dark red
      doc.rect(450, 20, 100, 100, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'italic');
      doc.text('Don', 480, 60);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('Ibérico', 465, 85);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('ARTESANOS DEL', 475, 100);
      doc.text('CERDO IBÉRICO, S.L.', 468, 110);
    }

    doc.setTextColor(0, 0, 0);

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TARIFA OFICIAL DON IBÉRICO ARTESANOS DEL CERDO IBÉRICO, S. L. ${new Date().getFullYear()}`, 40, 150);
    doc.setFontSize(10);
    doc.text(`Tarifa Aplicada: ${tarifaName}`, 40, 165);

    const tableBody: any[] = [];
    categoriesOrder.forEach(cat => {
      if (groupedData[cat].length > 0) {
        // Sort by weight, then by original index
        groupedData[cat].sort((a, b) => {
          if (a.weight !== b.weight) return a.weight - b.weight;
          return a.originalIndex - b.originalIndex;
        });

        tableBody.push([{ 
          content: cat, 
          colSpan: 4, 
          isCategoryHeader: true,
          styles: { halign: 'center', fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0,0,0], lineWidth: 1, lineColor: [0,0,0] } 
        }]);
        groupedData[cat].forEach(item => {
          tableBody.push([
            { content: item.name, styles: { fontStyle: 'bold' } },
            { content: item.pvp, styles: { halign: 'center' } },
            { content: item.final, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: item.loncheado, styles: { halign: 'center' } }
          ]);
          if (item.desc) {
            tableBody.push([
              { content: item.desc, colSpan: 4, styles: { fontSize: 6, textColor: [100, 100, 100], cellPadding: { top: 0, bottom: 2, left: 3, right: 3 } } }
            ]);
          }
        });
      }
    });

    autoTable(doc, {
      head: [[
        'DENOMINACIÓN DE VENTA', 
        'Tarifa Venta al Público', 
        'Tarifa Personalizada', 
        '€/Kg. Loncheado\na Cuchillo 80g.'
      ]],
      body: tableBody,
      startY: 180,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        lineWidth: 1, 
        lineColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 200 },
        1: { cellWidth: 100 },
        2: { cellWidth: 100 },
        3: { cellWidth: 100 }
      },
      didParseCell: function(data) {
        // Add borders to all cells
        data.cell.styles.lineWidth = 0;
        if (data.section === 'body' && data.row.raw[0] && typeof data.row.raw[0] === 'object' && (data.row.raw[0] as any).isCategoryHeader) {
          // It's a category header
          data.cell.styles.lineWidth = 1;
          data.cell.styles.lineColor = [0,0,0];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const legalText = `Para asegurar el correcto cumplimiento de la norma del ibérico (Real Decreto 4/2014), las DENOMINACIONES DE VENTA deberán respetarse íntegramente.
Estos precios se verán incrementados con su IVA Correspondiente.
Portes pagados en pedidos superiores a 30 Kg. (Envíos Peninsulares). Se aplicará un coste de +1€/Kg. en envío inferiores a 30 Kgs.
Se aplicará un coste de +0,50€/Kg. en las referencias que sean solicitadas en mitades.
El coste del loncheado a cuchillo se incorporará al precio €/Kg. del producto solicitado.
Don Ibérico se reserva el derecho de actualizar dichos precios siempre debido a una causa de fuerza mayor
Envios fuera de la Península o internacionales por cuenta del cliente`;

    const splitLegalText = doc.splitTextToSize(legalText, 515);
    doc.text(splitLegalText, 40, finalY);

    doc.save(`Tarifa_${tarifaName.replace(/\s+/g, '_')}.pdf`);
  };

  const importTarifaFromExcel = (e: React.ChangeEvent<HTMLInputElement>, tarifaId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const preciosToUpdate = data.map((row: any) => ({
        tarifaId,
        productId: row['SKU'],
        precio: parseFloat(row['Precio Tarifa'])
      })).filter(p => p.productId && !isNaN(p.precio));

      if (preciosToUpdate.length > 0) {
        try {
          const res = await fetch('/api/precios-tarifa/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ precios: preciosToUpdate })
          });
          if (res.ok) {
            handleLoadPreciosTarifa();
            console.log('Tarifa importada correctamente');
          }
        } catch (err) {
          console.error('Error importing tarifa:', err);
          console.error('Error al importar la tarifa');
        }
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  useEffect(() => {
    handleLoadTarifas();
    handleLoadPreciosTarifa();
    handleLoadHoldedProducts();
  }, []);

  const filteredTarifas = tarifas.filter(t => 
    t.name.toLowerCase().includes(tarifaSearch.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(tarifaSearch.toLowerCase()))
  ).sort((a, b) => {
    if (tarifaSortBy === 'name') {
      return tarifaSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else {
      return tarifaSortOrder === 'asc' ? a.active - b.active : b.active - a.active;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-red-900 p-3 rounded-xl text-white shadow-lg shadow-red-900/20">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tarifas</h1>
            <p className="text-slate-500">Gestión de tarifas y precios de productos</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Tag size={18} className="text-red-900" />
              Gestión de Tarifas
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar tarifa..." 
                  value={tarifaSearch}
                  onChange={(e) => setTarifaSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900 w-64"
                />
              </div>
              {isAdminOrAlicia && (
                <button 
                  onClick={() => {
                    setEditingTarifa(null);
                    setShowTarifaModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg text-sm font-bold hover:bg-red-800 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Nueva Tarifa
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => { setTarifaSortBy('name'); setTarifaSortOrder(tarifaSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1">Nombre {tarifaSortBy === 'name' && (tarifaSortOrder === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => { setTarifaSortBy('active'); setTarifaSortOrder(tarifaSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1">Estado {tarifaSortBy === 'active' && (tarifaSortOrder === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
                  </th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isTarifasLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-red-900" /></td></tr>
                ) : filteredTarifas.map(t => (
                  <React.Fragment key={t.id}>
                    <tr className={`hover:bg-slate-50 transition-colors ${expandedTarifaId === t.id ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600">{t.description || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                          {t.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setExpandedTarifaId(expandedTarifaId === t.id ? null : t.id)} className="p-1.5 text-slate-400 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors" title="Ver Precios">
                            {expandedTarifaId === t.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                          {isAdminOrAlicia && (
                            <>
                              <button onClick={() => { setEditingTarifa(t); setShowTarifaModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Tarifa">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => handleDeleteTarifa(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Tarifa">
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedTarifaId === t.id && (
                      <tr>
                        <td colSpan={4} className="p-0 border-b border-slate-200">
                          <div className="bg-slate-50 p-6 shadow-inner">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                  <Calculator size={16} className="text-red-900" />
                                  Precios de {t.name}
                                </h4>
                                <div className="flex gap-2">
                                  <button onClick={() => exportTarifaToExcel(t.id, t.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                                    <Download size={14} /> Excel
                                  </button>
                                  <button onClick={() => exportTarifaToPDF(t.id, t.name)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                                    <FileText size={14} /> PDF
                                  </button>
                                  {isAdminOrAlicia && (
                                    <>
                                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer">
                                        <Upload size={14} /> Importar Excel
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => importTarifaFromExcel(e, t.id)} />
                                      </label>
                                      {t.name.toUpperCase().includes('PVP') && (
                                        <button onClick={() => updatePvpTarifaPrices(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">
                                          <Calculator size={14} /> Actualizar desde Holded
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                                    <tr className="text-slate-500 font-medium border-b border-slate-100">
                                      <th className="px-4 py-2">SKU</th>
                                      <th className="px-4 py-2">Producto</th>
                                      <th className="px-4 py-2 text-right">Precio Tarifa</th>
                                      <th className="px-4 py-2 text-center">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {(() => {
                                      const tarifaProducts = preciosTarifas.filter(pr => pr.tarifaId === t.id);
                                      const productsWithPrices = tarifaProducts.map(pr => {
                                        const p = holdedProducts.find(hp => hp.id === pr.productId || hp.sku === pr.productId);
                                        return p ? { ...p, prId: pr.id, precioTarifa: pr.precio, originalIndex: holdedProducts.indexOf(p) } : null;
                                      }).filter(Boolean);
                                      
                                      productsWithPrices.sort((a, b) => {
                                        const catA = getCategory(a.name, a.sku);
                                        const catB = getCategory(b.name, b.sku);
                                        const weightA = getProductWeight(a.name, catA);
                                        const weightB = getProductWeight(b.name, catB);
                                        if (weightA !== weightB) return weightA - weightB;
                                        return a.originalIndex - b.originalIndex;
                                      });

                                      if (productsWithPrices.length === 0) {
                                        return <tr><td colSpan={4} className="p-4 text-center text-slate-500">No hay precios definidos para esta tarifa.</td></tr>;
                                      }

                                      return productsWithPrices.map((p: any) => (
                                        <tr key={p.prId} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 font-mono text-xs text-slate-500">{p.sku || '-'}</td>
                                          <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                                          <td className="px-4 py-2 text-right font-bold text-slate-800">{p.precioTarifa.toFixed(2)} €</td>
                                          <td className="px-4 py-2 text-center">
                                            {isAdminOrAlicia && (
                                              <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => {
                                                  setSelectedPriceToEdit({ id: p.prId, productId: p.sku || p.id, precio: p.precioTarifa });
                                                  setShowEditPriceModal(true);
                                                }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar Precio">
                                                  <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDeletePrecioTarifa(p.prId)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar Precio">
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tarifa Modal */}
      {showTarifaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveTarifa} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Tag className="text-red-900" size={20} />
                {editingTarifa ? 'Editar Tarifa' : 'Nueva Tarifa'}
              </h3>
              <button type="button" onClick={() => setShowTarifaModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Tarifa</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  defaultValue={editingTarifa?.name}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900"
                  placeholder="Ej: Tarifa Mayoristas 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
                <textarea 
                  name="description" 
                  rows={3}
                  defaultValue={editingTarifa?.description}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900 resize-none"
                  placeholder="Detalles sobre la tarifa..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="active" 
                  name="active" 
                  defaultChecked={editingTarifa ? editingTarifa.active === 1 : true}
                  className="rounded border-slate-300 text-red-900 focus:ring-red-900"
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-700">Tarifa Activa</label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowTarifaModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-red-900 hover:bg-red-800 rounded-lg transition-colors shadow-sm">
                Guardar Tarifa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Price Modal */}
      {showEditPriceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPrice = parseFloat(formData.get('price') as string);
              
              if (selectedPriceToEdit && !isNaN(newPrice)) {
                try {
                  const res = await fetch(`/api/precios-tarifa/${selectedPriceToEdit.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precio: newPrice })
                  });
                  if (res.ok) {
                    handleLoadPreciosTarifa();
                    setShowEditPriceModal(false);
                  } else {
                    console.error('Error al actualizar precio');
                  }
                } catch (err) {
                  console.error('Error updating price:', err);
                  console.error('Error de conexión');
                }
              }
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="text-red-900" size={20} />
                Editar Precio
              </h3>
              <button type="button" onClick={() => setShowEditPriceModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Producto</p>
                <p className="text-sm font-bold text-slate-800">
                  {holdedProducts.find(p => p.id === selectedPriceToEdit?.productId || p.sku === selectedPriceToEdit?.productId)?.name || selectedPriceToEdit?.productId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nuevo Precio</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="price" 
                  required 
                  defaultValue={selectedPriceToEdit?.precio}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowEditPriceModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-red-900 hover:bg-red-800 rounded-lg transition-colors shadow-sm">
                Guardar Precio
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
