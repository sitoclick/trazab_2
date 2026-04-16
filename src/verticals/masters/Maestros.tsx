import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, RefreshCw, Loader2, AlertCircle, Search, Filter, 
  Package, Users, FileText, ChevronRight, X
} from 'lucide-react';
import { Button } from '../../shared/components/Button';

interface MaestrosProps {
  user: any;
}

export default function Maestros({ user }: MaestrosProps) {
  const [maestrosSubTab, setMaestrosSubTab] = useState<'products' | 'clients'>('products');
  
  // Holded State
  const [isHoldedLoading, setIsHoldedLoading] = useState(false);
  const [holdedError, setHoldedError] = useState<string | null>(null);
  const [holdedContacts, setHoldedContacts] = useState<any[]>([]);
  const [holdedProducts, setHoldedProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  
  // Product Filters
  const [uniqueCategoria2, setUniqueCategoria2] = useState<string[]>([]);
  const [uniqueFormato, setUniqueFormato] = useState<string[]>([]);
  const [selectedCategoria2, setSelectedCategoria2] = useState<string>('');
  const [selectedFormato, setSelectedFormato] = useState<string>('');
  const [productSearchFilters, setProductSearchFilters] = useState({
    name: '',
    sku: '',
    cat2: '',
    formato: ''
  });

  // Product Detail
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isProductDetailLoading, setIsProductDetailLoading] = useState(false);

  const handleLoadHoldedContacts = async () => {
    setIsHoldedLoading(true);
    setHoldedError(null);
    try {
      const response = await fetch('/api/holded/contacts');
      if (!response.ok) throw new Error('Error al cargar contactos de Holded');
      const data = await response.json();
      setHoldedContacts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Load Holded Contacts Error:", error);
      setHoldedError(error.message || 'Error al cargar contactos');
    } finally {
      setIsHoldedLoading(false);
    }
  };

  const handleLoadHoldedProducts = async () => {
    setIsHoldedLoading(true);
    setHoldedError(null);
    try {
      const response = await fetch('/api/holded/products');
      if (!response.ok) throw new Error('Error al cargar productos de Holded');
      const data = await response.json();
      const products = Array.isArray(data) ? data : [];
      setHoldedProducts(products);
      
      // Filter products: only those with attribute "Categoría" = "Ibéricos"
      const filtered = products.filter((p: any) => {
        if (!p.attributes || !Array.isArray(p.attributes)) return false;
        return p.attributes.some((attr: any) => 
          attr.name === 'Categoría' && attr.value === 'Ibéricos'
        );
      });
      setFilteredProducts(filtered);
      
      // Extract unique "Categoria2" and "Formato" values from filtered products
      const cat2Set = new Set<string>();
      const formatoSet = new Set<string>();
      filtered.forEach((p: any) => {
        if (p.attributes && Array.isArray(p.attributes)) {
          const cat2Attr = p.attributes.find((attr: any) => attr.name === 'Categoria2');
          if (cat2Attr && cat2Attr.value) {
            cat2Set.add(cat2Attr.value);
          }
          const formatoAttr = p.attributes.find((attr: any) => attr.name === 'Formato');
          if (formatoAttr && formatoAttr.value) {
            formatoSet.add(formatoAttr.value);
          }
        }
      });
      setUniqueCategoria2(Array.from(cat2Set).sort());
      setUniqueFormato(Array.from(formatoSet).sort());
      
    } catch (error: any) {
      console.error("Load Holded Products Error:", error);
      setHoldedError(error.message || 'Error al cargar productos');
    } finally {
      setIsHoldedLoading(false);
    }
  };

  const handleViewProductDetail = async (productId: string) => {
    setIsProductDetailLoading(true);
    try {
      const response = await fetch(`/api/holded/products/${productId}`);
      if (!response.ok) throw new Error('Error al cargar detalle del producto');
      const data = await response.json();
      setSelectedProduct(data);
    } catch (error: any) {
      console.error("View Product Detail Error:", error);
      alert(error.message || 'Error al cargar el detalle del producto');
    } finally {
      setIsProductDetailLoading(false);
    }
  };

  const displayProducts = useMemo(() => {
    return filteredProducts.filter(p => {
      const cat2 = p.attributes?.find((a: any) => a.name === 'Categoria2')?.value || '-';
      const formato = p.attributes?.find((a: any) => a.name === 'Formato')?.value || '-';
      
      const matchesSidebarCat2 = !selectedCategoria2 || cat2 === selectedCategoria2;
      const matchesSidebarFormato = !selectedFormato || formato === selectedFormato;
      
      const matchesSearchName = !productSearchFilters.name || p.name.toLowerCase().includes(productSearchFilters.name.toLowerCase());
      const matchesSearchSku = !productSearchFilters.sku || (p.sku && p.sku.toLowerCase().includes(productSearchFilters.sku.toLowerCase()));
      const matchesSearchCat2 = !productSearchFilters.cat2 || cat2.toLowerCase().includes(productSearchFilters.cat2.toLowerCase());
      const matchesSearchFormato = !productSearchFilters.formato || formato.toLowerCase().includes(productSearchFilters.formato.toLowerCase());
      
      return matchesSidebarCat2 && matchesSidebarFormato && matchesSearchName && matchesSearchSku && matchesSearchCat2 && matchesSearchFormato;
    });
  }, [filteredProducts, selectedCategoria2, selectedFormato, productSearchFilters]);

  useEffect(() => {
    if (maestrosSubTab === 'clients') {
      handleLoadHoldedContacts();
    } else if (maestrosSubTab === 'products') {
      handleLoadHoldedProducts();
    }
  }, [maestrosSubTab]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-red-900 p-3 rounded-xl text-white shadow-lg shadow-red-900/20">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Maestros</h1>
            <p className="text-slate-500">Gestión de productos y clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMaestrosSubTab('products')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${maestrosSubTab === 'products' ? 'bg-red-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Productos
          </button>
          {user?.role !== 'Ventas' && (
            <button 
              onClick={() => setMaestrosSubTab('clients')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${maestrosSubTab === 'clients' ? 'bg-red-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              Clientes
            </button>
          )}
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
          <button 
            onClick={maestrosSubTab === 'products' ? handleLoadHoldedProducts : handleLoadHoldedContacts}
            disabled={isHoldedLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={18} className={isHoldedLoading ? 'animate-spin' : ''} />
            Sincronizar
          </button>
        </div>
      </div>

      {isHoldedLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 size={48} className="animate-spin text-red-900 mb-4" />
          <p className="text-slate-500 font-medium">Cargando datos desde Holded...</p>
        </div>
      ) : holdedError ? (
        <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-4 shadow-sm">
          <AlertCircle size={24} />
          <div>
            <p className="font-bold">Error al cargar datos</p>
            <p className="text-sm opacity-90">{holdedError}</p>
          </div>
        </div>
      ) : (
        <>
          {maestrosSubTab === 'products' && (
            <div className="flex gap-6">
              {/* Sidebar Filters */}
              <div className="w-64 flex-shrink-0 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                    <Filter size={18} className="text-red-900" />
                    Filtros Rápidos
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría 2</label>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSelectedCategoria2('')}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategoria2 === '' ? 'bg-red-50 text-red-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Todas
                        </button>
                        {uniqueCategoria2.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategoria2(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategoria2 === cat ? 'bg-red-50 text-red-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Formato</label>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSelectedFormato('')}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedFormato === '' ? 'bg-red-50 text-red-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Todos
                        </button>
                        {uniqueFormato.map(formato => (
                          <button
                            key={formato}
                            onClick={() => setSelectedFormato(formato)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedFormato === formato ? 'bg-red-50 text-red-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {formato}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 space-y-4">
                {/* Advanced Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={productSearchFilters.name}
                      onChange={(e) => setProductSearchFilters({...productSearchFilters, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all"
                    />
                  </div>
                  <div className="w-48 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="SKU..."
                      value={productSearchFilters.sku}
                      onChange={(e) => setProductSearchFilters({...productSearchFilters, sku: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all"
                    />
                  </div>
                  <div className="w-48 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Categoría 2..."
                      value={productSearchFilters.cat2}
                      onChange={(e) => setProductSearchFilters({...productSearchFilters, cat2: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all"
                    />
                  </div>
                  <div className="w-48 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Formato..."
                      value={productSearchFilters.formato}
                      onChange={(e) => setProductSearchFilters({...productSearchFilters, formato: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Package size={18} className="text-red-900" />
                      Catálogo de Ibéricos
                    </h2>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                      {displayProducts.length} productos
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-bold">SKU</th>
                          <th className="p-4 font-bold">Nombre</th>
                          <th className="p-4 font-bold">Categoría 2</th>
                          <th className="p-4 font-bold">Formato</th>
                          <th className="p-4 font-bold text-right">Precio Base</th>
                          <th className="p-4 font-bold text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayProducts.map((product: any) => {
                          const cat2 = product.attributes?.find((a: any) => a.name === 'Categoria2')?.value || '-';
                          const formato = product.attributes?.find((a: any) => a.name === 'Formato')?.value || '-';
                          
                          return (
                            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-mono text-xs text-slate-500">{product.sku || '-'}</td>
                              <td className="p-4 font-medium text-slate-800">{product.name}</td>
                              <td className="p-4 text-slate-600">
                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                                  {cat2}
                               </span>
                              </td>
                              <td className="p-4 text-slate-600">
                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                                  {formato}
                                </span>
                              </td>
                              <td className="p-4 text-right font-bold text-slate-800">
                                {product.price !== undefined ? `${product.price.toFixed(2)} €` : '-'}
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => handleViewProductDetail(product.id)}
                                  className="p-2 text-slate-400 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Ver detalles"
                                >
                                  <FileText size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {displayProducts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              No se encontraron productos con los filtros actuales.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {maestrosSubTab === 'clients' && user?.role !== 'Ventas' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-red-900" />
                  Directorio de Clientes
                </h2>
                <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                  {holdedContacts.length} clientes
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-bold">Nombre</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Teléfono</th>
                      <th className="p-4 font-bold">NIF/CIF</th>
                      <th className="p-4 font-bold">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holdedContacts.map((contact: any) => (
                      <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{contact.name}</td>
                        <td className="p-4 text-slate-600">{contact.email || '-'}</td>
                        <td className="p-4 text-slate-600">{contact.phone || contact.mobile || '-'}</td>
                        <td className="p-4 text-slate-600 font-mono text-xs">{contact.code || '-'}</td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                            {contact.type || 'Cliente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {holdedContacts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No hay clientes sincronizados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-900">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1">SKU: {selectedProduct.sku || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isProductDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-red-900 mb-4" />
                  <p className="text-slate-500">Cargando detalles...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />
                        Información General
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Precio Base</span>
                          <span className="font-bold text-slate-800">{selectedProduct.price !== undefined ? `${selectedProduct.price.toFixed(2)} €` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Tipo de Producto</span>
                          <span className="font-medium text-slate-800">{selectedProduct.kind || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Impuesto</span>
                          <span className="font-medium text-slate-800">{selectedProduct.taxes?.[0] || '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedProduct.desc && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Descripción</h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                          {selectedProduct.desc}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Filter size={16} className="text-slate-400" />
                      Atributos
                    </h3>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                      {selectedProduct.attributes && selectedProduct.attributes.length > 0 ? (
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {selectedProduct.attributes.map((attr: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-3 px-4 text-slate-500 font-medium w-1/3 bg-slate-100/50">{attr.name}</td>
                                <td className="py-3 px-4 text-slate-800 font-bold">{attr.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No hay atributos definidos para este producto.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
