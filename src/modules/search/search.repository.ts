import { RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface SearchProductRow extends RowDataPacket {
  id: number;
  name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  status: 'ACTIVE' | 'SOLD_OUT';
  like_count: number;
  brand_id: number;
  brand_name: string;
  category_id: number;
  category_name: string;
}

interface CountRow extends RowDataPacket {
  total_count: number;
}

const createSearchPattern = (query: string) => `%${query}%`;

export const searchProducts = async (
  query: string,
  limit: number,
  offset: number,
): Promise<SearchProductRow[]> => {
  const pattern = createSearchPattern(query);
  const [rows] = await pool.query<SearchProductRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.price,
        p.discount_rate,
        p.thumbnail_url,
        p.status,
        p.like_count,
        b.id AS brand_id,
        b.name AS brand_name,
        c.id AS category_id,
        c.name AS category_name
      FROM products AS p
      INNER JOIN brands AS b ON b.id = p.brand_id
      INNER JOIN categories AS c ON c.id = p.category_id
      WHERE p.status != 'HIDDEN'
        AND (
          p.name LIKE ?
          OR b.name LIKE ?
          OR c.name LIKE ?
        )
      ORDER BY
        CASE
          WHEN p.name = ? THEN 0
          WHEN p.name LIKE CONCAT(?, '%') THEN 1
          WHEN b.name = ? THEN 2
          WHEN b.name LIKE CONCAT(?, '%') THEN 3
          ELSE 4
        END,
        CASE WHEN p.status = 'SOLD_OUT' THEN 1 ELSE 0 END,
        p.like_count DESC,
        p.id DESC
      LIMIT ? OFFSET ?
    `,
    [pattern, pattern, pattern, query, query, query, query, limit, offset],
  );

  return rows;
};

export const countProducts = async (query: string): Promise<number> => {
  const pattern = createSearchPattern(query);
  const [rows] = await pool.query<CountRow[]>(
    `
      SELECT COUNT(*) AS total_count
      FROM products AS p
      INNER JOIN brands AS b ON b.id = p.brand_id
      INNER JOIN categories AS c ON c.id = p.category_id
      WHERE p.status != 'HIDDEN'
        AND (
          p.name LIKE ?
          OR b.name LIKE ?
          OR c.name LIKE ?
        )
    `,
    [pattern, pattern, pattern],
  );

  return Number(rows[0]?.total_count ?? 0);
};
