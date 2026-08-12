import pool from '../../database/mysql';

export const findCategories = async () => {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      parent_id,
      name,
      depth,
      sort_order
  FROM categories
  ORDER BY depth, sort_order, id;
    `,
  );

  return rows as any[];
};
