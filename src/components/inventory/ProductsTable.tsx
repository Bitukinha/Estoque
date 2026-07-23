import { useState, useMemo } from 'react';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Edit2, Trash2, Package, AlertTriangle, 
  SortAsc, SortDesc, ArrowUpDown, X, ChevronLeft, ChevronRight, FileText, CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatStock } from '@/lib/formatStock';
import type { Product, StockMovement, ProductGroup } from '@/hooks/useInventoryData';

type SortField = 'code' | 'name' | 'group' | 'current_stock' | 'min_stock' | 'status';
type SortDirection = 'asc' | 'desc';

export function ProductsTable() {
  const { products, groups, movements, addProduct, deleteProduct, updateProduct, isAdmin, isLoading } = useInventoryData();

  // PDF date filter state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfProduct, setPdfProduct] = useState<Product | null>(null);
  const [pdfDateFrom, setPdfDateFrom] = useState<Date | undefined>(undefined);
  const [pdfDateTo, setPdfDateTo] = useState<Date | undefined>(undefined);

  const openPdfDialog = (product: Product) => {
    setPdfProduct(product);
    setPdfDateFrom(undefined);
    setPdfDateTo(undefined);
    setPdfDialogOpen(true);
  };

  const generateProductPDF = (product: Product, dateFrom?: Date, dateTo?: Date) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const group = groups.find(g => g.id === product.group_id);
      let productMovements = movements
        .filter(m => m.product_id === product.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply date filter
      if (dateFrom && dateTo) {
        productMovements = productMovements.filter(m => {
          const moveDate = parseISO(m.created_at);
          return isWithinInterval(moveDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
        });
      } else if (dateFrom) {
        productMovements = productMovements.filter(m => parseISO(m.created_at) >= startOfDay(dateFrom));
      } else if (dateTo) {
        productMovements = productMovements.filter(m => parseISO(m.created_at) <= endOfDay(dateTo));
      }

      // Header
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NUTRIMILHO', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Ficha do Produto - Entradas e Saídas', 14, 28);

      // Product info
      doc.setTextColor(0, 0, 0);
      let y = 45;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(product.name, 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Código: ${product.code}`, 14, y);
      doc.text(`Grupo: ${group?.name || 'N/A'}`, 80, y);
      doc.text(`Unidade: ${product.unit === 'kg/ton' ? 'Kg/Tonelada' : product.unit}`, 140, y);
      y += 7;
      doc.text(`Estoque Atual: ${formatStock(product.current_stock, product.unit)}`, 14, y);
      doc.text(`Estoque Mínimo: ${product.min_stock ? formatStock(product.min_stock, product.unit) : '-'}`, 80, y);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - 14, y, { align: 'right' });
      y += 7;
      if (dateFrom || dateTo) {
        doc.setFontSize(9);
        const fromStr = dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'início';
        const toStr = dateTo ? format(dateTo, 'dd/MM/yyyy') : 'hoje';
        doc.text(`Período: ${fromStr} a ${toStr}`, 14, y);
        y += 5;
      }
      y += 5;

      // Summary
      const entries = productMovements.filter(m => m.type === 'entrada');
      const exits = productMovements.filter(m => m.type === 'saida');
      const totalIn = entries.reduce((s, m) => s + m.quantity, 0);
      const totalOut = exits.reduce((s, m) => s + m.quantity, 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo', 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total de Entradas: ${formatStock(totalIn, product.unit)} (${entries.length} movimentações)`, 14, y);
      y += 6;
      doc.text(`Total de Saídas: ${formatStock(totalOut, product.unit)} (${exits.length} movimentações)`, 14, y);
      y += 12;

      // Stock Evolution Chart
      if (productMovements.length >= 2) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Evolução do Estoque', 14, y);
        y += 6;

        // Build chronological data points from movements
        const sortedMoves = [...productMovements].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const dataPoints = sortedMoves.map(m => ({
          date: format(parseISO(m.created_at), 'dd/MM', { locale: ptBR }),
          stock: m.new_stock,
        }));

        const chartX = 14;
        const chartW = pageWidth - 28;
        const chartH = 60;
        const chartY = y;

        // Check if we need a new page
        if (chartY + chartH + 20 > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        const finalChartY = y;

        const maxStock = Math.max(...dataPoints.map(d => d.stock), 1);
        const minStock = Math.min(...dataPoints.map(d => d.stock), 0);
        const range = maxStock - minStock || 1;

        // Background
        doc.setFillColor(249, 250, 251);
        doc.rect(chartX, finalChartY, chartW, chartH, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(chartX, finalChartY, chartW, chartH, 'S');

        // Grid lines (4 horizontal)
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        for (let i = 1; i <= 3; i++) {
          const gy = finalChartY + (chartH / 4) * i;
          doc.line(chartX, gy, chartX + chartW, gy);
        }

        // Y-axis labels
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        for (let i = 0; i <= 4; i++) {
          const val = Math.round(maxStock - (range * i) / 4);
          const gy = finalChartY + (chartH / 4) * i;
          doc.text(val.toString(), chartX - 1, gy + 2, { align: 'right' });
        }

        // Plot line
        const stepX = chartW / Math.max(dataPoints.length - 1, 1);
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(1.5);

        for (let i = 0; i < dataPoints.length - 1; i++) {
          const x1 = chartX + i * stepX;
          const x2 = chartX + (i + 1) * stepX;
          const y1 = finalChartY + chartH - ((dataPoints[i].stock - minStock) / range) * chartH;
          const y2 = finalChartY + chartH - ((dataPoints[i + 1].stock - minStock) / range) * chartH;
          doc.line(x1, y1, x2, y2);
        }

        // Data points (dots)
        doc.setFillColor(34, 197, 94);
        for (let i = 0; i < dataPoints.length; i++) {
          const px = chartX + i * stepX;
          const py = finalChartY + chartH - ((dataPoints[i].stock - minStock) / range) * chartH;
          doc.circle(px, py, 1.5, 'F');
        }

        // X-axis labels (show max ~10 labels)
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6);
        const labelStep = Math.max(1, Math.ceil(dataPoints.length / 10));
        for (let i = 0; i < dataPoints.length; i += labelStep) {
          const px = chartX + i * stepX;
          doc.text(dataPoints[i].date, px, finalChartY + chartH + 6, { align: 'center' });
        }
        // Always show last label
        if ((dataPoints.length - 1) % labelStep !== 0) {
          const px = chartX + (dataPoints.length - 1) * stepX;
          doc.text(dataPoints[dataPoints.length - 1].date, px, finalChartY + chartH + 6, { align: 'center' });
        }

        y = finalChartY + chartH + 14;
        doc.setTextColor(0, 0, 0);
      }

      // Movements table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Movimentações', 14, y);
      y += 4;

      if (productMovements.length === 0) {
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Nenhuma movimentação registrada.', 14, y);
      } else {
        const tableData = productMovements.map(m => [
          format(parseISO(m.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          m.type === 'entrada' ? 'Entrada' : 'Saída',
          m.quantity.toLocaleString('pt-BR'),
          m.previous_stock.toLocaleString('pt-BR'),
          m.new_stock.toLocaleString('pt-BR'),
          m.company || '-',
          m.notes || '-',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Data', 'Tipo', 'Qtd', 'Est. Anterior', 'Est. Novo', 'Empresa', 'Observações']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [34, 197, 94], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
          },
          didParseCell: (data) => {
            if (data.column.index === 1 && data.section === 'body') {
              data.cell.styles.textColor = data.cell.raw === 'Entrada' ? [34, 197, 94] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`produto-${product.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter by group
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [codeError, setCodeError] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group_id: '',
    unit: 'unidade',
    current_stock: 0,
    min_stock: 0
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', group_id: '', unit: 'unidade', current_stock: 0, min_stock: 0 });
    setEditingProduct(null);
    setCodeError('');
  };

  const isCodeDuplicate = (code: string) => {
    return products.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== editingProduct);
  };

  const handleSubmit = () => {
    setCodeError('');
    
    if (!formData.code.trim() || !formData.name.trim() || !formData.group_id) {
      return;
    }

    if (isCodeDuplicate(formData.code)) {
      setCodeError('Este código já está em uso por outro produto');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct, formData);
    } else {
      addProduct(formData);
    }
    resetForm();
    setCodeError('');
    setIsDialogOpen(false);
  };

  const openEditDialog = (product: typeof products[0]) => {
    setFormData({
      code: product.code,
      name: product.name,
      group_id: product.group_id,
      unit: product.unit,
      current_stock: product.current_stock,
      min_stock: product.min_stock || 0
    });
    setEditingProduct(product.id);
    setIsDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getGroupName = (groupId: string) => {
    return groups.find(g => g.id === groupId)?.name || 'Sem grupo';
  };

  const getGroupColor = (groupId: string) => {
    return groups.find(g => g.id === groupId)?.color || '#888';
  };

  const getStockStatus = (product: typeof products[0]): 'ok' | 'low' | 'zero' => {
    if (product.current_stock === 0) return 'zero';
    if (product.min_stock && product.current_stock < product.min_stock) return 'low';
    return 'ok';
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      // Search filter
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Group filter
      if (filterGroup !== 'all' && product.group_id !== filterGroup) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'group':
          comparison = getGroupName(a.group_id).localeCompare(getGroupName(b.group_id));
          break;
        case 'current_stock':
          comparison = a.current_stock - b.current_stock;
          break;
        case 'min_stock':
          comparison = (a.min_stock || 0) - (b.min_stock || 0);
          break;
        case 'status':
          const statusOrder = { zero: 0, low: 1, ok: 2 };
          comparison = statusOrder[getStockStatus(a)] - statusOrder[getStockStatus(b)];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, searchTerm, filterGroup, sortField, sortDirection, groups]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, safePage, itemsPerPage]);

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <SortAsc className="h-3 w-3" />
          ) : (
            <SortDesc className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border bg-card p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">Produtos</h3>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full flex-1 sm:w-auto sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:w-[200px]"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Group filter */}
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add product button */}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Editar Produto' : 'Adicionar Produto'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="productCode">Código</Label>
                      <Input
                        id="productCode"
                        value={formData.code}
                        onChange={(e) => {
                          setFormData({ ...formData, code: e.target.value.toUpperCase() });
                          setCodeError('');
                        }}
                        placeholder="Ex: NF-F28"
                        maxLength={20}
                        className={codeError ? 'border-destructive' : ''}
                      />
                      {codeError && (
                        <p className="text-xs text-destructive">{codeError}</p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="productName">Nome do Produto</Label>
                      <Input
                        id="productName"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Fubá Pre Cozido Master"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productGroup">Grupo</Label>
                    <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productUnit">Unidade</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unidade">Unidade</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="ton">Tonelada</SelectItem>
                          <SelectItem value="kg/ton">Kg/Tonelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productStock">Estoque Inicial</Label>
                      <Input
                        id="productStock"
                        type="number"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productMinStock">Estoque Mínimo</Label>
                    <Input
                      id="productMinStock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="code" className="w-[100px]">Código</SortableHeader>
              <SortableHeader field="name">Produto</SortableHeader>
              <SortableHeader field="group">Grupo</SortableHeader>
              <SortableHeader field="current_stock" className="text-right">Estoque</SortableHeader>
              <SortableHeader field="min_stock" className="text-right">Mínimo</SortableHeader>
              <SortableHeader field="status" className="text-center">Status</SortableHeader>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    {(searchTerm || filterGroup !== 'all') && (
                      <Button variant="link" size="sm" onClick={() => { setSearchTerm(''); setFilterGroup('all'); }}>
                        Limpar busca e filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => {
                const status = getStockStatus(product);
                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      status === 'zero' && 'bg-destructive/10',
                      status === 'low' && 'bg-destructive/5'
                    )}
                  >
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                        {product.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="gap-1"
                        style={{ borderColor: getGroupColor(product.group_id), color: getGroupColor(product.group_id) }}
                      >
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: getGroupColor(product.group_id) }}
                        />
                        {getGroupName(product.group_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatStock(product.current_stock, product.unit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.min_stock ? formatStock(product.min_stock, product.unit) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {status === 'zero' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Zerado
                        </Badge>
                      ) : status === 'low' ? (
                        <Badge className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                          <AlertTriangle className="h-3 w-3" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openPdfDialog(product)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar PDF</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {((safePage - 1) * itemsPerPage) + 1}–{Math.min(safePage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1]) > 1) acc.push('ellipsis');
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(item)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF Date Filter Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar PDF - {pdfProduct?.name}</DialogTitle>
            <DialogDescription>
              Selecione um período para filtrar as movimentações no relatório. Deixe em branco para exportar todo o histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pdfDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pdfDateFrom ? format(pdfDateFrom, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pdfDateFrom}
                      onSelect={setPdfDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pdfDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pdfDateTo ? format(pdfDateTo, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pdfDateTo}
                      onSelect={setPdfDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {(pdfDateFrom || pdfDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setPdfDateFrom(undefined); setPdfDateTo(undefined); }}>
                <X className="h-3 w-3 mr-1" /> Limpar filtro de datas
              </Button>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pdfProduct) {
                  generateProductPDF(pdfProduct, pdfDateFrom, pdfDateTo);
                  setPdfDialogOpen(false);
                }
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
