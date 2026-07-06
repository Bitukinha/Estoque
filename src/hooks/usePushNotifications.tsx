import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsEnabled(result === 'granted');

      if (result === 'granted') {
        toast.success('Notificações push ativadas!');
        // Send test notification
        new Notification('Notificações Ativadas', {
          body: 'Você receberá alertas quando produtos atingirem estoque mínimo.',
          icon: '/favicon.ico',
        });
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão de notificação negada');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificação');
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || !isEnabled) {
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    },
    [isSupported, isEnabled]
  );

  const sendLowStockAlert = useCallback(
    (productName: string, currentStock: number, minStock: number) => {
      return sendNotification('⚠️ Estoque Baixo', {
        body: `${productName} está com ${currentStock} unidades (mínimo: ${minStock})`,
        tag: `low-stock-${productName}`,
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    sendNotification,
    sendLowStockAlert,
  };
}
