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

interface ProductDetailRow extends RowDataPacket {
  id: number;
  name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  description: Record<string, unknown> | string | null;
  status: 'ACTIVE' | 'SOLD_OUT';
  like_count: number;
  brand_id: number;
  brand_name: string;
  brand_logo_url: string | null;
  category_id: number;
  category_name: string;
}

interface ProductImageRow extends RowDataPacket {
  id: number;
  image_url: string;
  sort_order: number;
}

interface ProductOptionRow extends RowDataPacket {
  id: number;
  color: string;
  size: string;
  stock_quantity: number;
  additional_price: number;
  status: 'ACTIVE' | 'SOLD_OUT';
}

interface ProductDescriptionRow extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  sort_order: number;
}

export const getProductDetail = async (productId: number) => {
  const [[productRows], [images], [options], [descriptions]] = await Promise.all([
    pool.query<ProductDetailRow[]>(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.discount_rate,
          p.thumbnail_url,
          p.description,
          p.status,
          p.like_count,
          b.id AS brand_id,
          b.name AS brand_name,
          b.logo_url AS brand_logo_url,
          c.id AS category_id,
          c.name AS category_name
        FROM products AS p
        INNER JOIN brands AS b ON b.id = p.brand_id
        INNER JOIN categories AS c ON c.id = p.category_id
        WHERE p.id = ?
          AND p.status != 'HIDDEN'
        LIMIT 1
      `,
      [productId],
    ),
    pool.query<ProductImageRow[]>(
      `
        SELECT id, image_url, sort_order
        FROM product_images
        WHERE product_id = ?
        ORDER BY sort_order, id
      `,
      [productId],
    ),
    pool.query<ProductOptionRow[]>(
      `
        SELECT id, color, size, stock_quantity, additional_price, status
        FROM product_options
        WHERE product_id = ?
          AND status != 'HIDDEN'
        ORDER BY color, size, id
      `,
      [productId],
    ),
    pool.query<ProductDescriptionRow[]>(
      `
        SELECT id, title, content, sort_order
        FROM product_descriptions
        WHERE product_id = ?
        ORDER BY sort_order, id
      `,
      [productId],
    ),
  ]);

  const product = productRows[0];

  if (!product) return null;

  return { product, images, options, descriptions };
};

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
