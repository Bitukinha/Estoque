import { useInventoryStore } from '@/stores/inventoryStore';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

export function StockCharts() {
  const { products, groups } = useInventoryStore();
  
  const stockByGroup = groups.map((group, index) => {
    const groupProducts = products.filter(p => p.groupId === group.id);
    const totalStock = groupProducts.reduce((acc, p) => acc + p.currentStock, 0);
    return {
      name: group.name,
      value: totalStock,
      color: COLORS[index % COLORS.length]
    };
  }).filter(g => g.value > 0);

  const topProducts = [...products]
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
      estoque: p.currentStock,
    }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="rounded-xl border bg-card p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Estoque por Grupo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={stockByGroup}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {stockByGroup.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => value.toLocaleString('pt-BR') + ' un'}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {stockByGroup.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="rounded-xl border bg-card p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Top Produtos</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
            <YAxis dataKey="name" type="category" width={85} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip 
              formatter={(value: number) => value.toLocaleString('pt-BR') + ' un'}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Bar dataKey="estoque" fill="hsl(145 70% 32%)" radius={[0, 4, 4, 0]} name="Estoque" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
