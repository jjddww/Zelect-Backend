import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface LikedProductRow extends RowDataPacket {
  id: number;
  name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  like_count: number;
  brand_id: number;
  brand_name: string;
}

interface ProductLikeCountRow extends RowDataPacket {
  like_count: number;
}

export interface LikeResult {
  likeCount: number;
}

export const getLikedProducts = async (userId: number): Promise<LikedProductRow[]> => {
  const [rows] = await pool.query<LikedProductRow[]>(
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
      FROM product_likes AS pl
      INNER JOIN products AS p
        ON p.id = pl.product_id
      INNER JOIN brands AS b
        ON b.id = p.brand_id
      WHERE pl.user_id = ?
        AND p.status != 'HIDDEN'
      ORDER BY pl.created_at DESC, p.id DESC
    `,
    [userId],
  );

  return rows;
};

export const addLike = async (userId: number, productId: number): Promise<LikeResult | null> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query<ProductLikeCountRow[]>(
      `
        SELECT like_count
        FROM products
        WHERE id = ?
          AND status != 'HIDDEN'
        FOR UPDATE
      `,
      [productId],
    );

    const product = products[0];

    if (!product) {
      await connection.rollback();
      return null;
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT IGNORE INTO product_likes (
          user_id,
          product_id
        )
        VALUES (?, ?)
      `,
      [userId, productId],
    );

    if (insertResult.affectedRows > 0) {
      await connection.execute(
        `
          UPDATE products
          SET like_count = like_count + 1
          WHERE id = ?
        `,
        [productId],
      );
    }

    const likeCount = product.like_count + (insertResult.affectedRows > 0 ? 1 : 0);

    await connection.commit();

    return {
      likeCount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const removeLike = async (userId: number, productId: number): Promise<LikeResult | null> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query<ProductLikeCountRow[]>(
      `
        SELECT like_count
        FROM products
        WHERE id = ?
        FOR UPDATE
      `,
      [productId],
    );

    const product = products[0];

    if (!product) {
      await connection.rollback();
      return null;
    }

    const [deleteResult] = await connection.execute<ResultSetHeader>(
      `
        DELETE FROM product_likes
        WHERE user_id = ?
          AND product_id = ?
      `,
      [userId, productId],
    );

    if (deleteResult.affectedRows > 0) {
      await connection.execute(
        `
          UPDATE products
          SET like_count = GREATEST(like_count - 1, 0)
          WHERE id = ?
        `,
        [productId],
      );
    }

    const likeCount =
      deleteResult.affectedRows > 0 ? Math.max(product.like_count - 1, 0) : product.like_count;

    await connection.commit();

    return {
      likeCount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
