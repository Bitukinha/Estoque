import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Layers, ExternalLink, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface GroupDashboardProps {
  groupId?: string;
  searchQuery?: string;
  statusFilter?: 'all' | 'low' | 'ok' | 'empty';
}

export function GroupDashboard({ groupId = 'all', searchQuery = '', statusFilter = 'all' }: GroupDashboardProps) {
  const { products, groups: allGroups, movements, isLoading } = useInventoryData();
  const groups = groupId === 'all' ? allGroups : allGroups.filter(g => g.id === groupId);

  const getGroupStats = (groupId: string) => {
    const q = searchQuery.trim().toLowerCase();
    const groupProducts = products
      .filter(p => p.group_id === groupId)
      .filter(p => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.code ?? '').toLowerCase().includes(q)
        );
      })
      .filter(p => {
        if (statusFilter === 'all') return true;
        const min = p.min_stock ?? 0;
        if (statusFilter === 'empty') return p.current_stock <= 0;
        if (statusFilter === 'low') return p.current_stock > 0 && min > 0 && p.current_stock < min;
        if (statusFilter === 'ok') return min === 0 || p.current_stock >= min;
        return true;
      });
    const totalStock = groupProducts.reduce((acc, p) => acc + p.current_stock, 0);
    const lowStockCount = groupProducts.filter(p => p.min_stock && p.current_stock < p.min_stock).length;
    
    const groupProductIds = groupProducts.map(p => p.id);
    const groupMovements = movements.filter(m => groupProductIds.includes(m.product_id));
    const entries = groupMovements.filter(m => m.type === 'entrada').reduce((acc, m) => acc + m.quantity, 0);
    const exits = groupMovements.filter(m => m.type === 'saida').reduce((acc, m) => acc + m.quantity, 0);

    const chartData = groupProducts
      .sort((a, b) => b.current_stock - a.current_stock)
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
        estoque: p.current_stock,
        minimo: p.min_stock || 0
      }));

    return { 
      products: groupProducts, 
      totalStock, 
      lowStockCount, 
      entries, 
      exits, 
      chartData 
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Nenhum grupo cadastrado ainda
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => {
        const stats = getGroupStats(group.id);
        
        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
            className="rounded-2xl border bg-card overflow-hidden"
          >
            {/* Header do Grupo */}
            <div 
              className="p-4 border-b flex items-center gap-3"
              style={{ backgroundColor: `${group.color}15` }}
            >
              <div 
                className="h-4 w-4 rounded-full" 
                style={{ backgroundColor: group.color }}
              />
              <h2 className="text-xl font-bold" style={{ color: group.color }}>
                {group.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                {stats.products.length} produtos
              </span>
              {groupId === 'all' && (
                <Link
                  to={`/dashboard/grupos/${group.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver detalhes
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Stats Cards */}
            <div className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${group.color}20` }}>
                    <Layers className="h-5 w-5" style={{ color: group.color }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Total</p>
                    <p className="text-2xl font-bold">{stats.totalStock.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
                  <div className="rounded-lg bg-success/10 p-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entradas</p>
                    <p className="text-2xl font-bold text-success">+{stats.entries.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
                  <div className="rounded-lg bg-warning/10 p-2">
                    <TrendingDown className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saídas</p>
                    <p className="text-2xl font-bold text-warning">-{stats.exits.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center gap-3 rounded-xl border p-4",
                  stats.lowStockCount > 0 ? "bg-destructive/5 border-destructive/30" : "bg-background"
                )}>
                  <div className={cn(
                    "rounded-lg p-2",
                    stats.lowStockCount > 0 ? "bg-destructive/20" : "bg-muted"
                  )}>
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      stats.lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      stats.lowStockCount > 0 && "text-destructive"
                    )}>
                      {stats.lowStockCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gráfico e Lista de Produtos */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Gráfico de Barras */}
                <div className="rounded-xl border bg-background p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Produtos em Estoque</h3>
                  {stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                        <YAxis dataKey="name" type="category" width={70} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('pt-BR') + ' un'}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }} 
                        />
                        <Bar dataKey="estoque" fill={group.color} radius={[0, 4, 4, 0]} name="Atual" />
                        <Bar dataKey="minimo" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} name="Mínimo" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                      Nenhum produto neste grupo
                    </div>
                  )}
                </div>

                {/* Lista de Produtos */}
                <div className="rounded-xl border bg-background p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Detalhes do Estoque</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {stats.products.length > 0 ? (
                      stats.products.map((product, index) => {
                        const isEmpty = product.current_stock <= 0;
                        const isLow = !isEmpty && product.min_stock && product.current_stock < product.min_stock;
                        return (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                              "flex items-center justify-between rounded-lg p-2.5 text-sm border-l-4 transition-colors",
                              isEmpty
                                ? "bg-destructive/15 border-destructive hover:bg-destructive/20"
                                : isLow
                                ? "bg-warning/15 border-warning hover:bg-warning/20"
                                : "bg-muted/30 border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {product.code}
                              </code>
                              <span className="font-medium truncate max-w-[100px]">{product.name}</span>
                              {isEmpty && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive flex-shrink-0">
                                  <XCircle className="h-3 w-3" />
                                  Sem estoque
                                </span>
                              )}
                              {isLow && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning flex-shrink-0">
                                  <AlertTriangle className="h-3 w-3" />
                                  Baixo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <span className={cn(
                                "font-bold text-xs",
                                isEmpty && "text-destructive",
                                isLow && "text-warning"
                              )}>
                                {product.unit === 'kg/ton' 
                                  ? `${product.current_stock.toLocaleString('pt-BR')} kg / ${(product.current_stock / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`
                                  : product.current_stock.toLocaleString('pt-BR')
                                }
                              </span>
                              <span className="text-muted-foreground text-xs">
                                / {product.min_stock?.toLocaleString('pt-BR') || '-'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="flex h-[180px] items-center justify-center text-muted-foreground">
                        Nenhum produto neste grupo
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
