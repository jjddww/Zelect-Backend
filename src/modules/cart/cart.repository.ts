import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface CartItemRow extends RowDataPacket {
  id: number;
  quantity: number;
  product_option_id: number;
  color: string;
  size: string;
  stock_quantity: number;
  additional_price: number;
  option_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  product_id: number;
  product_name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  product_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  brand_id: number;
  brand_name: string;
}

interface OptionRow extends RowDataPacket {
  stock_quantity: number;
  option_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  product_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
}

interface CartItemQuantityRow extends RowDataPacket {
  quantity: number;
  stock_quantity: number;
  option_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  product_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
}

export type SaveCartItemResult =
  | { status: 'SUCCESS'; cartItemId: number; quantity: number }
  | { status: 'OPTION_NOT_FOUND' }
  | { status: 'NOT_AVAILABLE' }
  | { status: 'OUT_OF_STOCK' };

export type UpdateCartItemResult =
  | { status: 'SUCCESS'; quantity: number }
  | { status: 'NOT_FOUND' }
  | { status: 'NOT_AVAILABLE' }
  | { status: 'OUT_OF_STOCK' };

export const getCartByUserId = async (userId: number): Promise<CartItemRow[]> => {
  const [rows] = await pool.query<CartItemRow[]>(
    `
      SELECT
        ci.id,
        ci.quantity,
        po.id AS product_option_id,
        po.color,
        po.size,
        po.stock_quantity,
        po.additional_price,
        po.status AS option_status,
        p.id AS product_id,
        p.name AS product_name,
        p.price,
        p.discount_rate,
        p.thumbnail_url,
        p.status AS product_status,
        b.id AS brand_id,
        b.name AS brand_name
      FROM cart_items AS ci
      INNER JOIN product_options AS po ON po.id = ci.product_option_id
      INNER JOIN products AS p ON p.id = po.product_id
      INNER JOIN brands AS b ON b.id = p.brand_id
      WHERE ci.user_id = ?
      ORDER BY ci.updated_at DESC, ci.id DESC
    `,
    [userId],
  );

  return rows;
};

export const addItem = async (
  userId: number,
  productOptionId: number,
  quantity: number,
): Promise<SaveCartItemResult> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [options] = await connection.query<OptionRow[]>(
      `
        SELECT
          po.stock_quantity,
          po.status AS option_status,
          p.status AS product_status
        FROM product_options AS po
        INNER JOIN products AS p ON p.id = po.product_id
        WHERE po.id = ?
        FOR UPDATE
      `,
      [productOptionId],
    );
    const option = options[0];

    if (!option) {
      await connection.rollback();
      return { status: 'OPTION_NOT_FOUND' };
    }
    if (option.option_status !== 'ACTIVE' || option.product_status !== 'ACTIVE') {
      await connection.rollback();
      return { status: 'NOT_AVAILABLE' };
    }

    const [items] = await connection.query<CartItemQuantityRow[]>(
      `
        SELECT quantity, 0 AS stock_quantity, 'ACTIVE' AS option_status,
               'ACTIVE' AS product_status
        FROM cart_items
        WHERE user_id = ? AND product_option_id = ?
        FOR UPDATE
      `,
      [userId, productOptionId],
    );
    const nextQuantity = (items[0]?.quantity ?? 0) + quantity;

    if (nextQuantity > option.stock_quantity) {
      await connection.rollback();
      return { status: 'OUT_OF_STOCK' };
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO cart_items (user_id, product_option_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          quantity = quantity + VALUES(quantity),
          updated_at = CURRENT_TIMESTAMP
      `,
      [userId, productOptionId, quantity],
    );

    await connection.commit();
    return { status: 'SUCCESS', cartItemId: result.insertId, quantity: nextQuantity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateQuantity = async (
  userId: number,
  cartItemId: number,
  quantity: number,
): Promise<UpdateCartItemResult> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [items] = await connection.query<CartItemQuantityRow[]>(
      `
        SELECT
          ci.quantity,
          po.stock_quantity,
          po.status AS option_status,
          p.status AS product_status
        FROM cart_items AS ci
        INNER JOIN product_options AS po ON po.id = ci.product_option_id
        INNER JOIN products AS p ON p.id = po.product_id
        WHERE ci.id = ? AND ci.user_id = ?
        FOR UPDATE
      `,
      [cartItemId, userId],
    );
    const item = items[0];

    if (!item) {
      await connection.rollback();
      return { status: 'NOT_FOUND' };
    }
    if (item.option_status !== 'ACTIVE' || item.product_status !== 'ACTIVE') {
      await connection.rollback();
      return { status: 'NOT_AVAILABLE' };
    }
    if (quantity > item.stock_quantity) {
      await connection.rollback();
      return { status: 'OUT_OF_STOCK' };
    }

    await connection.execute(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, cartItemId],
    );
    await connection.commit();
    return { status: 'SUCCESS', quantity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const removeItem = async (userId: number, cartItemId: number): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
    [cartItemId, userId],
  );

  return result.affectedRows > 0;
};
