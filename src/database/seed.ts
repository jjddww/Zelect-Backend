import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

type Category = {
  parent_id: number | null;
  name: string;
  depth: number;
  sort_order: number;
};

type Brand = {
  name: string;
  logo_url: string | null;
  description: string;
  follower_count: number;
};

type Product = {
  brand_id: number;
  category_id: number;
  name: string;
  price: number;
  discount_rate: number;
  description: object;
  status: 'ON_SALE' | 'SOLD_OUT' | 'HIDDEN';
  like_count: number;
  created_at: string;
};

type Exhibition = {
  title: string;
  banner_image_url: string | null;
  start_at: string;
  end_at: string;
  linked_product_ids: number[];
};

function loadJson<T>(filename: string): T {
  const filePath = path.join(__dirname, 'seed', filename);

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

async function seedCategories() {
  console.log('Seeding categories...');

  const categories = loadJson<Category[]>('categories.json');

  const values = categories.map((category) => [
    category.parent_id,
    category.name,
    category.depth,
    category.sort_order,
  ]);

  await connection.query(
    `
    INSERT INTO categories
    (
      parent_id,
      name,
      depth,
      sort_order
    )
    VALUES ?
    `,
    [values],
  );

  console.log(`${categories.length} categories inserted.`);
}

async function seedBrands() {
  console.log('Seeding brands...');

  const brands = loadJson<Brand[]>('brands.json');

  const values = brands.map((brand) => [
    brand.name,
    brand.logo_url,
    brand.description,
    brand.follower_count,
  ]);

  await connection.query(
    `
    INSERT INTO brands
    (
      name,
      logo_url,
      description,
      follower_count
    )
    VALUES ?
    `,
    [values],
  );

  console.log(`${brands.length} brands inserted.`);
}

async function seedProducts() {
  console.log('Seeding products...');

  const products = loadJson<Product[]>('products.json');

  const values = products.map((product) => [
    product.brand_id,
    product.category_id,
    product.name,
    product.price,
    product.discount_rate,
    JSON.stringify(product.description),
    product.status,
    product.like_count,
    product.created_at,
  ]);

  await connection.query(
    `
    INSERT INTO products
    (
      brand_id,
      category_id,
      name,
      price,
      discount_rate,
      description,
      status,
      like_count,
      created_at
    )
    VALUES ?
    `,
    [values],
  );

  console.log(`${products.length} products inserted.`);
}

async function seedExhibitions() {
  console.log('Seeding exhibitions...');

  const exhibitions = loadJson<Exhibition[]>('exhibitions.json');

  const values = exhibitions.map((exhibition) => [
    exhibition.title,
    exhibition.banner_image_url,
    exhibition.start_at,
    exhibition.end_at,
    JSON.stringify(exhibition.linked_product_ids),
  ]);

  await connection.query(
    `
  INSERT INTO exhibitions
  (
    title,
    banner_image_url,
    start_at,
    end_at,
    linked_product_ids
  )
  VALUES ?
  `,
    [values],
  );

  console.log(`${exhibitions.length} exhibitions inserted.`);
}

async function run() {
  try {
    console.log('Deleting old data...');

    // FK 때문에 자식부터 삭제
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    await connection.query('DELETE FROM products');
    await connection.query('DELETE FROM brands');
    await connection.query('DELETE FROM categories');

    // AUTO_INCREMENT 초기화
    await connection.query('ALTER TABLE products AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE brands AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE categories AUTO_INCREMENT = 1');
    // await connection.query("ALTER TABLE exhibition AUTO_INCREMENT = 1");

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await seedCategories();
    await seedBrands();
    await seedProducts();
    await seedExhibitions();

    console.log('Seed Complete');
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

run();
