import { useState, useEffect, useCallback } from 'react';

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  minStock: number;
  groupName: string;
  groupColor: string;
  createdAt: Date;
  isRead: boolean;
}

interface ProductWithGroup {
  id: string;
  name: string;
  code: string;
  current_stock: number;
  min_stock: number | null;
  group_id: string;
  group_name: string | null;
  group_color: string | null;
}

export function useLowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLowStockProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Erro ao buscar produtos');
      const products: ProductWithGroup[] = await res.json();

      const lowStockProducts = products.filter(
        (p) => p.min_stock != null && p.current_stock <= p.min_stock
      );

      const newAlerts: LowStockAlert[] = lowStockProducts.map((product) => ({
        id: `alert-${product.id}`,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        currentStock: product.current_stock,
        minStock: product.min_stock || 0,
        groupName: product.group_name || 'Sem grupo',
        groupColor: product.group_color || '#888888',
        createdAt: new Date(),
        isRead: false,
      }));

      // Preserve read state from previous alerts
      setAlerts((prevAlerts) => {
        const readAlertIds = new Set(
          prevAlerts.filter((a) => a.isRead).map((a) => a.id)
        );
        return newAlerts.map((alert) => ({
          ...alert,
          isRead: readAlertIds.has(alert.id),
        }));
      });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStockProducts();

    // Poll every 5 minutes
    const interval = setInterval(fetchLowStockProducts, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchLowStockProducts]);

  const markAsRead = useCallback((alertId: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => ({ ...alert, isRead: true }))
    );
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchLowStockProducts,
  };
}
