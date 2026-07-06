import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatStock } from '@/lib/formatStock';

interface RecentMovementsProps {
  groupId?: string;
}

export function RecentMovements({ groupId = 'all' }: RecentMovementsProps) {
  const { movements, products, isLoading } = useInventoryData();

  const filteredMovements = groupId === 'all'
    ? movements
    : movements.filter(m => {
        const prod = products.find(p => p.id === m.product_id);
        return prod?.group_id === groupId;
      });

  const recentMovements = [...filteredMovements]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getProduct = (productId: string) => products.find(p => p.id === productId);
  const getProductName = (productId: string) => getProduct(productId)?.name || 'Produto não encontrado';
  const getProductUnit = (productId: string) => getProduct(productId)?.unit || 'un';

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
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-xl border bg-card p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Movimentações Recentes</h3>
      </div>
      
      <div className="space-y-3">
        {recentMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
        ) : (
          recentMovements.map((movement, index) => (
            <motion.div
              key={movement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                movement.type === 'entrada' ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'
              )}
            >
              <div className="flex items-center gap-3">
                {movement.type === 'entrada' ? (
                  <ArrowDownCircle className="h-5 w-5 text-success" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium">{getProductName(movement.product_id)}</p>
                  <p className="text-sm text-muted-foreground">
                    {movement.type === 'entrada' ? 'Entrada' : 'Saída'} • {formatStock(movement.quantity, getProductUnit(movement.product_id))}
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(movement.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
