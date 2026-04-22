import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, ChevronDown, ChevronUp, ChevronRight, FileText, 
  Calculator, Download, AlertCircle, Loader2, CheckCircle2, DollarSign, Percent, Table, RotateCcw
} from 'lucide-react';
import { Button } from '../../shared/components/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SqlAgent, CommissionRule } from '../../shared/types';

interface AgentesProps {
  user: any;
  setConfirmDialog: any;
}

export default function Agentes({ user, setConfirmDialog }: AgentesProps) {
  const [sqlAgents, setSqlAgents] = useState<SqlAgent[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [commissionOverrides, setCommissionOverrides] = useState<Record<string, { removed?: boolean, linesData?: any }>>({});
  const [commissionAdjustments, setCommissionAdjustments] = useState<any[]>([]);
  
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SqlAgent | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionRule | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);
  
  const [holdedContacts, setHoldedContacts] = useState<any[]>([]);
  const [extractedCommercialAgents, setExtractedCommercialAgents] = useState<string[]>([]);
  
  const [holdedInvoicesForCommissions, setHoldedInvoicesForCommissions] = useState<any[]>([]);
  const [isHoldedLoading, setIsHoldedLoading] = useState(false);
  const [holdedError, setHoldedError] = useState<string | null>(null);
  
  const [showCommissionsReport, setShowCommissionsReport] = useState(false);
  const [selectedAgentForReport, setSelectedAgentForReport] = useState<string>('');
  const [selectedYearForReport, setSelectedYearForReport] = useState<number>(new Date().getFullYear());
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showImpagosModal, setShowImpagosModal] = useState(false);
  const [impagosAgent, setImpagosAgent] = useState<SqlAgent | null>(null);
  const [impagosInvoices, setImpagosInvoices] = useState<any[]>([]);
  const [calculatedQuarters, setCalculatedQuarters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchAgents();
    fetchCommissionRules();
    fetchHoldedContacts();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agentes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSqlAgents(data.map(a => ({
          id: a.id,
          nombre: a.name,
          email: a.email,
          telefono: a.phone,
          activo: a.active,
          fechaAlta: new Date().toISOString()
        })));
      }
    } catch (err) {
      console.error('Error loading SQL Agents:', err);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      const res = await fetch('/api/comisiones/reglas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommissionRules(data);
      }
    } catch (err) {
      console.error('Error loading Commission Rules:', err);
    }
  };

  const fetchHoldedContacts = async () => {
    try {
      const response = await fetch('/api/holded/contacts');
      if (!response.ok) throw new Error('Error al cargar contactos');
      const data = await response.json();
      setHoldedContacts(Array.isArray(data) ? data : []);
      
      if (Array.isArray(data)) {
        const agents = new Set<string>();
        data.forEach(contact => {
          if (contact.customFields) {
            const agentField = contact.customFields.find((f: any) => f.field === 'Agente Comercial');
            if (agentField && agentField.value) {
              agents.add(agentField.value);
            }
          }
        });
        setExtractedCommercialAgents(Array.from(agents).sort());
      }
    } catch (error: any) {
      console.error("Load Holded Contacts Error:", error);
    }
  };

  const handleDeleteAgente = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Agente',
      message: '¿Estás seguro de que deseas eliminar este agente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/agentes/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Error al eliminar agente');
          setSqlAgents(sqlAgents.filter(a => a.id !== id));
        } catch (err) {
          console.error(err);
          alert('Error al eliminar el agente');
        }
      }
    });
  };

  const handleSaveAgente = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const agentData = {
      name: formData.get('nombre'),
      email: formData.get('email'),
      phone: formData.get('telefono'),
      active: formData.get('activo') === 'on'
    };

    try {
      if (editingAgent) {
        const res = await fetch(`/api/agentes/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!res.ok) throw new Error('Error al actualizar agente');
        fetchAgents();
      } else {
        const res = await fetch('/api/agentes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!res.ok) throw new Error('Error al crear agente');
        fetchAgents();
      }
      setShowAgentModal(false);
      setEditingAgent(null);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el agente');
    }
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const agentId = formData.get('agentId') as string;
    const agent = sqlAgents.find(a => a.id.toString() === agentId);
    
    const clientId = formData.get('clientId') as string;
    const client = holdedContacts.find(c => c.id === clientId);

    const ruleData = {
      agentId,
      agentName: agent?.nombre || '',
      clientId: clientId || undefined,
      clientName: client?.name || undefined,
      category: formData.getAll('category') as string[],
      formats: formData.getAll('formats') as string[],
      rate: parseFloat(formData.get('rate') as string),
      description: formData.get('description') as string,
      startDate: formData.get('startDate') as string || undefined,
      endDate: formData.get('endDate') as string || undefined
    };

    try {
      if (editingCommission?.id) {
        const res = await fetch(`/api/comisiones/reglas/${editingCommission.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData)
        });
        if (!res.ok) throw new Error('Error al actualizar regla');
      } else {
        const res = await fetch('/api/comisiones/reglas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData)
        });
        if (!res.ok) throw new Error('Error al crear regla');
      }
      fetchCommissionRules();
      setShowCommissionModal(false);
      setEditingCommission(null);
    } catch (err) {
      console.error(err);
      alert('Error al guardar la regla de comisión');
    }
  };

  const handleDeleteCommission = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Regla',
      message: '¿Estás seguro de que deseas eliminar esta regla de comisión?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/comisiones/reglas/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Error al eliminar regla');
          setCommissionRules(commissionRules.filter(r => r.id !== id));
        } catch (err) {
          console.error(err);
          alert('Error al eliminar la regla');
        }
      }
    });
  };

  const handleToggleImpago = async (invoiceId: string, isCurrentlyImpago: boolean) => {
    if (isCurrentlyImpago) {
      // Restore
      try {
        const res = await fetch(`/api/comisiones/overrides/${selectedAgentForReport}/${invoiceId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al restaurar factura');
        await handleGenerateReport();
      } catch (err) {
        console.error(err);
        alert('Error al restaurar la factura');
      }
    } else {
      // Mark as impago
      setConfirmDialog({
        isOpen: true,
        title: 'Marcar como Impago / Excluir',
        message: '¿Estás seguro de que deseas excluir esta factura de las comisiones? (Ej. por impago)',
        onConfirm: async () => {
          try {
            const res = await fetch('/api/comisiones/overrides', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceId,
                agentId: selectedAgentForReport,
                removed: true
              })
            });
            if (!res.ok) throw new Error('Error al excluir factura');
            await handleGenerateReport();
          } catch (err) {
            console.error(err);
            alert('Error al excluir la factura');
          }
        }
      });
    }
  };

  const handleRegenerateCommissions = async () => {
    if (!selectedAgentForReport) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Regenerar Comisiones',
      message: '¿Estás seguro? Esto eliminará todas las ediciones manuales y exclusiones (impagos) para este agente, recalculando todo según las reglas actuales.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/comisiones/overrides/${selectedAgentForReport}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error('Error al regenerar comisiones');
          await handleGenerateReport();
        } catch (err) {
          console.error(err);
          alert('Error al regenerar las comisiones');
        }
      }
    });
  };

  const handleSaveGroupOverride = async (invoiceId: string, groupKey: string, overridesObj: any) => {
    try {
      const currentLinesData = commissionOverrides[invoiceId]?.linesData || {};
      const currentGroupData = { ...(currentLinesData[groupKey] || {}) };
      
      for (const key in overridesObj) {
        if (overridesObj[key] === null) {
          delete currentGroupData[key];
        } else {
          currentGroupData[key] = overridesObj[key];
        }
      }
      
      const res = await fetch('/api/comisiones/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          agentId: selectedAgentForReport,
          removed: false,
          linesData: {
            ...currentLinesData,
            [groupKey]: currentGroupData
          }
        })
      });
      if (!res.ok) throw new Error('Error al guardar edición manual');
      await handleGenerateReport();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la edición manual');
    }
  };

  const handleAddAdjustment = async (quarter: string, amount: number, description: string) => {
    try {
      const res = await fetch('/api/comisiones/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentForReport,
          year: selectedYearForReport,
          quarter,
          amount,
          description
        })
      });
      if (!res.ok) throw new Error('Error al añadir ajuste');
      await handleGenerateReport();
    } catch (err) {
      console.error(err);
      alert('Error al añadir el ajuste');
    }
  };

  const handleDeleteAdjustment = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Ajuste',
      message: '¿Estás seguro de que deseas eliminar este ajuste manual?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/comisiones/adjustments/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Error al eliminar ajuste');
          await handleGenerateReport();
        } catch (err) {
          console.error(err);
          alert('Error al eliminar el ajuste');
        }
      }
    });
  };

  const handleLoadHoldedInvoicesForCommissions = async (year: number, agentId?: string) => {
    setIsHoldedLoading(true);
    setHoldedError(null);
    try {
      const startOfYear = Math.floor(new Date(year, 0, 1).getTime() / 1000);
      const endOfYear = Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000);
      
      const [invoicesRes, creditNotesRes] = await Promise.all([
        fetch(`/api/holded/invoices?paid=all&starttmp=${startOfYear}&endtmp=${endOfYear}`),
        fetch(`/api/holded/creditnotes?starttmp=${startOfYear}&endtmp=${endOfYear}`)
      ]);

      if (!invoicesRes.ok) throw new Error('Error al cargar facturas de Holded');
      if (!creditNotesRes.ok) throw new Error('Error al cargar facturas rectificativas de Holded');

      const invoicesData = await invoicesRes.json();
      const creditNotesData = await creditNotesRes.json();

      const allDocs = [
        ...(Array.isArray(invoicesData) ? invoicesData : []),
        ...(Array.isArray(creditNotesData) ? creditNotesData.map((cn: any) => ({ ...cn, isCreditNote: true })) : [])
      ];

      console.log('Loaded Holded Invoices:', allDocs.length);
      if (allDocs.length > 0) {
        console.log('Sample Invoice:', allDocs[0].id, allDocs[0].docNumber, 'Products:', allDocs[0].products);
      }

      setHoldedInvoicesForCommissions(allDocs);

      let overridesObj: Record<string, any> = {};
      let adjustmentsData: any[] = [];

      if (agentId) {
        const [overridesRes, adjustmentsRes] = await Promise.all([
          fetch(`/api/comisiones/overrides/${agentId}`),
          fetch(`/api/comisiones/adjustments/${agentId}/${year}`)
        ]);

        if (overridesRes.ok) {
          const overridesDataArray = await overridesRes.json();
          if (Array.isArray(overridesDataArray)) {
            overridesDataArray.forEach(o => {
              overridesObj[o.invoiceId] = {
                removed: o.removed,
                linesData: o.linesData ? JSON.parse(o.linesData) : {}
              };
            });
          }
          setCommissionOverrides(overridesObj);
        }
        if (adjustmentsRes.ok) {
          adjustmentsData = await adjustmentsRes.json();
          if (!Array.isArray(adjustmentsData)) adjustmentsData = [];
          setCommissionAdjustments(adjustmentsData);
        }
      }
      
      return { invoices: allDocs, overrides: overridesObj, adjustments: adjustmentsData };
    } catch (error: any) {
      console.error("Load Holded Invoices for Commissions Error:", error);
      setHoldedError(error.message || 'Error al cargar facturas para comisiones');
      return { invoices: [], overrides: {}, adjustments: [] };
    } finally {
      setIsHoldedLoading(false);
    }
  };

  const handleViewImpagos = async (agent: SqlAgent) => {
    setImpagosAgent(agent);
    setIsHoldedLoading(true);
    try {
      const overridesRes = await fetch(`/api/comisiones/overrides/${agent.id}`);
      if (!overridesRes.ok) throw new Error('Error al cargar overrides');
      const overridesDataArray = await overridesRes.json();
      
      const impagoIds = Array.isArray(overridesDataArray) 
        ? overridesDataArray.filter(o => o.removed).map(o => o.invoiceId)
        : [];
      
      if (impagoIds.length === 0) {
        setImpagosInvoices([]);
        setShowImpagosModal(true);
        setIsHoldedLoading(false);
        return;
      }

      // We need to fetch the invoices from Holded. Since we don't know the year, we might need to fetch them individually or use the already loaded ones if available.
      // For simplicity, let's just use the already loaded ones if they exist, otherwise we'll just show the IDs.
      const impagos = impagoIds.map(id => {
        const inv = holdedInvoicesForCommissions.find(i => i.id === id);
        return inv || { id, docNumber: 'Desconocido', contactName: 'Cargar liquidación para ver detalles', date: 0, totalSales: 0 };
      });
      
      setImpagosInvoices(impagos);
      setShowImpagosModal(true);
    } catch (err) {
      console.error(err);
      alert('Error al cargar impagos');
    } finally {
      setIsHoldedLoading(false);
    }
  };

  const handleRestoreImpago = async (invoiceId: string) => {
    if (!impagosAgent) return;
    try {
      const res = await fetch(`/api/comisiones/overrides/${impagosAgent.id}/${invoiceId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al restaurar factura');
      
      setImpagosInvoices(impagosInvoices.filter(i => i.id !== invoiceId));
      
      // If we are currently viewing this agent's report, refresh it
      if (selectedAgentForReport === impagosAgent.id.toString()) {
        await handleGenerateReport();
      }
    } catch (err) {
      console.error(err);
      alert('Error al restaurar la factura');
    }
  };

  const calculateCommissions = (agentName: string, invoices: any[], rules: CommissionRule[], overrides: any, adjustments: any[]) => {
    const quarters: Record<string, any> = {
      'Q1': { name: 'Trimestre 1', invoices: [], totalSales: 0, totalCommission: 0, adjustments: [] },
      'Q2': { name: 'Trimestre 2', invoices: [], totalSales: 0, totalCommission: 0, adjustments: [] },
      'Q3': { name: 'Trimestre 3', invoices: [], totalSales: 0, totalCommission: 0, adjustments: [] },
      'Q4': { name: 'Trimestre 4', invoices: [], totalSales: 0, totalCommission: 0, adjustments: [] }
    };

    const agentRules = rules.filter(r => r.agentName === agentName).sort((a, b) => {
      // 1. Client specific rules first
      if (a.clientId && !b.clientId) return -1;
      if (!a.clientId && b.clientId) return 1;
      
      // 2. Rules with both category and format
      const aHasCat = a.category && a.category.length > 0;
      const aHasFmt = a.formats && a.formats.length > 0;
      const bHasCat = b.category && b.category.length > 0;
      const bHasFmt = b.formats && b.formats.length > 0;
      
      const aSpecificity = (aHasCat ? 1 : 0) + (aHasFmt ? 1 : 0);
      const bSpecificity = (bHasCat ? 1 : 0) + (bHasFmt ? 1 : 0);
      
      if (aSpecificity > bSpecificity) return -1;
      if (aSpecificity < bSpecificity) return 1;
      
      return 0; // Keep original order (newest first) for same specificity
    });

    // Create a map of contact IDs to their assigned agent for fast lookup
    const contactAgentMap: Record<string, string> = {};
    holdedContacts.forEach(contact => {
      if (contact.customFields) {
        const agentField = contact.customFields.find((f: any) => f.field === 'Agente Comercial' || f.field === 'Agente');
        if (agentField && agentField.value) {
          contactAgentMap[contact.id] = agentField.value;
        }
      }
    });

    const agentInvoices = invoices.filter(inv => {
      // Check if invoice has agent directly
      const invoiceAgentField = inv.customFields?.find((f: any) => f.field === 'Agente Comercial' || f.field === 'Agente');
      let isAgentInvoice = false;
      
      if (invoiceAgentField && invoiceAgentField.value === agentName) {
        isAgentInvoice = true;
      } else if (inv.contact && contactAgentMap[inv.contact] === agentName) {
        // Fallback to checking the contact's agent
        isAgentInvoice = true;
      }

      const isOverriddenToAdd = overrides[inv.id] && !overrides[inv.id].removed;
      
      return isAgentInvoice || isOverriddenToAdd;
    });

    console.log(`calculateCommissions: Found ${agentInvoices.length} invoices for agent ${agentName}`);

    agentInvoices.forEach(inv => {
      const date = new Date(inv.date * 1000);
      const month = date.getMonth();
      let quarter = 'Q1';
      if (month >= 3 && month <= 5) quarter = 'Q2';
      else if (month >= 6 && month <= 8) quarter = 'Q3';
      else if (month >= 9) quarter = 'Q4';

      let invoiceCommission = 0;
      let commissionDetails: any[] = [];
      const isCreditNote = inv.isCreditNote;
      const multiplier = isCreditNote ? -1 : 1;
      const isImpago = overrides[inv.id] && overrides[inv.id].removed;

      if (inv.products && Array.isArray(inv.products)) {
        const grouped: Record<string, any> = {};

        inv.products.forEach((prod: any) => {
          let appliedRate = 0;
          let appliedRule = null;

          for (const rule of agentRules) {
            if (rule.clientId && rule.clientId !== inv.contact) continue;
            
            let categoryMatch = true;
            if (rule.category && rule.category.length > 0) {
              categoryMatch = rule.category.some(cat => 
                prod.name?.toUpperCase().includes(cat.toUpperCase()) || 
                prod.tags?.some((t: string) => t.toUpperCase() === cat.toUpperCase())
              );
            }

            let formatMatch = true;
            if (rule.formats && rule.formats.length > 0) {
              formatMatch = rule.formats.some(fmt => 
                prod.name?.toUpperCase().includes(fmt.toUpperCase()) ||
                prod.tags?.some((t: string) => t.toUpperCase() === fmt.toUpperCase())
              );
            }

            if (!categoryMatch || !formatMatch) continue;
            
            appliedRate = rule.rate;
            appliedRule = rule;
            break;
          }

          if (appliedRate > 0) {
            const ruleDesc = appliedRule?.description || 'Regla general';
            const groupKey = ruleDesc; // We group by rule description
            
            if (!grouped[groupKey]) {
              grouped[groupKey] = {
                groupKey,
                name: ruleDesc,
                originalTotal: 0,
                originalRate: appliedRate,
                originalCommission: 0,
                rule: ruleDesc,
                skus: []
              };
            }
            
            const lineTotal = (prod.price * prod.units) - (prod.discount || 0);
            grouped[groupKey].originalTotal += lineTotal;
            grouped[groupKey].originalCommission += lineTotal * (appliedRate / 100);
            grouped[groupKey].skus.push(prod.sku);
          }
        });

        // Apply overrides at the group level
        Object.values(grouped).forEach((group: any) => {
          const overrideGroup = overrides[inv.id]?.linesData?.[group.groupKey];
          
          let finalTotal = group.originalTotal;
          let finalRate = group.originalRate;
          let finalCommission = group.originalCommission;
          
          if (overrideGroup) {
            if (overrideGroup.total !== undefined) finalTotal = overrideGroup.total;
            if (overrideGroup.rate !== undefined) finalRate = overrideGroup.rate;
            if (overrideGroup.commission !== undefined) finalCommission = overrideGroup.commission;
            else finalCommission = finalTotal * (finalRate / 100); // Recalculate if rate or total changed but not commission
          }
          
          if (finalCommission !== 0 || finalTotal !== 0) {
            invoiceCommission += finalCommission * multiplier;
            commissionDetails.push({
              groupKey: group.groupKey,
              name: group.name,
              total: finalTotal * multiplier,
              rate: finalRate,
              commission: finalCommission * multiplier,
              rule: group.rule
            });
          }
        });
      }

      const totalSales = inv.subtotal * multiplier;
      
      quarters[quarter].invoices.push({
        id: inv.id,
        docNumber: inv.docNumber,
        date: inv.date,
        contactName: inv.contactName,
        totalSales: totalSales,
        commission: invoiceCommission * multiplier,
        details: commissionDetails,
        isCreditNote,
        isImpago
      });
      
      if (!isImpago) {
        quarters[quarter].totalSales += totalSales;
        quarters[quarter].totalCommission += (invoiceCommission * multiplier);
      }
    });

    adjustments.forEach(adj => {
      if (quarters[adj.quarter]) {
        quarters[adj.quarter].adjustments.push(adj);
        quarters[adj.quarter].totalCommission += adj.amount;
      }
    });

    // Sort invoices by date ascending
    Object.keys(quarters).forEach(q => {
      quarters[q].invoices.sort((a: any, b: any) => a.date - b.date);
    });

    return quarters;
  };

  const handleRecalculateCommissions = () => {
    if (!selectedAgentForReport) return;
    const agent = sqlAgents.find(a => a.id.toString() === selectedAgentForReport);
    if (!agent) return;

    const quarters = calculateCommissions(
      agent.nombre, 
      holdedInvoicesForCommissions, 
      commissionRules,
      commissionOverrides,
      commissionAdjustments
    );
    
    setCalculatedQuarters(quarters);
    alert('Liquidación recalculada con las reglas actuales');
  };

  const handleGenerateReport = async () => {
    if (!selectedAgentForReport) {
      alert('Por favor selecciona un agente');
      return;
    }
    
    const agent = sqlAgents.find(a => a.id.toString() === selectedAgentForReport);
    if (!agent) return;

    const { invoices, overrides, adjustments } = await handleLoadHoldedInvoicesForCommissions(selectedYearForReport, selectedAgentForReport);
    
    const quarters = calculateCommissions(
      agent.nombre, 
      invoices, 
      commissionRules,
      overrides,
      adjustments
    );
    
    setCalculatedQuarters(quarters);
    setShowCommissionsReport(true);
  };

  const exportCommissionsToExcel = (quarterKey?: string) => {
    const agent = sqlAgents.find(a => a.id.toString() === selectedAgentForReport);
    if (!agent) return;

    const workbook = XLSX.utils.book_new();

    const quartersToExport = quarterKey && typeof quarterKey === 'string'
      ? { [quarterKey]: calculatedQuarters[quarterKey] }
      : calculatedQuarters;

    Object.entries(quartersToExport).forEach(([qKey, qData]) => {
      if ((qData as any).invoices.length === 0 && (qData as any).adjustments.length === 0) return;

      const rows: any[] = [];
      
      (qData as any).invoices.forEach((inv: any) => {
        const isImpago = commissionOverrides[inv.id]?.removed;
        const estado = isImpago ? 'Impagada' : (inv.isCreditNote ? 'Abono' : 'Pagada');
        
        // Add invoice header row
        rows.push({
          'Documento': inv.docNumber,
          'Fecha': new Date(inv.date * 1000).toLocaleDateString(),
          'Cliente': inv.contactName,
          'Estado': estado,
          'Producto': '',
          '% Comisión': '',
          'Comisión (€)': inv.commission.toFixed(2),
          'Venta Base (€)': inv.totalSales.toFixed(2)
        });

        // Add product detail rows
        inv.details.forEach((detail: any) => {
          rows.push({
            'Documento': '',
            'Fecha': '',
            'Cliente': '',
            'Estado': '',
            'Producto': detail.name,
            '% Comisión': `${detail.rate}%`,
            'Comisión (€)': detail.commission.toFixed(2),
            'Venta Base (€)': detail.total.toFixed(2)
          });
        });
      });

      (qData as any).adjustments.forEach((adj: any) => {
        rows.push({
          'Documento': 'AJUSTE MANUAL',
          'Fecha': new Date().toLocaleDateString(),
          'Cliente': '-',
          'Estado': 'Ajuste',
          'Producto': adj.description,
          '% Comisión': '-',
          'Comisión (€)': adj.amount.toFixed(2),
          'Venta Base (€)': '0.00'
        });
      });

      rows.push({
        'Documento': 'TOTAL TRIMESTRE',
        'Fecha': '',
        'Cliente': '',
        'Estado': '',
        'Producto': '',
        '% Comisión': '',
        'Comisión (€)': (qData as any).totalCommission.toFixed(2),
        'Venta Base (€)': (qData as any).totalSales.toFixed(2)
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, (qData as any).name);
    });

    if (workbook.SheetNames.length === 0) {
      alert('No hay datos para exportar en el periodo seleccionado.');
      return;
    }

    const fileName = quarterKey 
      ? `Comisiones_${agent.nombre.replace(/\s+/g, '_')}_${selectedYearForReport}_${quarterKey}.xlsx`
      : `Comisiones_${agent.nombre.replace(/\s+/g, '_')}_${selectedYearForReport}.xlsx`;
      
    XLSX.writeFile(workbook, fileName);
  };

  const exportCommissionsToPDF = (quarterKey?: string) => {
    const agent = sqlAgents.find(a => a.id.toString() === selectedAgentForReport);
    if (!agent) return;

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Liquidación de Comisiones - ${selectedYearForReport}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Agente: ${agent.nombre}`, 14, 30);
    
    let yPos = 40;
    let hasData = false;

    const quartersToExport = quarterKey && typeof quarterKey === 'string'
      ? { [quarterKey]: calculatedQuarters[quarterKey] }
      : calculatedQuarters;

    Object.entries(quartersToExport).forEach(([qKey, qData]) => {
      if ((qData as any).invoices.length === 0 && (qData as any).adjustments.length === 0) return;
      hasData = true;

      doc.setFontSize(14);
      doc.text((qData as any).name, 14, yPos);
      yPos += 5;

      const tableData: any[] = [];
      
      (qData as any).invoices.forEach((inv: any) => {
        const isImpago = commissionOverrides[inv.id]?.removed;
        const estado = isImpago ? 'Impagada' : (inv.isCreditNote ? 'Abono' : 'Pagada');
        
        tableData.push([
          { content: inv.docNumber, styles: { fontStyle: 'bold' } },
          { content: new Date(inv.date * 1000).toLocaleDateString(), styles: { fontStyle: 'bold' } },
          { content: inv.contactName.substring(0, 30), styles: { fontStyle: 'bold' } },
          { content: estado, styles: { fontStyle: 'bold', textColor: isImpago ? [220, 38, 38] : (inv.isCreditNote ? [234, 88, 12] : [22, 163, 74]) } },
          { content: '', styles: { fontStyle: 'bold' } },
          { content: `${inv.totalSales.toFixed(2)} €`, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `${inv.commission.toFixed(2)} €`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        inv.details.forEach((detail: any) => {
          tableData.push([
            '',
            '',
            '',
            detail.name.substring(0, 30),
            `${detail.rate}%`,
            { content: `${detail.total.toFixed(2)} €`, styles: { halign: 'right' } },
            { content: `${detail.commission.toFixed(2)} €`, styles: { halign: 'right' } }
          ]);
        });
      });

      (qData as any).adjustments.forEach((adj: any) => {
        tableData.push([
          { content: 'AJUSTE', styles: { fontStyle: 'bold' } },
          { content: new Date().toLocaleDateString(), styles: { fontStyle: 'bold' } },
          { content: '-', styles: { fontStyle: 'bold' } },
          { content: adj.description.substring(0, 30), styles: { fontStyle: 'bold' } },
          { content: '-', styles: { fontStyle: 'bold' } },
          { content: '-', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `${adj.amount.toFixed(2)} €`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
      });

      tableData.push([
        { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${(qData as any).totalSales.toFixed(2)} €`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${(qData as any).totalCommission.toFixed(2)} €`, styles: { fontStyle: 'bold', halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Documento', 'Fecha', 'Cliente', 'Estado / Producto', '% Com.', 'Base', 'Comisión']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        didDrawPage: (data) => {
          yPos = data.cursor ? data.cursor.y + 15 : yPos + 15;
        }
      });
    });

    if (!hasData) {
      alert('No hay datos para exportar en el periodo seleccionado.');
      return;
    }

    const fileName = quarterKey 
      ? `Liquidacion_${agent.nombre.replace(/\s+/g, '_')}_${selectedYearForReport}_${quarterKey}.pdf`
      : `Liquidacion_${agent.nombre.replace(/\s+/g, '_')}_${selectedYearForReport}.pdf`;

    doc.save(fileName);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Agentes Comerciales (SQL) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-700">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Agentes Comerciales</h2>
              <p className="text-sm text-slate-500">Gestión de agentes y comisiones</p>
            </div>
          </div>
          <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingAgent(null);
                  setShowAgentModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Crear Nuevo
              </button>
          </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Contacto</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sqlAgents.map((agent) => (
                <React.Fragment key={agent.id}>
                  <tr 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                  >
                    <td className="p-4 text-sm text-slate-500">#{agent.id}</td>
                    <td className="p-4 font-medium text-slate-800">{agent.nombre}</td>
                    <td className="p-4 text-sm text-slate-600">
                      <div>{agent.email}</div>
                      <div className="text-xs text-slate-400">{agent.telefono}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        agent.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {agent.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAgent(agent);
                              setShowAgentModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Datos"
                          >
                            <Edit size={18} />
                          </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgentForReport(agent.id.toString());
                            document.getElementById('liquidacion-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Calcular Comisiones"
                        >
                          <Percent size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewImpagos(agent);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Impagos"
                        >
                          <AlertCircle size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id);
                          }}
                          className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          {expandedAgentId === agent.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Agent Details (Commission Rules) */}
                  {expandedAgentId === agent.id && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="p-6 border-b border-slate-100">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                              <Percent size={16} className="text-red-900" />
                              % Gestión de {agent.nombre}
                            </h4>
                            <div className="flex gap-2">
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAgent(agent);
                                  setShowAgentModal(true);
                                }}
                                className="text-slate-600 border-slate-200 hover:bg-slate-50"
                              >
                                <Edit size={14} className="mr-1" /> Editar Datos
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAgente(agent.id);
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 size={14} className="mr-1" /> Eliminar
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => handleViewImpagos(agent)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <AlertCircle size={14} className="mr-1" /> Impagos
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                onClick={() => {
                                  setSelectedAgentForReport(agent.id.toString());
                                  document.getElementById('liquidacion-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                <Percent size={14} className="mr-1" /> Calcular Comisiones
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-red-900 hover:bg-red-950 text-white border-none"
                                onClick={() => {
                                  setEditingCommission({ agentId: agent.id.toString(), agentName: agent.nombre } as any);
                                  setShowCommissionModal(true);
                                }}
                              >
                                <Plus size={14} className="mr-1" /> Añadir Regla
                              </Button>
                            </div>
                          </div>
                          
                          {commissionRules.filter(r => r.agentId.toString() === agent.id.toString()).length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <th className="p-3 font-medium">Cliente</th>
                                    <th className="p-3 font-medium">Categoría</th>
                                    <th className="p-3 font-medium">Formato</th>
                                    <th className="p-3 font-medium text-center">Comisión (%)</th>
                                    <th className="p-3 font-medium">Descripción</th>
                                    <th className="p-3 font-medium text-center">Vigencia</th>
                                    <th className="p-3 font-medium text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {commissionRules.filter(r => r.agentId.toString() === agent.id.toString()).map(rule => (
                                    <tr key={rule.id} className="hover:bg-slate-50/50">
                                      <td className="p-3">
                                        {rule.clientName ? (
                                          <div>
                                            <div className="font-medium text-slate-800">{rule.clientName}</div>
                                            <div className="text-xs text-slate-400">{rule.clientId}</div>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic">Todos</span>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                          {rule.category && rule.category.length > 0 ? rule.category.map(cat => (
                                            <span key={cat} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">
                                              {cat}
                                            </span>
                                          )) : <span className="text-slate-400 italic">Todas</span>}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                          {rule.formats && rule.formats.length > 0 ? rule.formats.map(fmt => (
                                            <span key={fmt} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                              {fmt}
                                            </span>
                                          )) : <span className="text-slate-400 italic">Todos</span>}
                                        </div>
                                      </td>
                                      <td className="p-3 text-center font-bold text-slate-800">
                                        {rule.rate}%
                                      </td>
                                      <td className="p-3 text-slate-600">
                                        {rule.description || '-'}
                                      </td>
                                      <td className="p-3 text-center text-slate-500 text-xs">
                                        {rule.startDate ? new Date(rule.startDate).toLocaleDateString() : 'Siempre'} - {rule.endDate ? new Date(rule.endDate).toLocaleDateString() : 'Siempre'}
                                      </td>
                                      <td className="p-3 text-center">
                                        <div className="flex justify-center gap-1">
                                          <button 
                                            onClick={() => {
                                              setEditingCommission(rule);
                                              setShowCommissionModal(true);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteCommission(rule.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                              No hay reglas de comisión definidas para este agente.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {sqlAgents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No hay agentes comerciales registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liquidación de Comisiones */}
      <div id="liquidacion-section" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-700">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Liquidación de Comisiones</h2>
              <p className="text-sm text-slate-500">Cálculo y generación de informes</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Agente Comercial</label>
              <select 
                value={selectedAgentForReport}
                onChange={(e) => setSelectedAgentForReport(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">Seleccionar agente...</option>
                {sqlAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.nombre}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
              <select 
                value={selectedYearForReport}
                onChange={(e) => setSelectedYearForReport(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                {[2026, 2025, 2024, 2023].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <Button 
              onClick={handleGenerateReport}
              disabled={!selectedAgentForReport || isHoldedLoading}
              className="flex items-center gap-2"
            >
              {isHoldedLoading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              Abrir liquidaciones
            </Button>
          </div>

          {holdedError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle size={18} />
              {holdedError}
            </div>
          )}

          {showCommissionsReport && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleRegenerateCommissions} className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                    <RotateCcw size={16} /> Regenerar
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => exportCommissionsToExcel()} className="flex items-center gap-2">
                    <Table size={16} /> Exportar Excel
                  </Button>
                  <Button variant="secondary" onClick={() => exportCommissionsToPDF()} className="flex items-center gap-2">
                    <FileText size={16} /> Exportar PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(calculatedQuarters).map(([qKey, qData]) => (
                  <div key={qKey} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800">{(qData as any).name}</h3>
                      <span className="text-xs font-medium px-2 py-1 bg-white rounded-full border border-slate-200 text-slate-600">
                        {(qData as any).invoices.length} docs
                      </span>
                    </div>
                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Ventas Base:</span>
                        <span className="font-medium">{(qData as any).totalSales.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Comisión:</span>
                        <span className="font-bold text-emerald-600">{(qData as any).totalCommission.toFixed(2)} €</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setExpandedQuarter(expandedQuarter === qKey ? null : qKey)}
                      className="w-full py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      {expandedQuarter === qKey ? 'Ocultar Detalles' : 'Ver Detalles'}
                      {expandedQuarter === qKey ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                ))}
              </div>

              {expandedQuarter && calculatedQuarters[expandedQuarter] && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-slate-800">Detalle {calculatedQuarters[expandedQuarter].name}</h3>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleRecalculateCommissions} className="flex items-center gap-2 text-xs py-1 px-2 h-auto">
                          <Calculator size={14} /> Calcular Liquidación
                        </Button>
                        <Button variant="secondary" onClick={() => setShowAdjustmentModal(true)} className="flex items-center gap-2 text-xs py-1 px-2 h-auto">
                          <Plus size={14} /> Añadir Ajuste
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => exportCommissionsToExcel(expandedQuarter)} className="flex items-center gap-2 text-xs py-1 px-2 h-auto">
                        <Table size={14} /> Excel
                      </Button>
                      <Button variant="secondary" onClick={() => exportCommissionsToPDF(expandedQuarter)} className="flex items-center gap-2 text-xs py-1 px-2 h-auto">
                        <FileText size={14} /> PDF
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <th className="p-3 font-medium">Fecha</th>
                          <th className="p-3 font-medium">Documento</th>
                          <th className="p-3 font-medium">Cliente</th>
                          <th className="p-3 font-medium">Regla/Producto</th>
                          <th className="p-3 font-medium text-right">Base</th>
                          <th className="p-3 font-medium text-right">% Com.</th>
                          <th className="p-3 font-medium text-right">Comisión</th>
                          <th className="p-3 font-medium text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calculatedQuarters[expandedQuarter].invoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500">
                              No hay facturas para este trimestre.
                            </td>
                          </tr>
                        ) : (
                          calculatedQuarters[expandedQuarter].invoices.map((inv: any) => (
                            <React.Fragment key={inv.id}>
                              {inv.details.map((detail: any, idx: number) => (
                                <tr key={`${inv.id}-${idx}`} className={`hover:bg-slate-50 ${inv.isImpago ? 'opacity-60 bg-red-50/30' : ''} ${idx === 0 ? 'border-t-2 border-slate-200' : ''}`}>
                                  <td className="p-3 text-slate-600">{idx === 0 ? new Date(inv.date * 1000).toLocaleDateString() : ''}</td>
                                  <td className="p-3">
                                    {idx === 0 && (
                                      <>
                                        <span className={`font-medium ${inv.isImpago ? 'text-red-800 line-through' : 'text-slate-800'}`}>{inv.docNumber}</span>
                                        {inv.isCreditNote && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">ABONO</span>}
                                        {inv.isImpago && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">IMPAGADA</span>}
                                      </>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-600 truncate max-w-[200px]">{idx === 0 ? inv.contactName : ''}</td>
                                  <td className="p-3 text-slate-700 font-medium">
                                    <div className="text-sm">{detail.name}</div>
                                    <div className="text-xs text-slate-400">{detail.rule}</div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      defaultValue={detail.total}
                                      onBlur={(e) => {
                                        const newTotal = parseFloat(e.target.value);
                                        if (!isNaN(newTotal) && newTotal !== detail.total) {
                                          handleSaveGroupOverride(inv.id, detail.groupKey, { total: newTotal, commission: null });
                                        }
                                      }}
                                      className="w-20 text-right px-1 py-0.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    /> €
                                  </td>
                                  <td className="p-3 text-right">
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      defaultValue={detail.rate}
                                      onBlur={(e) => {
                                        const newRate = parseFloat(e.target.value);
                                        if (!isNaN(newRate) && newRate !== detail.rate) {
                                          handleSaveGroupOverride(inv.id, detail.groupKey, { rate: newRate, commission: null });
                                        }
                                      }}
                                      className="w-16 text-right px-1 py-0.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    /> %
                                  </td>
                                  <td className="p-3 text-right font-medium text-emerald-600">
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      defaultValue={detail.commission}
                                      onBlur={(e) => {
                                        const newComm = parseFloat(e.target.value);
                                        if (!isNaN(newComm) && newComm !== detail.commission) {
                                          handleSaveGroupOverride(inv.id, detail.groupKey, { commission: newComm });
                                        }
                                      }}
                                      className="w-20 text-right px-1 py-0.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-emerald-600 font-bold"
                                    /> €
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                      {idx === 0 && (
                                        <button 
                                          onClick={() => handleToggleImpago(inv.id, inv.isImpago)}
                                          className={`p-1.5 transition-colors rounded-lg ${inv.isImpago ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                          title={inv.isImpago ? "Restaurar" : "Excluir / Marcar Impago toda la factura"}
                                        >
                                          <AlertCircle size={16} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handleSaveGroupOverride(inv.id, detail.groupKey, { rate: 0, commission: 0 })}
                                        className="text-[10px] text-red-600 hover:underline ml-2"
                                        title="Excluir línea"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        )}
                        {calculatedQuarters[expandedQuarter].adjustments.map((adj: any) => (
                          <tr key={adj.id} className="bg-orange-50/50 hover:bg-orange-50">
                            <td className="p-3 text-slate-600">{new Date().toLocaleDateString()}</td>
                            <td className="p-3 font-medium text-orange-700">AJUSTE MANUAL</td>
                            <td className="p-3 text-slate-600">{adj.description}</td>
                            <td className="p-3 text-right font-medium">-</td>
                            <td className="p-3 text-right font-bold text-orange-600">{adj.amount.toFixed(2)} €</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteAdjustment(adj.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Eliminar Ajuste"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {calculatedQuarters[expandedQuarter].invoices.length === 0 && calculatedQuarters[expandedQuarter].adjustments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              No hay facturas ni ajustes en este trimestre.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="p-3 text-right text-slate-700">TOTAL TRIMESTRE:</td>
                          <td className="p-3 text-right text-slate-800">{calculatedQuarters[expandedQuarter].totalSales.toFixed(2)} €</td>
                          <td className="p-3 text-right text-emerald-700">{calculatedQuarters[expandedQuarter].totalCommission.toFixed(2)} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mt-8 p-4 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 overflow-auto max-h-40">
                <strong>Log de depuración:</strong><br/>
                Facturas cargadas desde Holded: {holdedInvoicesForCommissions.length}<br/>
                Contactos cargados desde Holded: {holdedContacts.length}<br/>
                Agente seleccionado: {sqlAgents.find(a => a.id.toString() === selectedAgentForReport)?.nombre || 'Ninguno'}<br/>
                Facturas asignadas tras filtrado: {Object.values(calculatedQuarters).reduce((acc: number, q: any) => acc + q.invoices.length, 0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingAgent ? 'Editar Agente' : 'Nuevo Agente Comercial'}
              </h3>
            </div>
            <form onSubmit={handleSaveAgente} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  name="nombre"
                  defaultValue={editingAgent?.nombre}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  defaultValue={editingAgent?.email}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input 
                  type="tel" 
                  name="telefono"
                  defaultValue={editingAgent?.telefono}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  name="activo"
                  id="activo"
                  defaultChecked={editingAgent ? editingAgent.activo : true}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-slate-700">Agente Activo</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAgentModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingAgent ? 'Guardar Cambios' : 'Crear Agente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingCommission?.id ? 'Editar Regla de Comisión' : 'Nueva Regla de Comisión'}
              </h3>
            </div>
            <form onSubmit={handleSaveCommission} className="p-6 space-y-4">
              <input type="hidden" name="agentId" value={editingCommission?.agentId} />
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agente</label>
                <input 
                  type="text" 
                  value={editingCommission?.agentName}
                  disabled
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Nombre de la regla</label>
                <input 
                  type="text" 
                  name="description"
                  defaultValue={editingCommission?.description}
                  placeholder="Ej: Comisión general, Cliente VIP..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Porcentaje (%)</label>
                  <input 
                    type="number" 
                    name="rate"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={editingCommission?.rate}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente Específico (Opcional)</label>
                  <select 
                    name="clientId"
                    defaultValue={editingCommission?.clientId || ''}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Todos los clientes</option>
                    {holdedContacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Categorías (Opcional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {['JAMON', 'PALETA', 'EMBUTIDO'].map(cat => (
                      <label key={cat} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          name="category" 
                          value={cat}
                          defaultChecked={editingCommission?.category?.some(c => c.toUpperCase() === cat)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Formatos (Opcional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {['PIEZA', 'LONCHEADO', 'ESTUCHE'].map(fmt => (
                      <label key={fmt} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          name="formats" 
                          value={fmt}
                          defaultChecked={editingCommission?.formats?.some(f => f.toUpperCase() === fmt)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{fmt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio (Opcional)</label>
                  <input 
                    type="date" 
                    name="startDate"
                    defaultValue={editingCommission?.startDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin (Opcional)</label>
                  <input 
                    type="date" 
                    name="endDate"
                    defaultValue={editingCommission?.endDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowCommissionModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Guardar Regla
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                Añadir Ajuste Manual
              </h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleAddAdjustment(
                formData.get('quarter') as string,
                parseFloat(formData.get('amount') as string),
                formData.get('description') as string
              );
              setShowAdjustmentModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trimestre</label>
                <select 
                  name="quarter"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="Q1">Trimestre 1</option>
                  <option value="Q2">Trimestre 2</option>
                  <option value="Q3">Trimestre 3</option>
                  <option value="Q4">Trimestre 4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Importe (€)</label>
                <input 
                  type="number" 
                  name="amount"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input 
                  type="text" 
                  name="description"
                  required
                  placeholder="Motivo del ajuste..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAdjustmentModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Añadir Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImpagosModal && impagosAgent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-amber-500" />
                Impagos y Exclusiones - {impagosAgent.nombre}
              </h3>
              <button onClick={() => setShowImpagosModal(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {impagosInvoices.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No hay impagos</h3>
                  <p className="text-slate-500">Este agente no tiene facturas excluidas o marcadas como impago.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-3 font-medium">Documento</th>
                        <th className="p-3 font-medium">Cliente</th>
                        <th className="p-3 font-medium">Fecha</th>
                        <th className="p-3 font-medium text-right">Base</th>
                        <th className="p-3 font-medium text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {impagosInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{inv.docNumber}</td>
                          <td className="p-3 text-slate-600">{inv.contactName}</td>
                          <td className="p-3 text-slate-600">{inv.date ? new Date(inv.date * 1000).toLocaleDateString() : '-'}</td>
                          <td className="p-3 text-right font-medium">{inv.totalSales ? inv.totalSales.toFixed(2) : '0.00'} €</td>
                          <td className="p-3 text-center">
                            <Button 
                              variant="secondary" 
                              onClick={() => handleRestoreImpago(inv.id)}
                              className="text-xs py-1 px-2 h-auto text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                            >
                              Restaurar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <Button variant="secondary" onClick={() => setShowImpagosModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
