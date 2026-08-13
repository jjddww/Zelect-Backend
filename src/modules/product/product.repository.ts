import pool from '../../database/mysql';
import { RowDataPacket } from 'mysql2';

interface ProductListRow extends RowDataPacket {
  id: number;
  name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  like_count: number;
  brand_id: number;
  brand_name: string;
}

export const getProductByBrand = async (
  brandId: number,
  limit: number,
  offset: number,
): Promise<ProductListRow[]> => {
  const [rows] = await pool.query<ProductListRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.price,
        p.discount_rate,
        p.thumbnail_url,
        p.like_count,
        b.id AS brand_id,
        b.name AS brand_name
      FROM products AS p
      INNER JOIN brands AS b
        ON b.id = p.brand_id
      WHERE p.brand_id = ?
        AND p.status = 'ACTIVE'
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?
      OFFSET ?
    `,
    [brandId, limit, offset],
  );

  return rows;
};

export const getProductsByCategory = async (
  categoryId: number,
  limit: number,
  offset: number,
): Promise<ProductListRow[]> => {
  const [rows] = await pool.query<ProductListRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.price,
        p.discount_rate,
        p.thumbnail_url,
        p.like_count,
        b.id AS brand_id,
        b.name AS brand_name
      FROM products AS p
      INNER JOIN brands AS b
        ON b.id = p.brand_id
      WHERE p.category_id = ?
        AND p.status = 'ACTIVE'
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?
      OFFSET ?
    `,
    [categoryId, limit, offset],
  );

  return rows;
};
