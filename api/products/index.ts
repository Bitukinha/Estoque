import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';

const ALLOWED_FIELDS = ['group_id', 'code', 'name', 'unit', 'current_stock', 'min_stock'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = sql();

  if (req.method === 'GET') {
    const products = await db`
      SELECT
        p.*,
        g.name AS group_name,
        g.color AS group_color
      FROM products p
      LEFT JOIN product_groups g ON g.id = p.group_id
      ORDER BY p.created_at DESC
    `;
    return res.status(200).json(products);
  }

  if (req.method === 'POST') {
    const { group_id, code, name, unit, current_stock, min_stock } = req.body ?? {};
    if (!group_id || !code || !name) {
      return res.status(400).json({ error: 'group_id, code e name são obrigatórios' });
    }
    const [product] = await db`
      INSERT INTO products (group_id, code, name, unit, current_stock, min_stock)
      VALUES (${group_id}, ${code}, ${name}, ${unit ?? 'unidade'}, ${current_stock ?? 0}, ${min_stock ?? 0})
      RETURNING *
    `;
    return res.status(201).json(product);
  }

  if (req.method === 'PATCH') {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: 'id é obrigatório' });
    }
    const updates = req.body ?? {};
    const fields = Object.keys(updates).filter((key) => ALLOWED_FIELDS.includes(key));

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map((field) => updates[field]);
    values.push(id);

    const [product] = await db(
      `UPDATE products SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    return res.status(200).json(product);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: 'id é obrigatório' });
    }
    await db`DELETE FROM products WHERE id = ${id}`;
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
