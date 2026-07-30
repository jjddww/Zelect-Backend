import pool from '../../database/mysql';

export const findCategories = async () => {
    const [rows] = await pool.query(
        `
        SELECT
            id,
            name
        FROM categories
        WHERE depth = 1
        ORDER BY sort_order
        `,
    );

    return rows as any[];
};