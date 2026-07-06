import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Filter, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useInventoryData, ProductGroup, Product, StockMovement } from '@/hooks/useInventoryData';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

// Draw a pie chart on canvas and return as base64 image
const drawPieChart = (data: { name: string; value: number; color: string }[], size: number = 200): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return '';
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;
  
  let currentAngle = -Math.PI / 2;
  
  data.forEach(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    
    currentAngle += sliceAngle;
  });
  
  // Inner circle for donut effect
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  return canvas.toDataURL('image/png');
};

// Draw a bar chart on canvas and return as base64 image
const drawBarChart = (data: { label: string; value: number; color?: string }[], width: number = 400, height: number = 180): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  if (data.length === 0) return '';
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = (width - 60) / data.length - 8;
  const chartHeight = height - 40;
  
  // Background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);
  
  // Grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = 20 + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }
  
  // Bars
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const x = 50 + index * (barWidth + 8) + 4;
    const y = 20 + chartHeight - barHeight;
    
    ctx.fillStyle = item.color || '#22c55e';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Label
    ctx.fillStyle = '#666666';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    const labelText = item.label.length > 6 ? item.label.substring(0, 6) + '...' : item.label;
    ctx.fillText(labelText, x + barWidth / 2, height - 5);
  });
  
  // Y-axis labels
  ctx.fillStyle = '#666666';
  ctx.font = '9px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = Math.round((maxValue / 4) * (4 - i));
    const y = 20 + (chartHeight / 4) * i + 4;
    ctx.fillText(value.toLocaleString('pt-BR'), 45, y);
  }
  
  return canvas.toDataURL('image/png');
};

// Draw a line chart for stock evolution
const drawLineChart = (data: { date: string; entradas: number; saidas: number }[], width: number = 500, height: number = 180): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  if (data.length === 0) return '';
  
  const maxValue = Math.max(...data.flatMap(d => [d.entradas, d.saidas]), 1);
  const chartWidth = width - 70;
  const chartHeight = height - 50;
  const chartTop = 20;
  const chartLeft = 50;
  
  // Background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);
  
  // Grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartLeft + chartWidth, y);
    ctx.stroke();
  }
  
  // Draw lines
  const drawLine = (values: number[], color: string) => {
    if (values.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    values.forEach((value, index) => {
      const x = chartLeft + (index / (values.length - 1)) * chartWidth;
      const y = chartTop + chartHeight - (value / maxValue) * chartHeight;
      
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    values.forEach((value, index) => {
      const x = chartLeft + (index / (values.length - 1)) * chartWidth;
      const y = chartTop + chartHeight - (value / maxValue) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };
  
  drawLine(data.map(d => d.entradas), '#22c55e');
  drawLine(data.map(d => d.saidas), '#ef4444');
  
  // X-axis labels (show first, middle, last)
  ctx.fillStyle = '#666666';
  ctx.font = '9px Arial';
  ctx.textAlign = 'center';
  
  if (data.length > 0) {
    ctx.fillText(data[0].date, chartLeft, height - 5);
    if (data.length > 2) {
      const midIndex = Math.floor(data.length / 2);
      ctx.fillText(data[midIndex].date, chartLeft + chartWidth / 2, height - 5);
    }
    ctx.fillText(data[data.length - 1].date, chartLeft + chartWidth, height - 5);
  }
  
  // Y-axis labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = Math.round((maxValue / 4) * (4 - i));
    const y = chartTop + (chartHeight / 4) * i + 4;
    ctx.fillText(value.toLocaleString('pt-BR'), 45, y);
  }
  
  // Legend
  ctx.font = '10px Arial';
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(width - 120, 5, 10, 10);
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.fillText('Entradas', width - 105, 14);
  
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(width - 60, 5, 10, 10);
  ctx.fillStyle = '#333';
  ctx.fillText('Saídas', width - 45, 14);
  
  return canvas.toDataURL('image/png');
};

type ReportType = 'stock' | 'movements' | 'low-stock';

export function StockReportGenerator() {
  const { groups, products, movements, isLoading } = useInventoryData();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [reportType, setReportType] = useState<ReportType>('stock');
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(34, 197, 94); // Green color
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NUTRIMILHO', 14, 18);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório de Estoque', 14, 28);
      
      // Report info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const reportDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      doc.text(`Gerado em: ${reportDate}`, pageWidth - 14, 45, { align: 'right' });
      
      // Filters info
      let yPos = 55;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Filtros aplicados:', 14, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPos += 8;
      
      const groupName = selectedGroup === 'all' 
        ? 'Todos os grupos' 
        : groups.find(g => g.id === selectedGroup)?.name || 'N/A';
      doc.text(`Grupo: ${groupName}`, 14, yPos);
      
      if (reportType === 'movements' && dateFrom && dateTo) {
        yPos += 6;
        doc.text(`Período: ${format(dateFrom, 'dd/MM/yyyy')} a ${format(dateTo, 'dd/MM/yyyy')}`, 14, yPos);
      }
      
      yPos += 12;
      
      // Filter products by group
      const filteredProducts = selectedGroup === 'all' 
        ? products 
        : products.filter(p => p.group_id === selectedGroup);
      
      if (reportType === 'stock') {
        generateStockReport(doc, filteredProducts, groups, yPos, includeCharts);
      } else if (reportType === 'movements') {
        generateMovementsReport(doc, filteredProducts, movements, groups, yPos, dateFrom, dateTo, includeCharts);
      } else if (reportType === 'low-stock') {
        generateLowStockReport(doc, filteredProducts, groups, yPos, includeCharts);
      }
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Save
      const reportTypeName = {
        'stock': 'estoque',
        'movements': 'movimentacoes',
        'low-stock': 'estoque-baixo'
      }[reportType];
      
      doc.save(`relatorio-${reportTypeName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const generateStockReport = (
    doc: jsPDF, 
    filteredProducts: Product[], 
    groups: ProductGroup[],
    startY: number,
    withCharts: boolean
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Estoque Atual', 14, currentY);
    currentY += 10;
    
    // Add charts if enabled
    if (withCharts) {
      // Prepare data for pie chart - stock by group
      const stockByGroup = groups.map((group, index) => {
        const groupProducts = filteredProducts.filter(p => p.group_id === group.id);
        const totalStock = groupProducts.reduce((acc, p) => acc + p.current_stock, 0);
        return {
          name: group.name,
          value: totalStock,
          color: CHART_COLORS[index % CHART_COLORS.length]
        };
      }).filter(g => g.value > 0);
      
      // Prepare data for bar chart - top 8 products
      const topProducts = [...filteredProducts]
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 8)
        .map((p, i) => ({
          label: p.name,
          value: p.current_stock,
          color: CHART_COLORS[i % CHART_COLORS.length]
        }));
      
      if (stockByGroup.length > 0 && topProducts.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Distribuição por Grupo', 14, currentY);
        doc.text('Top Produtos em Estoque', pageWidth / 2 + 10, currentY);
        currentY += 5;
        
        const pieImage = drawPieChart(stockByGroup, 140);
        const barImage = drawBarChart(topProducts, 180, 120);
        
        if (pieImage) {
          doc.addImage(pieImage, 'PNG', 14, currentY, 70, 70);
        }
        if (barImage) {
          doc.addImage(barImage, 'PNG', pageWidth / 2, currentY, 90, 60);
        }
        
        // Pie chart legend
        let legendY = currentY + 75;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        stockByGroup.slice(0, 6).forEach((item, index) => {
          const x = 14 + (index % 3) * 30;
          const y = legendY + Math.floor(index / 3) * 8;
          doc.setFillColor(parseInt(item.color.slice(1, 3), 16), parseInt(item.color.slice(3, 5), 16), parseInt(item.color.slice(5, 7), 16));
          doc.circle(x + 2, y - 2, 2, 'F');
          doc.setTextColor(80, 80, 80);
          const label = item.name.length > 8 ? item.name.substring(0, 8) + '..' : item.name;
          doc.text(label, x + 6, y);
        });
        doc.setTextColor(0, 0, 0);
        
        currentY += 95;
      }
    }
    
    const tableData = filteredProducts.map(product => {
      const group = groups.find(g => g.id === product.group_id);
      const status = product.min_stock && product.current_stock < product.min_stock 
        ? 'BAIXO' 
        : 'OK';
      
      return [
        product.code,
        product.name,
        group?.name || 'N/A',
        product.current_stock.toLocaleString('pt-BR'),
        product.unit,
        product.min_stock?.toLocaleString('pt-BR') || '-',
        status
      ];
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Produto', 'Grupo', 'Estoque', 'Unidade', 'Mín.', 'Status']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        3: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          if (data.cell.raw === 'BAIXO') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [34, 197, 94];
          }
        }
      }
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de produtos: ${filteredProducts.length}`, 14, finalY + 8);
    
    const lowStockCount = filteredProducts.filter(
      p => p.min_stock && p.current_stock < p.min_stock
    ).length;
    doc.text(`Produtos com estoque baixo: ${lowStockCount}`, 14, finalY + 14);
  };
  
  const generateMovementsReport = (
    doc: jsPDF,
    filteredProducts: Product[],
    movements: StockMovement[],
    groups: ProductGroup[],
    startY: number,
    dateFrom?: Date,
    dateTo?: Date,
    withCharts?: boolean
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Movimentações', 14, currentY);
    currentY += 10;
    
    const productIds = filteredProducts.map(p => p.id);
    let filteredMovements = movements.filter(m => productIds.includes(m.product_id));
    
    if (dateFrom && dateTo) {
      filteredMovements = filteredMovements.filter(m => {
        const moveDate = parseISO(m.created_at);
        return isWithinInterval(moveDate, { start: dateFrom, end: dateTo });
      });
    }
    
    // Add charts if enabled
    if (withCharts && dateFrom && dateTo && filteredMovements.length > 0) {
      // Prepare daily movement data
      const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
      const dailyData = days.map(day => {
        const dayMovements = filteredMovements.filter(m => isSameDay(parseISO(m.created_at), day));
        return {
          date: format(day, 'dd/MM'),
          entradas: dayMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0),
          saidas: dayMovements.filter(m => m.type === 'saida').reduce((sum, m) => sum + m.quantity, 0)
        };
      });
      
      // Show max 15 data points for readability
      const step = Math.max(1, Math.floor(dailyData.length / 15));
      const sampledData = dailyData.filter((_, i) => i % step === 0 || i === dailyData.length - 1);
      
      if (sampledData.length > 1) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Evolução de Movimentações no Período', 14, currentY);
        currentY += 5;
        
        const lineImage = drawLineChart(sampledData, 180, 80);
        if (lineImage) {
          doc.addImage(lineImage, 'PNG', 14, currentY, 180, 60);
        }
        currentY += 70;
      }
      
      // Bar chart for movements by product
      const movementsByProduct: Record<string, { entradas: number; saidas: number }> = {};
      filteredMovements.forEach(m => {
        const product = filteredProducts.find(p => p.id === m.product_id);
        const name = product?.name || 'N/A';
        if (!movementsByProduct[name]) {
          movementsByProduct[name] = { entradas: 0, saidas: 0 };
        }
        if (m.type === 'entrada') {
          movementsByProduct[name].entradas += m.quantity;
        } else {
          movementsByProduct[name].saidas += m.quantity;
        }
      });
      
      const topMovedProducts = Object.entries(movementsByProduct)
        .map(([name, data]) => ({ name, total: data.entradas + data.saidas }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);
      
      if (topMovedProducts.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Produtos com Maior Movimentação', 14, currentY);
        currentY += 5;
        
        const barData = topMovedProducts.map((p, i) => ({
          label: p.name,
          value: p.total,
          color: CHART_COLORS[i % CHART_COLORS.length]
        }));
        const barImage = drawBarChart(barData, 180, 80);
        if (barImage) {
          doc.addImage(barImage, 'PNG', 14, currentY, 180, 50);
        }
        currentY += 60;
      }
    }
    
    const tableData = filteredMovements.map(movement => {
      const product = filteredProducts.find(p => p.id === movement.product_id);
      const group = groups.find(g => g.id === product?.group_id);
      
      return [
        format(parseISO(movement.created_at), 'dd/MM/yyyy HH:mm'),
        movement.type === 'entrada' ? 'Entrada' : 'Saída',
        product?.name || 'N/A',
        group?.name || 'N/A',
        movement.quantity.toLocaleString('pt-BR'),
        movement.previous_stock.toLocaleString('pt-BR'),
        movement.new_stock.toLocaleString('pt-BR'),
        movement.company || '-'
      ];
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Tipo', 'Produto', 'Grupo', 'Qtd', 'Anterior', 'Novo', 'Empresa']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === 'body') {
          if (data.cell.raw === 'Entrada') {
            data.cell.styles.textColor = [34, 197, 94];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, finalY);
    
    const totalEntradas = filteredMovements
      .filter(m => m.type === 'entrada')
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalSaidas = filteredMovements
      .filter(m => m.type === 'saida')
      .reduce((sum, m) => sum + m.quantity, 0);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de movimentações: ${filteredMovements.length}`, 14, finalY + 8);
    doc.text(`Total de entradas: ${totalEntradas.toLocaleString('pt-BR')}`, 14, finalY + 14);
    doc.text(`Total de saídas: ${totalSaidas.toLocaleString('pt-BR')}`, 14, finalY + 20);
  };
  
  const generateLowStockReport = (
    doc: jsPDF,
    filteredProducts: Product[],
    groups: ProductGroup[],
    startY: number,
    withCharts?: boolean
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('⚠ Relatório de Estoque Baixo', 14, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 10;
    
    const lowStockProducts = filteredProducts.filter(
      p => p.min_stock && p.current_stock < p.min_stock
    );
    
    if (lowStockProducts.length === 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum produto com estoque abaixo do mínimo.', 14, currentY);
      return;
    }
    
    // Add charts if enabled
    if (withCharts && lowStockProducts.length > 0) {
      // Bar chart showing deficit by product
      const deficitData = lowStockProducts
        .map(p => ({
          label: p.name,
          value: (p.min_stock || 0) - p.current_stock,
          color: '#ef4444'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      
      if (deficitData.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Déficit por Produto', 14, currentY);
        currentY += 5;
        
        const barImage = drawBarChart(deficitData, 180, 80);
        if (barImage) {
          doc.addImage(barImage, 'PNG', 14, currentY, 180, 50);
        }
        currentY += 60;
      }
      
      // Pie chart showing distribution by group
      const deficitByGroup = groups.map((group, index) => {
        const groupProducts = lowStockProducts.filter(p => p.group_id === group.id);
        const totalDeficit = groupProducts.reduce((acc, p) => acc + ((p.min_stock || 0) - p.current_stock), 0);
        return {
          name: group.name,
          value: totalDeficit,
          color: CHART_COLORS[index % CHART_COLORS.length]
        };
      }).filter(g => g.value > 0);
      
      if (deficitByGroup.length > 1) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Déficit por Grupo', 14, currentY);
        currentY += 5;
        
        const pieImage = drawPieChart(deficitByGroup, 120);
        if (pieImage) {
          doc.addImage(pieImage, 'PNG', 14, currentY, 50, 50);
        }
        
        // Legend
        let legendX = 70;
        let legendY = currentY + 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        deficitByGroup.forEach((item, index) => {
          if (index > 0 && index % 4 === 0) {
            legendY += 20;
            legendX = 70;
          }
          doc.setFillColor(parseInt(item.color.slice(1, 3), 16), parseInt(item.color.slice(3, 5), 16), parseInt(item.color.slice(5, 7), 16));
          doc.circle(legendX + 2, legendY - 2, 2, 'F');
          doc.setTextColor(80, 80, 80);
          const label = item.name.length > 12 ? item.name.substring(0, 12) + '..' : item.name;
          doc.text(`${label}: ${item.value.toLocaleString('pt-BR')}`, legendX + 6, legendY);
          legendY += 10;
        });
        doc.setTextColor(0, 0, 0);
        
        currentY += 60;
      }
    }
    
    const tableData = lowStockProducts.map(product => {
      const group = groups.find(g => g.id === product.group_id);
      const deficit = (product.min_stock || 0) - product.current_stock;
      
      return [
        product.code,
        product.name,
        group?.name || 'N/A',
        product.current_stock.toLocaleString('pt-BR'),
        product.min_stock?.toLocaleString('pt-BR') || '-',
        deficit.toLocaleString('pt-BR'),
        product.unit
      ];
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Produto', 'Grupo', 'Atual', 'Mínimo', 'Déficit', 'Unidade']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">
            Gere relatórios em PDF com filtros personalizados
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <CardDescription>
              Configure os filtros para o relatório
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Estoque Atual</SelectItem>
                  <SelectItem value="movements">Movimentações</SelectItem>
                  <SelectItem value="low-stock">Estoque Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === 'movements' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateFrom && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        locale={ptBR}
                        initialFocus
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
                          'w-full justify-start text-left font-normal',
                          !dateTo && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/30">
              <Checkbox 
                id="includeCharts" 
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked === true)}
              />
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <Label htmlFor="includeCharts" className="cursor-pointer text-sm">
                  Incluir gráficos visuais no relatório
                </Label>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={generatePDF}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Prévia do Relatório</CardTitle>
            <CardDescription>
              Informações que serão incluídas no PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">
                  {reportType === 'stock' && 'Estoque Atual'}
                  {reportType === 'movements' && 'Movimentações'}
                  {reportType === 'low-stock' && 'Estoque Baixo'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grupo:</span>
                <span className="font-medium">
                  {selectedGroup === 'all' 
                    ? 'Todos' 
                    : groups.find(g => g.id === selectedGroup)?.name}
                </span>
              </div>
              
              {reportType === 'movements' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium">
                    {dateFrom && dateTo 
                      ? `${format(dateFrom, 'dd/MM')} - ${format(dateTo, 'dd/MM/yyyy')}`
                      : 'Não definido'}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gráficos:</span>
                <span className={cn("font-medium", includeCharts ? "text-primary" : "text-muted-foreground")}>
                  {includeCharts ? 'Incluídos' : 'Não incluídos'}
                </span>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produtos:</span>
                  <span className="font-medium">
                    {selectedGroup === 'all' 
                      ? products.length 
                      : products.filter(p => p.group_id === selectedGroup).length}
                  </span>
                </div>
                
                {reportType === 'low-stock' && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Com estoque baixo:</span>
                    <span className="font-medium text-destructive">
                      {(selectedGroup === 'all' 
                        ? products 
                        : products.filter(p => p.group_id === selectedGroup)
                      ).filter(p => p.min_stock && p.current_stock < p.min_stock).length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
