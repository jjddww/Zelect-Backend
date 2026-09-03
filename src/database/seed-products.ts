import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

type Product = {
  brand_id: number;
  category_id: number;
  name: string;
  price: number;
  discount_rate: number;
  thumbnail_url: string | null;
  description: object;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  like_count: number;
  created_at: string;
};

type ProductOption = {
  product_id: number;
  color: string;
  size: string;
  stock_quantity: number;
  additional_price: number;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
};

type ProductImage = {
  product_id: number;
  image_url: string;
  sort_order: number;
};

type ProductDescription = {
  product_id: number;
  title: string;
  content: string;
  sort_order: number;
};

const loadJson = <T>(filename: string): T => {
  const filePath = path.join(__dirname, 'seed', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
};

const tableExists = async (connection: mysql.Connection, tableName: string): Promise<boolean> => {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
      LIMIT 1
    `,
    [tableName],
  );
  return rows.length > 0;
};

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const products = loadJson<Product[]>('products.json');
  const options = loadJson<ProductOption[]>('product-options.json');
  const images = loadJson<ProductImage[]>('product-images.json');
  const descriptions = loadJson<ProductDescription[]>('product-descriptions.json');

  try {
    await connection.beginTransaction();

    if (await tableExists(connection, 'product_likes')) {
      await connection.query('DELETE FROM product_likes');
    }
    if (await tableExists(connection, 'cart_items')) {
      await connection.query('DELETE FROM cart_items');
    }
    if (await tableExists(connection, 'order_items')) {
      await connection.query('UPDATE order_items SET product_id = NULL, product_option_id = NULL');
    }

    await connection.query('DELETE FROM product_descriptions');
    await connection.query('DELETE FROM product_options');
    await connection.query('DELETE FROM product_images');
    await connection.query('DELETE FROM products');

    await connection.query(
      `
        INSERT INTO products (
          id, brand_id, category_id, name, price, discount_rate, thumbnail_url,
          description, status, like_count, created_at
        ) VALUES ?
      `,
      [
        products.map((product, index) => [
          index + 1,
          product.brand_id,
          product.category_id,
          product.name,
          product.price,
          product.discount_rate,
          product.thumbnail_url,
          JSON.stringify(product.description),
          product.status,
          product.like_count,
          product.created_at,
        ]),
      ],
    );

    await connection.query(
      `
        INSERT INTO product_options (
          product_id, color, size, stock_quantity, additional_price, status
        ) VALUES ?
      `,
      [
        options.map((option) => [
          option.product_id,
          option.color,
          option.size,
          option.stock_quantity,
          option.additional_price,
          option.status,
        ]),
      ],
    );

    await connection.query(
      'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ?',
      [images.map((image) => [image.product_id, image.image_url, image.sort_order])],
    );

    await connection.query(
      'INSERT INTO product_descriptions (product_id, title, content, sort_order) VALUES ?',
      [
        descriptions.map((description) => [
          description.product_id,
          description.title,
          description.content,
          description.sort_order,
        ]),
      ],
    );

    await connection.commit();
    console.log(
      `Inserted ${products.length} products, ${options.length} options, ${images.length} images, and ${descriptions.length} descriptions.`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
