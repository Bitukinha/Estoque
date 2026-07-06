import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { GroupDashboard } from '@/components/dashboard/GroupDashboard';
import { GroupsManager } from '@/components/inventory/GroupsManager';
import { ProductsTable } from '@/components/inventory/ProductsTable';
import { MovementsManager } from '@/components/inventory/MovementsManager';
import { StockReportGenerator } from '@/components/reports/StockReportGenerator';
import { useInventoryData } from '@/hooks/useInventoryData';
import { motion, AnimatePresence } from 'framer-motion';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showStats, setShowStats] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const { groups } = useInventoryData();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold">Visão Geral</h2>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Filtrar por grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os grupos</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStats(prev => !prev)}
                    className="gap-1 text-muted-foreground"
                  >
                    {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showStats ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
                <AnimatePresence>
                  {showStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <DashboardStats groupId={selectedGroup} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <GroupDashboard groupId={selectedGroup} />
                <RecentMovements groupId={selectedGroup} />
              </div>
            )}

            {activeTab === 'products' && <ProductsTable />}
            
            {activeTab === 'groups' && <GroupsManager />}
            
            {activeTab === 'movements' && <MovementsManager />}
            
            {activeTab === 'reports' && <StockReportGenerator />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
