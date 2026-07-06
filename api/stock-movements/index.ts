import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, pool } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const db = sql();
    const movements = await db`SELECT * FROM stock_movements ORDER BY created_at DESC`;
    return res.status(200).json(movements);
  }

  if (req.method === 'POST') {
    const { product_id, type, quantity, company, notes } = req.body ?? {};

    if (!product_id || !['entrada', 'saida'].includes(type) || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Dados de movimentação inválidos' });
    }

    const dbPool = pool();
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const { rows: productRows } = await client.query(
        'SELECT current_stock FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );
      if (productRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const previousStock = productRows[0].current_stock;
      const newStock = type === 'entrada' ? previousStock + quantity : previousStock - quantity;

      if (newStock < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Estoque insuficiente para esta saída' });
      }

      const { rows: movementRows } = await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, company, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [product_id, type, quantity, previousStock, newStock, company ?? null, notes ?? null]
      );

      await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [
        newStock,
        product_id,
      ]);

      await client.query('COMMIT');
      return res.status(201).json(movementRows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await dbPool.end();
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
