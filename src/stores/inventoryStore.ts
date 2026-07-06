import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductGroup, Product, StockMovement } from '@/types/inventory';

interface InventoryState {
  groups: ProductGroup[];
  products: Product[];
  movements: StockMovement[];
  
  // Group actions
  addGroup: (group: Omit<ProductGroup, 'id' | 'createdAt'>) => void;
  updateGroup: (id: string, group: Partial<ProductGroup>) => void;
  deleteGroup: (id: string) => void;
  
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Movement actions
  addMovement: (movement: Omit<StockMovement, 'id' | 'createdAt' | 'previousStock' | 'newStock'>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Initial demo data based on the Excel
const initialGroups: ProductGroup[] = [
  { id: '1', name: 'Produtos Ensacados', description: 'Produtos em sacos', color: '#22c55e', createdAt: new Date() },
  { id: '2', name: 'Produtos em Bags', description: 'Produtos em bags/big bags', color: '#eab308', createdAt: new Date() },
  { id: '3', name: 'Matéria Prima', description: 'Matérias primas para produção', color: '#3b82f6', createdAt: new Date() },
];

const initialProducts: Product[] = [
  { id: '1', groupId: '1', code: 'NF-F28', name: 'N-Form F28', unit: 'unidade', currentStock: 313, minStock: 50, createdAt: new Date() },
  { id: '2', groupId: '1', code: 'NF-D48', name: 'N-Form D48', unit: 'unidade', currentStock: 0, minStock: 20, createdAt: new Date() },
  { id: '3', groupId: '1', code: 'NTG-PRO', name: 'Nutrigel Pro', unit: 'unidade', currentStock: 480, minStock: 100, createdAt: new Date() },
  { id: '4', groupId: '1', code: 'FPC-MST', name: 'Fubá Pre Cozido Master', unit: 'unidade', currentStock: 20685, minStock: 5000, createdAt: new Date() },
  { id: '5', groupId: '1', code: 'HR-MZ', name: 'Harina Maiz', unit: 'unidade', currentStock: 6, minStock: 10, createdAt: new Date() },
  { id: '6', groupId: '1', code: 'HR-FRT', name: 'Harina Fortificada', unit: 'unidade', currentStock: 77, minStock: 20, createdAt: new Date() },
  { id: '7', groupId: '1', code: 'FB-BR', name: 'Fubá Branco', unit: 'unidade', currentStock: 78, minStock: 30, createdAt: new Date() },
  { id: '8', groupId: '2', code: 'NF-F28-BG', name: 'N-Form F28 (Bag)', unit: 'bag', currentStock: 203, minStock: 50, createdAt: new Date() },
  { id: '9', groupId: '2', code: 'NF-D48-BG', name: 'N-Form D48 (Bag)', unit: 'bag', currentStock: 42, minStock: 20, createdAt: new Date() },
  { id: '10', groupId: '2', code: 'GRT-1000', name: 'Grits Nutriflot (1000)', unit: 'bag', currentStock: 6, minStock: 5, createdAt: new Date() },
  { id: '11', groupId: '2', code: 'FF-1400', name: 'Farinha Fina (1400)', unit: 'bag', currentStock: 9, minStock: 10, createdAt: new Date() },
  { id: '12', groupId: '2', code: 'NTG-800', name: 'Nutrigel Pro (800)', unit: 'bag', currentStock: 30, minStock: 15, createdAt: new Date() },
  { id: '13', groupId: '2', code: 'NTG-1000', name: 'Nutrigel Pro (1000)', unit: 'bag', currentStock: 7, minStock: 10, createdAt: new Date() },
  { id: '14', groupId: '2', code: 'NTG-1400', name: 'Nutrigel Pro (1400)', unit: 'bag', currentStock: 54, minStock: 20, createdAt: new Date() },
  { id: '15', groupId: '3', code: 'MLH-GR', name: 'Milho em Grão', unit: 'ton', currentStock: 1250, minStock: 500, createdAt: new Date() },
];

const initialMovements: StockMovement[] = [
  { id: '1', productId: '4', type: 'saida', quantity: 5151, previousStock: 25836, newStock: 20685, notes: '31 avaria', createdAt: new Date() },
  { id: '2', productId: '1', type: 'entrada', quantity: 100, previousStock: 213, newStock: 313, company: 'Fornecedor ABC', createdAt: new Date(Date.now() - 86400000) },
  { id: '3', productId: '3', type: 'entrada', quantity: 200, previousStock: 280, newStock: 480, company: 'Distribuidora XYZ', createdAt: new Date(Date.now() - 172800000) },
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      groups: initialGroups,
      products: initialProducts,
      movements: initialMovements,

      addGroup: (group) => set((state) => ({
        groups: [...state.groups, { ...group, id: generateId(), createdAt: new Date() }]
      })),

      updateGroup: (id, group) => set((state) => ({
        groups: state.groups.map((g) => g.id === id ? { ...g, ...group } : g)
      })),

      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        products: state.products.filter((p) => p.groupId !== id)
      })),

      addProduct: (product) => set((state) => ({
        products: [...state.products, { ...product, id: generateId(), createdAt: new Date() }]
      })),

      updateProduct: (id, product) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, ...product } : p)
      })),

      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        movements: state.movements.filter((m) => m.productId !== id)
      })),

      addMovement: (movement) => {
        const product = get().products.find((p) => p.id === movement.productId);
        if (!product) return;

        const previousStock = product.currentStock;
        const newStock = movement.type === 'entrada' 
          ? previousStock + movement.quantity 
          : previousStock - movement.quantity;

        set((state) => ({
          movements: [...state.movements, {
            ...movement,
            id: generateId(),
            previousStock,
            newStock,
            createdAt: new Date()
          }],
          products: state.products.map((p) => 
            p.id === movement.productId ? { ...p, currentStock: newStock } : p
          )
        }));
      },
    }),
    {
      name: 'nutrimilho-inventory',
    }
  )
);
