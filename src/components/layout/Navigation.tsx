import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, Layers, ArrowLeftRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'groups', label: 'Grupos', icon: Layers },
  { id: 'movements', label: 'Movimentações', icon: ArrowLeftRight },
  { id: 'reports', label: 'Relatórios', icon: FileText },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-6 flex flex-wrap gap-2 rounded-xl bg-muted/50 p-1.5"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-primary shadow-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className={cn('relative z-10 h-4 w-4', isActive && 'text-primary-foreground')} />
            <span className="relative z-10 hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </motion.nav>
  );
}
