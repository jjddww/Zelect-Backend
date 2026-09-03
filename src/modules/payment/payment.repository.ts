// payments/orders/재고 DB 작업
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import pool from '../../database/mysql';

export interface PaymentOrderRow extends RowDataPacket {
  payment_id: string;
  payment_status: 'PENDING_PAYMENT' | 'PAID' | 'PARTIALLY_CANCELED' | 'FAILED' | 'CANCELED';
  amount: number;
  currency: string;
  canceled_amount: number;

  order_id: number;
  order_number: string;
  order_status: 'PENDING_PAYMENT' | 'ORDERED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';

  user_id: number;
}

interface OrderStockItemRow extends RowDataPacket {
  product_option_id: number | null;
  quantity: number;
}

export type CompletePaymentResult =
  | 'COMPLETED'
  | 'ALREADY_PAID'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'CANCELED';

export type SyncPaymentResult = 'UPDATED' | 'UNCHANGED' | 'NOT_FOUND';

export const getPaymentOrder = async (
  paymentId: string,
  userId?: number,
): Promise<PaymentOrderRow | null> => {
  const params: Array<string | number> = [paymentId];
  const userCondition = userId === undefined ? '' : ' AND o.user_id = ?';

  if (userId !== undefined) {
    params.push(userId);
  }

  const [rows] = await pool.query<PaymentOrderRow[]>(
    `
      SELECT
        p.payment_id,
        p.status AS payment_status,
        p.amount,
        p.currency,
        p.canceled_amount,
        o.id AS order_id,
        o.order_number,
        o.status AS order_status,
        o.user_id
      FROM payments AS p
      INNER JOIN orders AS o
        ON o.id = p.order_id
      WHERE p.payment_id = ?
      ${userCondition}
      LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
};

const lockPaymentOrder = async (
  connection: PoolConnection,
  paymentId: string,
): Promise<PaymentOrderRow | null> => {
  const [rows] = await connection.query<PaymentOrderRow[]>(
    `
      SELECT
        p.payment_id,
        p.status AS payment_status,
        p.amount,
        p.currency,
        p.canceled_amount,
        o.id AS order_id,
        o.order_number,
        o.status AS order_status,
        o.user_id
      FROM payments AS p
      INNER JOIN orders AS o
        ON o.id = p.order_id
      WHERE p.payment_id = ?
      FOR UPDATE
    `,
    [paymentId],
  ); //for update => 중복 요청 방지

  return rows[0] ?? null;
};

/**
 * completePayment의 트랜잭션에서 아래 4가지 작업은 모두 성공하거나 모두 실패함.
1. 재고 차감
2. payments.status = PAID
3. orders.status = ORDERED
4. 주문에 사용한 장바구니 항목 삭제
 */

export const applyPaid = async (
  paymentId: string,
  transactionId: string,
  paidAt: Date,
): Promise<CompletePaymentResult> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const payment = await lockPaymentOrder(connection, paymentId);

    if (!payment) {
      await connection.rollback();
      return 'NOT_FOUND';
    }

    // 이미 처리한 요청이면 재고를 다시 차감하지 않는다.
    if (payment.payment_status === 'PAID' || payment.payment_status === 'PARTIALLY_CANCELED') {
      await connection.commit();
      return 'ALREADY_PAID';
    }
    if (payment.payment_status === 'CANCELED') {
      await connection.commit();
      return 'CANCELED';
    }

    const [items] = await connection.query<OrderStockItemRow[]>(
      `
        SELECT
          oi.product_option_id,
          oi.quantity
        FROM order_items AS oi
        LEFT JOIN product_options AS po
          ON po.id = oi.product_option_id
        WHERE oi.order_id = ?
        ORDER BY oi.product_option_id
        FOR UPDATE
      `,
      [payment.order_id],
    );

    if (items.length === 0 || items.some((item) => item.product_option_id === null)) {
      await connection.rollback();
      return 'OUT_OF_STOCK';
    }

    for (const item of items) {
      const [result] = await connection.execute<ResultSetHeader>(
        `
            UPDATE product_options
            SET
              stock_quantity = stock_quantity - ?,
              status = IF(
                stock_quantity - ? = 0,
                'SOLD_OUT',
                status
              )
            WHERE id = ?
              AND status = 'ACTIVE'
              AND stock_quantity >= ?
          `,
        [item.quantity, item.quantity, item.product_option_id, item.quantity],
      );

      if (result.affectedRows !== 1) {
        await connection.rollback();
        return 'OUT_OF_STOCK';
      }
    }

    await connection.execute(
      `
        UPDATE payments
        SET
          status = 'PAID',
          transaction_id = ?,
          paid_at = ?
        WHERE payment_id = ?
      `,
      [transactionId, paidAt, paymentId],
    );

    await connection.execute(
      `
        UPDATE orders
        SET status = 'ORDERED'
        WHERE id = ?
      `,
      [payment.order_id],
    );

    await connection.execute(
      `
        DELETE ci
        FROM cart_items AS ci
        INNER JOIN order_items AS oi
          ON oi.source_cart_item_id = ci.id
        WHERE oi.order_id = ?
          AND ci.user_id = ?
      `,
      [payment.order_id, payment.user_id],
    );

    await connection.commit();
    return 'COMPLETED';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const applyFailed = async (
  paymentId: string,
  transactionId: string,
): Promise<SyncPaymentResult> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payment = await lockPaymentOrder(connection, paymentId);
    if (!payment) {
      await connection.rollback();
      return 'NOT_FOUND';
    }
    if (payment.payment_status !== 'PENDING_PAYMENT' && payment.payment_status !== 'FAILED') {
      await connection.commit();
      return 'UNCHANGED';
    }
    await connection.execute(
      `UPDATE payments SET status = 'FAILED', transaction_id = ? WHERE payment_id = ?`,
      [transactionId, paymentId],
    );
    await connection.commit();
    return payment.payment_status === 'FAILED' ? 'UNCHANGED' : 'UPDATED';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const applyPartialCancellation = async (
  paymentId: string,
  transactionId: string,
  canceledAmount: number,
): Promise<SyncPaymentResult> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payment = await lockPaymentOrder(connection, paymentId);
    if (!payment) {
      await connection.rollback();
      return 'NOT_FOUND';
    }
    if (payment.payment_status === 'CANCELED') {
      await connection.commit();
      return 'UNCHANGED';
    }
    const unchanged =
      payment.payment_status === 'PARTIALLY_CANCELED' &&
      payment.canceled_amount === canceledAmount;
    await connection.execute(
      `UPDATE payments
       SET status = 'PARTIALLY_CANCELED', transaction_id = ?, canceled_amount = ?
       WHERE payment_id = ?`,
      [transactionId, canceledAmount, paymentId],
    );
    await connection.commit();
    return unchanged ? 'UNCHANGED' : 'UPDATED';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const applyCancellation = async (
  paymentId: string,
  transactionId: string,
  canceledAmount: number,
): Promise<SyncPaymentResult> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payment = await lockPaymentOrder(connection, paymentId);
    if (!payment) {
      await connection.rollback();
      return 'NOT_FOUND';
    }
    if (payment.payment_status === 'CANCELED') {
      await connection.commit();
      return 'UNCHANGED';
    }
    await connection.execute(
      `UPDATE payments
       SET status = 'CANCELED', transaction_id = ?, canceled_amount = ?
       WHERE payment_id = ?`,
      [transactionId, canceledAmount, paymentId],
    );
    await connection.execute(`UPDATE orders SET status = 'CANCELED' WHERE id = ?`, [
      payment.order_id,
    ]);
    await connection.commit();
    return 'UPDATED';
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

interface CancellationRow extends RowDataPacket {
  id: number;
  payment_id: string;
  request_id: string;
  portone_cancellation_id: string | null;
  status: 'REQUESTED' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  reason: string;
  stock_restored: number;
}

interface CancellableOrderItemRow extends RowDataPacket {
  id: number;
  product_option_id: number | null;
  unit_price: number;
  quantity: number;
  canceled_quantity: number;
}

interface CancellationItemRow extends RowDataPacket {
  order_item_id: number;
  product_option_id: number | null;
  quantity: number;
}

export interface PrepareCancellationInput {
  requestId: string;
  reason: string;
  items: Array<{ orderItemId: number; quantity: number }>;
}

export type PrepareCancellationResult =
  | {
      status: 'READY';
      cancellationId: number;
      amount: number;
      currentCancellableAmount: number;
      reason: string;
    }
  | { status: 'EXISTING'; cancellation: CancellationRow }
  | { status: 'NOT_FOUND' | 'NOT_CANCELLABLE' | 'INVALID_QUANTITY' };

export const prepareItemCancellation = async (
  userId: number,
  paymentId: string,
  input: PrepareCancellationInput,
): Promise<PrepareCancellationResult> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payment = await lockPaymentOrder(connection, paymentId);
    if (!payment || payment.user_id !== userId) {
      await connection.rollback();
      return { status: 'NOT_FOUND' };
    }
    const [existingRows] = await connection.query<CancellationRow[]>(
      `SELECT * FROM payment_cancellations
       WHERE payment_id = ? AND request_id = ? FOR UPDATE`,
      [paymentId, input.requestId],
    );
    if (existingRows[0]) {
      await connection.commit();
      return { status: 'EXISTING', cancellation: existingRows[0] };
    }
    if (
      (payment.payment_status !== 'PAID' && payment.payment_status !== 'PARTIALLY_CANCELED') ||
      payment.order_status !== 'ORDERED'
    ) {
      await connection.rollback();
      return { status: 'NOT_CANCELLABLE' };
    }

    const uniqueIds = [...new Set(input.items.map((item) => item.orderItemId))];
    if (uniqueIds.length !== input.items.length) {
      await connection.rollback();
      return { status: 'INVALID_QUANTITY' };
    }
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const [orderItems] = await connection.query<CancellableOrderItemRow[]>(
      `
        SELECT oi.id, oi.product_option_id, oi.unit_price, oi.quantity,
               COALESCE(SUM(CASE WHEN pc.status IN ('REQUESTED', 'SUCCEEDED')
                                 THEN pci.quantity ELSE 0 END), 0) AS canceled_quantity
        FROM order_items AS oi
        LEFT JOIN payment_cancellation_items AS pci ON pci.order_item_id = oi.id
        LEFT JOIN payment_cancellations AS pc ON pc.id = pci.cancellation_id
        WHERE oi.order_id = ? AND oi.id IN (${placeholders})
        GROUP BY oi.id
        FOR UPDATE
      `,
      [payment.order_id, ...uniqueIds],
    );
    if (orderItems.length !== input.items.length) {
      await connection.rollback();
      return { status: 'NOT_FOUND' };
    }

    let amount = 0;
    for (const requested of input.items) {
      const item = orderItems.find((candidate) => candidate.id === requested.orderItemId)!;
      if (requested.quantity > item.quantity - Number(item.canceled_quantity)) {
        await connection.rollback();
        return { status: 'INVALID_QUANTITY' };
      }
      amount += item.unit_price * requested.quantity;
    }
    const currentCancellableAmount = payment.amount - payment.canceled_amount;
    if (amount <= 0 || amount > currentCancellableAmount) {
      await connection.rollback();
      return { status: 'INVALID_QUANTITY' };
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO payment_cancellations
         (payment_id, request_id, status, amount, reason)
       VALUES (?, ?, 'REQUESTED', ?, ?)`,
      [paymentId, input.requestId, amount, input.reason],
    );
    for (const requested of input.items) {
      await connection.execute(
        `INSERT INTO payment_cancellation_items
           (cancellation_id, order_item_id, quantity, amount)
         SELECT ?, id, ?, unit_price * ? FROM order_items WHERE id = ?`,
        [result.insertId, requested.quantity, requested.quantity, requested.orderItemId],
      );
    }
    await connection.commit();
    return {
      status: 'READY',
      cancellationId: result.insertId,
      amount,
      currentCancellableAmount,
      reason: input.reason,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const recordCancellationResult = async (
  cancellationId: number,
  portOneCancellationId: string,
  status: 'REQUESTED' | 'SUCCEEDED' | 'FAILED',
): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<CancellationRow[]>(
      `SELECT * FROM payment_cancellations WHERE id = ? FOR UPDATE`,
      [cancellationId],
    );
    const cancellation = rows[0];
    if (!cancellation) {
      await connection.rollback();
      return;
    }

    if (status === 'SUCCEEDED' && !cancellation.stock_restored) {
      const [items] = await connection.query<CancellationItemRow[]>(
        `
          SELECT pci.order_item_id, oi.product_option_id, pci.quantity
          FROM payment_cancellation_items AS pci
          INNER JOIN order_items AS oi ON oi.id = pci.order_item_id
          WHERE pci.cancellation_id = ?
          ORDER BY oi.product_option_id
          FOR UPDATE
        `,
        [cancellationId],
      );
      for (const item of items) {
        if (item.product_option_id === null) continue;
        await connection.execute(
          `UPDATE product_options
           SET stock_quantity = stock_quantity + ?,
               status = IF(status = 'SOLD_OUT', 'ACTIVE', status)
           WHERE id = ?`,
          [item.quantity, item.product_option_id],
        );
      }
      await connection.execute(
        `UPDATE payments
         SET canceled_amount = canceled_amount + ?,
             status = IF(canceled_amount + ? >= amount, 'CANCELED', 'PARTIALLY_CANCELED')
         WHERE payment_id = ?`,
        [cancellation.amount, cancellation.amount, cancellation.payment_id],
      );
      await connection.execute(
        `UPDATE orders AS o
         INNER JOIN payments AS p ON p.order_id = o.id
         SET o.status = IF(p.status = 'CANCELED', 'CANCELED', o.status)
         WHERE p.payment_id = ?`,
        [cancellation.payment_id],
      );
    }

    await connection.execute(
      `UPDATE payment_cancellations
       SET portone_cancellation_id = ?, status = ?,
           stock_restored = IF(? = 'SUCCEEDED', TRUE, stock_restored)
       WHERE id = ?`,
      [portOneCancellationId, status, status, cancellationId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const findLocalCancellation = async (
  paymentId: string,
  portOneCancellationId: string,
  amount: number,
): Promise<CancellationRow | null> => {
  const [byPortOneId] = await pool.query<CancellationRow[]>(
    `SELECT * FROM payment_cancellations
     WHERE payment_id = ? AND portone_cancellation_id = ? LIMIT 1`,
    [paymentId, portOneCancellationId],
  );
  if (byPortOneId[0]) return byPortOneId[0];

  // 네트워크 단절로 취소 응답을 저장하지 못한 경우 동일 금액의 미완료 요청을 복구한다.
  const [requested] = await pool.query<CancellationRow[]>(
    `SELECT * FROM payment_cancellations
     WHERE payment_id = ? AND status = 'REQUESTED'
       AND portone_cancellation_id IS NULL AND amount = ?
     ORDER BY id LIMIT 2`,
    [paymentId, amount],
  );
  return requested.length === 1 ? requested[0] : null;
};
