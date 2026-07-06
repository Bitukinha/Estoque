import { useInventoryData } from '@/hooks/useInventoryData';
import { Package, Layers, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { StatCard } from './StatCard';

interface DashboardStatsProps {
  groupId?: string; // 'all' or a group id
}

export function DashboardStats({ groupId = 'all' }: DashboardStatsProps) {
  const { products: allProducts, groups, movements: allMovements, isLoading } = useInventoryData();

  const products = groupId === 'all'
    ? allProducts
    : allProducts.filter(p => p.group_id === groupId);
  const productIds = new Set(products.map(p => p.id));
  const movements = groupId === 'all'
    ? allMovements
    : allMovements.filter(m => productIds.has(m.product_id));

  const totalStock = products.reduce((acc, p) => acc + p.current_stock, 0);
  const lowStockProducts = products.filter(p => p.min_stock && p.current_stock < p.min_stock).length;
  const totalEntries = movements.filter(m => m.type === 'entrada').reduce((acc, m) => acc + m.quantity, 0);
  const totalExits = movements.filter(m => m.type === 'saida').reduce((acc, m) => acc + m.quantity, 0);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Produtos"
        value={products.length}
        subtitle={groupId === 'all' ? `${groups.length} grupos cadastrados` : 'no grupo selecionado'}
        icon={Package}
        variant="default"
        delay={0}
      />
      <StatCard
        title="Estoque Total"
        value={totalStock}
        subtitle="unidades em estoque"
        icon={Layers}
        variant="success"
        trend="up"
        delay={0.1}
      />
      <StatCard
        title="Entradas (Mês)"
        value={totalEntries}
        subtitle="unidades recebidas"
        icon={TrendingUp}
        variant="success"
        delay={0.2}
      />
      <StatCard
        title="Saídas (Mês)"
        value={totalExits}
        subtitle="unidades expedidas"
        icon={TrendingDown}
        variant="warning"
        delay={0.3}
      />
      {lowStockProducts > 0 && (
        <StatCard
          title="Estoque Baixo"
          value={lowStockProducts}
          subtitle="produtos abaixo do mínimo"
          icon={AlertTriangle}
          variant="danger"
          delay={0.4}
        />
      )}
    </div>
  );
}
