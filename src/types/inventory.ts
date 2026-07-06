export interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  groupId: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock?: number;
  createdAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  company?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalProducts: number;
  totalGroups: number;
  totalEntries: number;
  totalExits: number;
  lowStockProducts: number;
  recentMovements: StockMovement[];
}
