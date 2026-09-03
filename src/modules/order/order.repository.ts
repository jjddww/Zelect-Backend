import { RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface OrderListRow extends RowDataPacket {
  id: number;
  order_number: string;
  status: 'ORDERED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
  total_price: number;
  item_count: number;
  representative_product_name: string;
  representative_thumbnail_url: string | null;
  created_at: Date;
}

export interface OrderDetailRow extends RowDataPacket {
  id: number;
  order_number: string;
  status: 'ORDERED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
  items_price: number;
  delivery_fee: number;
  total_price: number;
  recipient_name: string;
  recipient_phone: string;
  zip_code: string;
  address: string;
  address_detail: string | null;
  delivery_request: string | null;
  created_at: Date;
}

export interface OrderItemRow extends RowDataPacket {
  id: number;
  product_id: number | null;
  product_option_id: number | null;
  product_name: string;
  thumbnail_url: string | null;
  color: string;
  size: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface ShipmentRow extends RowDataPacket {
  order_id: number;
  order_number: string;
  order_status: OrderDetailRow['status'];
  shipment_id: number | null;
  shipment_status: 'READY' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
}

interface CountRow extends RowDataPacket {
  total_count: number;
}

export const getOrdersByUserId = async (
  userId: number,
  limit: number,
  offset: number,
): Promise<OrderListRow[]> => {
  const [rows] = await pool.query<OrderListRow[]>(
    `
      SELECT
        o.id,
        o.order_number,
        o.status,
        o.total_price,
        o.created_at,
        COUNT(oi.id) AS item_count,
        SUBSTRING_INDEX(GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR '||'), '||', 1)
          AS representative_product_name,
        SUBSTRING_INDEX(GROUP_CONCAT(COALESCE(oi.thumbnail_url, '') ORDER BY oi.id SEPARATOR '||'), '||', 1)
          AS representative_thumbnail_url
      FROM orders AS o
      INNER JOIN order_items AS oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?
    `,
    [userId, limit, offset],
  );

  return rows;
};

export const countOrdersByUserId = async (userId: number): Promise<number> => {
  const [rows] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS total_count FROM orders WHERE user_id = ?',
    [userId],
  );
  return rows[0].total_count;
};

export const getOrderByIdAndUserId = async (
  orderId: number,
  userId: number,
): Promise<OrderDetailRow | null> => {
  const [rows] = await pool.query<OrderDetailRow[]>(
    `
      SELECT
        id, order_number, status, items_price, delivery_fee, total_price,
        recipient_name, recipient_phone, zip_code, address, address_detail,
        delivery_request, created_at
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    [orderId, userId],
  );
  return rows[0] ?? null;
};

export const getOrderItemsByOrderId = async (orderId: number): Promise<OrderItemRow[]> => {
  const [rows] = await pool.query<OrderItemRow[]>(
    `
      SELECT
        id, product_id, product_option_id, product_name, thumbnail_url,
        color, size, unit_price, quantity, subtotal
      FROM order_items
      WHERE order_id = ?
      ORDER BY id
    `,
    [orderId],
  );
  return rows;
};

export const getShipmentByOrderIdAndUserId = async (
  orderId: number,
  userId: number,
): Promise<ShipmentRow | null> => {
  const [rows] = await pool.query<ShipmentRow[]>(
    `
      SELECT
        o.id AS order_id,
        o.order_number,
        o.status AS order_status,
        s.id AS shipment_id,
        s.status AS shipment_status,
        s.carrier,
        s.tracking_number,
        s.shipped_at,
        s.delivered_at
      FROM orders AS o
      LEFT JOIN shipments AS s ON s.order_id = o.id
      WHERE o.id = ? AND o.user_id = ?
      LIMIT 1
    `,
    [orderId, userId],
  );
  return rows[0] ?? null;
};
