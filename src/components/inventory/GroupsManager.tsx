import { useState } from 'react';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const groupColors = [
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Ciano', value: '#06b6d4' },
];

export function GroupsManager() {
  const { groups, products, addGroup, deleteGroup, isAdmin, isLoading } = useInventoryData();
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(groupColors[0].value);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addGroup({ name: newGroupName.trim(), description: newGroupDescription.trim(), color: selectedColor });
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedColor(groupColors[0].value);
      setIsDialogOpen(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupProducts = (groupId: string) => {
    return products.filter(p => p.group_id === groupId);
  };

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
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Grupos de Produtos</h3>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nome do Grupo</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Produtos Ensacados"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Descrição (opcional)</Label>
                  <Input
                    id="groupDescription"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Ex: Produtos embalados em sacos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Grupo</Label>
                  <div className="flex gap-2">
                    {groupColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={cn(
                          'h-8 w-8 rounded-full transition-all',
                          selectedColor === color.value && 'ring-2 ring-primary ring-offset-2'
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddGroup} className="w-full">
                  Criar Grupo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado</p>
        ) : (
          groups.map((group, index) => {
            const groupProducts = getGroupProducts(group.id);
            const isExpanded = expandedGroups.has(group.id);
            const totalStock = groupProducts.reduce((acc, p) => acc + p.current_stock, 0);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {groupProducts.length} produtos • {totalStock.toLocaleString('pt-BR')} un
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <AnimatePresence>
                  {isExpanded && groupProducts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-2 space-y-2"
                    >
                      {groupProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between rounded-md bg-muted/30 p-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{product.name}</span>
                          </div>
                          <span className={cn(
                            'font-medium',
                            product.min_stock && product.current_stock < product.min_stock && 'text-destructive'
                          )}>
                            {product.current_stock.toLocaleString('pt-BR')} {product.unit}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
