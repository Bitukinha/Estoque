import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface ProductGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  group_id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'entrada' | 'saida';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  company: string | null;
  notes: string | null;
  created_at: string;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erro na requisição');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useInventoryData() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groupsData, productsData, movementsData] = await Promise.all([
        api<ProductGroup[]>('/api/product-groups'),
        api<Product[]>('/api/products'),
        api<StockMovement[]>('/api/stock-movements'),
      ]);

      setGroups(groupsData);
      setProducts(productsData);
      setMovements(movementsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group actions
  const addGroup = async (group: { name: string; description?: string; color: string }) => {
    try {
      const data = await api<ProductGroup>('/api/product-groups', {
        method: 'POST',
        body: JSON.stringify(group),
      });
      setGroups((prev) => [data, ...prev]);
      toast.success('Grupo criado com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar grupo');
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await api(`/api/product-groups?id=${id}`, { method: 'DELETE' });
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setProducts((prev) => prev.filter((p) => p.group_id !== id));
      toast.success('Grupo excluído com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir grupo');
    }
  };

  // Product actions
  const addProduct = async (product: {
    group_id: string;
    code: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock?: number;
  }) => {
    try {
      const data = await api<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
      setProducts((prev) => [data, ...prev]);
      toast.success('Produto criado com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar produto');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const data = await api<Product>(`/api/products?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setProducts((prev) => prev.map((p) => (p.id === id ? data : p)));
      toast.success('Produto atualizado com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api(`/api/products?id=${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setMovements((prev) => prev.filter((m) => m.product_id !== id));
      toast.success('Produto excluído com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir produto');
    }
  };

  // Movement actions
  const addMovement = async (movement: {
    product_id: string;
    type: 'entrada' | 'saida';
    quantity: number;
    company?: string;
    notes?: string;
  }) => {
    try {
      const data = await api<StockMovement>('/api/stock-movements', {
        method: 'POST',
        body: JSON.stringify(movement),
      });
      setMovements((prev) => [data, ...prev]);
      setProducts((prev) =>
        prev.map((p) => (p.id === movement.product_id ? { ...p, current_stock: data.new_stock } : p))
      );
      toast.success('Movimentação registrada com sucesso');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao registrar movimentação');
    }
  };

  return {
    groups,
    products,
    movements,
    isLoading,
    isAdmin: true,
    addGroup,
    deleteGroup,
    addProduct,
    updateProduct,
    deleteProduct,
    addMovement,
    refetch: fetchData,
  };
}
