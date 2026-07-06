import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, CheckCheck, AlertTriangle, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLowStockAlerts, LowStockAlert } from '@/hooks/useLowStockAlerts';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AlertItem({ 
  alert, 
  onMarkAsRead 
}: { 
  alert: LowStockAlert; 
  onMarkAsRead: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-3 border-b border-border last:border-b-0 transition-colors ${
        alert.isRead ? 'bg-background opacity-60' : 'bg-accent/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{ backgroundColor: alert.groupColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{alert.productName}</p>
            {!alert.isRead && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => onMarkAsRead(alert.id)}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Código: {alert.productCode} • {alert.groupName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive font-medium">
              {alert.currentStock} / {alert.minStock} unidades
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useLowStockAlerts();
  const { isSupported, isEnabled, requestPermission } = usePushNotifications();
  const prevAlertsRef = useRef<LowStockAlert[]>([]);
  const { sendLowStockAlert } = usePushNotifications();

  // Send push notification for new alerts
  useEffect(() => {
    if (!isEnabled) return;

    const prevAlertIds = new Set(prevAlertsRef.current.map(a => a.id));
    const newAlerts = alerts.filter(a => !prevAlertIds.has(a.id));

    newAlerts.forEach((alert) => {
      sendLowStockAlert(alert.productName, alert.currentStock, alert.minStock);
    });

    prevAlertsRef.current = alerts;
  }, [alerts, isEnabled, sendLowStockAlert]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <AnimatePresence mode="wait">
            {unreadCount > 0 ? (
              <motion.div
                key="bell-ring"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BellRing className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="bell"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Bell className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Alertas de Estoque</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? (
                <X className="h-3 w-3" />
              ) : (
                <Settings className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-sm font-medium">
                    Notificações Push
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receber alertas mesmo com a aba fechada
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={isEnabled}
                  disabled={!isSupported}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      requestPermission();
                    }
                  }}
                />
              </div>
              {!isSupported && (
                <p className="text-xs text-muted-foreground">
                  Seu navegador não suporta notificações push
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum alerta de estoque baixo
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <AnimatePresence>
                    {alerts.map((alert) => (
                      <AlertItem
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!showSettings && alerts.length > 0 && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">
                {alerts.length} produto(s) abaixo do estoque mínimo
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
