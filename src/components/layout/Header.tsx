import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import logoNutrimilho from '@/assets/logo-nutrimilho.png';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b bg-card/80 backdrop-blur-md"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={logoNutrimilho}
            alt="Nutrimilho"
            className="h-10 w-auto"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-primary">Controle de Estoque</h1>
            <p className="text-xs text-muted-foreground">Sistema de Gestão de Inventário</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
