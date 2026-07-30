import pool from '../../database/mysql';

export const findExhibitions = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        title,
        banner_image_url,
        start_at,
        end_at
      FROM exhibitions
      WHERE start_at <= NOW()
      AND end_at >= NOW()
      ORDER BY created_at DESC
      `,
  );

  return rows as any[];
};


export const findNewProducts = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        thumbnail_url,
        price,
        discount_rate
      FROM products
      ORDER BY created_at DESC
      LIMIT 5;

    `
  );
  return rows as any[];
};

export const findRecommendations = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        name,
        thumbnail_url,
        price,
        discount_rate
      FROM products
      WHERE status = 'ACTIVE'
      ORDER BY RAND()
      LIMIT 5;
    `
  )

  return rows as any[];
};