import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface CreateOrderInput {
  cartItemIds: number[];
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail?: string | null;
  deliveryRequest?: string | null;
}

interface CheckoutItemRow extends RowDataPacket {
  cart_item_id: number;
  product_option_id: number;
  quantity: number;
  stock_quantity: number;
  option_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  product_status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  product_id: number;
  product_name: string;
  thumbnail_url: string | null;
  color: string;
  size: string;
  unit_price: number;
}

export type CreateOrderResult =
  | {
      status: 'SUCCESS';
      orderId: number;
      orderNumber: string;
      paymentId: string;
      totalPrice: number;
    }
  | { status: 'CART_ITEM_NOT_FOUND' | 'NOT_AVAILABLE' | 'OUT_OF_STOCK' };

export const createPendingOrder = async (
  userId: number,
  input: CreateOrderInput,
  orderNumber: string,
  paymentId: string,
): Promise<CreateOrderResult> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const placeholders = input.cartItemIds.map(() => '?').join(', ');
    const [items] = await connection.query<CheckoutItemRow[]>(
      `
        SELECT ci.id AS cart_item_id, ci.product_option_id, ci.quantity,
               po.stock_quantity, po.status AS option_status,
               p.status AS product_status, p.id AS product_id, p.name AS product_name,
               p.thumbnail_url, po.color, po.size,
               FLOOR(p.price * (1 - p.discount_rate / 100)) + po.additional_price AS unit_price
        FROM cart_items AS ci
        INNER JOIN product_options AS po ON po.id = ci.product_option_id
        INNER JOIN products AS p ON p.id = po.product_id
        WHERE ci.user_id = ? AND ci.id IN (${placeholders})
        ORDER BY ci.id
        FOR UPDATE
      `,
      [userId, ...input.cartItemIds],
    );

    if (items.length !== input.cartItemIds.length) {
      await connection.rollback();
      return { status: 'CART_ITEM_NOT_FOUND' };
    }
    if (items.some((item) => item.option_status !== 'ACTIVE' || item.product_status !== 'ACTIVE')) {
      await connection.rollback();
      return { status: 'NOT_AVAILABLE' };
    }
    if (items.some((item) => item.quantity > item.stock_quantity)) {
      await connection.rollback();
      return { status: 'OUT_OF_STOCK' };
    }

    const itemsPrice = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const deliveryFee = 0;
    const totalPrice = itemsPrice + deliveryFee;
    const [orderResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO orders (
          user_id, order_number, status, items_price, delivery_fee, total_price,
          recipient_name, recipient_phone, zip_code, address, address_detail, delivery_request
        ) VALUES (?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        orderNumber,
        itemsPrice,
        deliveryFee,
        totalPrice,
        input.recipientName,
        input.recipientPhone,
        input.zipCode,
        input.address,
        input.addressDetail ?? null,
        input.deliveryRequest ?? null,
      ],
    );

    const orderId = orderResult.insertId;
    for (const item of items) {
      await connection.execute(
        `
          INSERT INTO order_items (
            order_id, source_cart_item_id, product_id, product_option_id, product_name,
            thumbnail_url, color, size, unit_price, quantity, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.cart_item_id,
          item.product_id,
          item.product_option_id,
          item.product_name,
          item.thumbnail_url,
          item.color,
          item.size,
          item.unit_price,
          item.quantity,
          item.unit_price * item.quantity,
        ],
      );
    }

    await connection.execute(
      `INSERT INTO payments (order_id, payment_id, status, amount, currency)
       VALUES (?, ?, 'PENDING_PAYMENT', ?, 'KRW')`,
      [orderId, paymentId, totalPrice],
    );

    await connection.commit();
    return { status: 'SUCCESS', orderId, orderNumber, paymentId, totalPrice };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export interface OrderListRow extends RowDataPacket {
  id: number;
  order_number: string;
  status: 'PENDING_PAYMENT' | 'ORDERED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
  total_price: number;
  item_count: number;
  representative_product_name: string;
  representative_thumbnail_url: string | null;
  created_at: Date;
}

export interface OrderDetailRow extends RowDataPacket {
  id: number;
  order_number: string;
  status: 'PENDING_PAYMENT' | 'ORDERED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
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
