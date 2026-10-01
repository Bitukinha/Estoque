import { useInventoryData } from '@/hooks/useInventoryData';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { StatCard } from './StatCard';
import { Period, todayPeriod, isInPeriod, periodLabel } from '@/lib/period';

interface DashboardStatsProps {
  groupId?: string; // 'all' or a group id
  period?: Period;
}

export function DashboardStats({ groupId = 'all', period = todayPeriod() }: DashboardStatsProps) {
  const { products: allProducts, groups, movements: allMovements, isLoading } = useInventoryData();

  const products = groupId === 'all'
    ? allProducts
    : allProducts.filter(p => p.group_id === groupId);
  const productIds = new Set(products.map(p => p.id));
  const groupMovements = groupId === 'all'
    ? allMovements
    : allMovements.filter(m => productIds.has(m.product_id));
  const movements = groupMovements.filter(m => isInPeriod(m.created_at, period));

  const lowStockProducts = products.filter(p => p.min_stock && p.current_stock < p.min_stock).length;
  const totalEntries = movements.filter(m => m.type === 'entrada').reduce((acc, m) => acc + m.quantity, 0);
  const totalExits = movements.filter(m => m.type === 'saida').reduce((acc, m) => acc + m.quantity, 0);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={lowStockProducts > 0 ? "grid gap-4 md:grid-cols-2 lg:grid-cols-4" : "grid gap-4 md:grid-cols-3"}>
      <StatCard
        title="Total de Produtos"
        value={products.length}
        subtitle={groupId === 'all' ? `${groups.length} grupos cadastrados` : 'no grupo selecionado'}
        icon={Package}
        variant="default"
        delay={0}
      />
      <StatCard
        title={`Entradas (${periodLabel(period)})`}
        value={totalEntries}
        subtitle="unidades recebidas"
        icon={TrendingUp}
        variant="success"
        delay={0.1}
      />
      <StatCard
        title={`Saídas (${periodLabel(period)})`}
        value={totalExits}
        subtitle="unidades expedidas"
        icon={TrendingDown}
        variant="warning"
        delay={0.2}
      />
      {lowStockProducts > 0 && (
        <StatCard
          title="Estoque Baixo"
          value={lowStockProducts}
          subtitle="produtos abaixo do mínimo"
          icon={AlertTriangle}
          variant="danger"
          delay={0.3}
        />
      )}
    </div>
  );
}
