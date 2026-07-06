import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = sql();

  if (req.method === 'GET') {
    const groups = await db`SELECT * FROM product_groups ORDER BY created_at DESC`;
    return res.status(200).json(groups);
  }

  if (req.method === 'POST') {
    const { name, description, color } = req.body ?? {};
    if (!name || !color) {
      return res.status(400).json({ error: 'name e color são obrigatórios' });
    }
    const [group] = await db`
      INSERT INTO product_groups (name, description, color)
      VALUES (${name}, ${description ?? null}, ${color})
      RETURNING *
    `;
    return res.status(201).json(group);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: 'id é obrigatório' });
    }
    await db`DELETE FROM product_groups WHERE id = ${id}`;
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
