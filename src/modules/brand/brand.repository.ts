import { RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

interface BrandOfWeekRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  headline: string | null;
  subheadline: string | null;
}

export const getBrandOfWeek = async (): Promise<BrandOfWeekRow | null> => {
  const [rows] = await pool.query<BrandOfWeekRow[]>(
    `
      SELECT
        b.id,
        b.name,
        b.description,
        fb.headline,
        fb.subheadline
      FROM featured_brands AS fb
      INNER JOIN brands AS b
        ON b.id = fb.brand_id
      WHERE NOW() >= fb.start_at
        AND NOW() < fb.end_at
      ORDER BY fb.sort_order ASC
      LIMIT 1
    `,
  );

  return rows[0] ?? null;
};

export const getBrandList = async () => {
  const [rows] = await pool.query(
    `
    SELECT * FROM brands;
    `,
  );

  return rows as any[];
};
