import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { GroupDashboard } from '@/components/dashboard/GroupDashboard';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion } from 'framer-motion';

const GroupDashboardPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { groups, isLoading } = useInventoryData();

  const groupId = id ?? 'all';
  const group = groups.find((g) => g.id === groupId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok' | 'empty'>('all');
  const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Todos
              </Button>
              {group ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <h2 className="text-xl font-bold" style={{ color: group.color }}>
                    {group.name}
                  </h2>
                </div>
              ) : (
                !isLoading && (
                  <h2 className="text-xl font-bold text-muted-foreground">
                    Grupo não encontrado
                  </h2>
                )
              )}
            </div>
          </div>

          <DashboardStats groupId={groupId} />

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou código..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ok">Estoque OK</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="empty">Sem estoque</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <GroupDashboard groupId={groupId} searchQuery={searchQuery} statusFilter={statusFilter} />
          <RecentMovements groupId={groupId} />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default GroupDashboardPage;
