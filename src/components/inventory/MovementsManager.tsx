import { useState, useMemo } from 'react';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatStock } from '@/lib/formatStock';

export function MovementsManager() {
  const { movements, products, addMovement, isAdmin, isLoading } = useInventoryData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'entrada' as 'entrada' | 'saida',
    quantity: 0,
    notes: '',
    company: ''
  });

  const resetForm = () => {
    setFormData({ product_id: '', type: 'entrada', quantity: 0, notes: '', company: '' });
  };

  const handleSubmit = () => {
    if (formData.product_id && formData.quantity > 0) {
      addMovement({
        product_id: formData.product_id,
        type: formData.type,
        quantity: formData.quantity,
        notes: formData.notes || undefined,
        company: formData.company || undefined,
      });
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto não encontrado';
  };

  const getProductUnit = (productId: string) => {
    return products.find(p => p.id === productId)?.unit || 'un';
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    movements.forEach(m => {
      const monthKey = format(new Date(m.created_at), 'MM/yyyy');
      monthsSet.add(monthKey);
    });
    return Array.from(monthsSet).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      return yearB - yearA || monthB - monthA;
    });
  }, [movements]);

  const sortedMovements = [...movements]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter(m => {
      const matchesSearch = getProductName(m.product_id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || m.type === filterType;
      const matchesProduct = filterProduct === 'all' || m.product_id === filterProduct;
      const matchesMonth = filterMonth === 'all' || format(new Date(m.created_at), 'MM/yyyy') === filterMonth;
      return matchesSearch && matchesType && matchesProduct && matchesMonth;
    });

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">Movimentações</h3>
        <div className="flex flex-wrap gap-3">
          <div className="relative w-full flex-1 sm:w-auto sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:w-[200px]"
            />
          </div>
          <Select value={filterType} onValueChange={(value: typeof filterType) => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map(month => {
                const [m, y] = month.split('/');
                const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                return (
                  <SelectItem key={month} value={month}>
                    {monthNames[parseInt(m) - 1]} / {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Tabs value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as 'entrada' | 'saida' })}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="entrada" className="gap-2">
                        <ArrowDownCircle className="h-4 w-4" />
                        Entrada
                      </TabsTrigger>
                      <TabsTrigger value="saida" className="gap-2">
                        <ArrowUpCircle className="h-4 w-4" />
                        Saída
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="space-y-2">
                    <Label htmlFor="movementProduct">Produto</Label>
                    <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({formatStock(product.current_stock, product.unit)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="movementQuantity">Quantidade</Label>
                    <Input
                      id="movementQuantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>

                  {formData.type === 'entrada' && (
                    <div className="space-y-2">
                      <Label htmlFor="movementCompany">Fornecedor (opcional)</Label>
                      <Input
                        id="movementCompany"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Ex: Fornecedor ABC"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="movementNotes">Observações (opcional)</Label>
                    <Textarea
                      id="movementNotes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Adicione observações..."
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    Registrar {formData.type === 'entrada' ? 'Entrada' : 'Saída'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Estoque Anterior</TableHead>
              <TableHead className="text-right">Novo Estoque</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedMovements.map((movement, index) => (
                <motion.tr
                  key={movement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={cn(
                        'gap-1',
                        movement.type === 'entrada' 
                          ? 'border-success/50 text-success' 
                          : 'border-warning/50 text-warning'
                      )}
                    >
                      {movement.type === 'entrada' ? (
                        <ArrowDownCircle className="h-3 w-3" />
                      ) : (
                        <ArrowUpCircle className="h-3 w-3" />
                      )}
                      {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{getProductName(movement.product_id)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {movement.type === 'entrada' ? '+' : '-'}{formatStock(movement.quantity, getProductUnit(movement.product_id))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatStock(movement.previous_stock, getProductUnit(movement.product_id))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatStock(movement.new_stock, getProductUnit(movement.product_id))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {movement.company && <span className="font-medium">{movement.company}</span>}
                    {movement.company && movement.notes && ' • '}
                    {movement.notes}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
