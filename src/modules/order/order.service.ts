import * as orderRepository from './order.repository';
import AppError from '../../common/exceptions/AppError';
import { randomUUID } from 'node:crypto';
import { getPortOneClientConfig } from '../payment/portone.client';

export interface CreateOrderInput {
  cartItemIds: number[];
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail?: string | null;
  deliveryRequest?: string | null;
}

export const cleanupExpiredReservations = () => orderRepository.releaseExpiredReservations();

export const createOrder = async (userId: number, input: CreateOrderInput) => {
  await orderRepository.releaseExpiredReservations();

  const cartItemIds = [...new Set(input.cartItemIds)];
  const uniquePart = randomUUID().replaceAll('-', '').slice(0, 12);
  const createdAt = Date.now();
  const orderNumber = `ORD-${createdAt}-${uniquePart.slice(0, 6)}`;
  const paymentId = `payment-${uniquePart}-${createdAt}`;
  const configuredMinutes = Number(process.env.PAYMENT_RESERVATION_MINUTES ?? 10);
  const reservationMinutes =
    Number.isInteger(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 10;
  const reservationExpiresAt = new Date(Date.now() + reservationMinutes * 60_000);

  const result = await orderRepository.createPendingOrder(
    userId,
    { ...input, cartItemIds },
    orderNumber,
    paymentId,
    reservationExpiresAt,
  );

  if (result.status === 'CART_ITEM_NOT_FOUND') {
    throw new AppError(404, '장바구니 항목을 찾을 수 없습니다.');
  }
  if (result.status === 'NOT_AVAILABLE') {
    throw new AppError(409, '현재 주문할 수 없는 상품이 포함되어 있습니다.');
  }
  if (result.status === 'OUT_OF_STOCK') {
    throw new AppError(409, '재고가 부족한 상품이 포함되어 있습니다.');
  }
  if (result.status !== 'SUCCESS') {
    throw new AppError(500, '주문 생성에 실패했습니다.');
  }

  const portOneConfig = getPortOneClientConfig();
  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    status: 'PENDING_PAYMENT',
    payment: {
      paymentId: result.paymentId,
      storeId: portOneConfig.storeId,
      channelKey: portOneConfig.channelKey,
      orderName: 'Zelect 주문',
      totalAmount: result.totalPrice,
      currency: 'KRW',
      reservationExpiresAt,
    },
  };
};

export const getMyOrders = async (userId: number, page: number, size: number) => {
  const offset = (page - 1) * size;
  const [orders, totalCount] = await Promise.all([
    orderRepository.getOrdersByUserId(userId, size, offset),
    orderRepository.countOrdersByUserId(userId),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalPrice: order.total_price,
      itemCount: order.item_count,
      representativeItem: {
        productName: order.representative_product_name,
        thumbnailUrl: order.representative_thumbnail_url || null,
      },
      createdAt: order.created_at,
    })),
    pagination: {
      page,
      size,
      totalCount,
      totalPages: Math.ceil(totalCount / size),
    },
  };
};

export const getOrderDetail = async (userId: number, orderId: number) => {
  const order = await orderRepository.getOrderByIdAndUserId(orderId, userId);

  if (!order) {
    throw new AppError(404, '주문을 찾을 수 없습니다.');
  }

  const items = await orderRepository.getOrderItemsByOrderId(orderId);

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    itemsPrice: order.items_price,
    deliveryFee: order.delivery_fee,
    totalPrice: order.total_price,
    recipient: {
      name: order.recipient_name,
      phone: order.recipient_phone,
      zipCode: order.zip_code,
      address: order.address,
      addressDetail: order.address_detail,
    },
    deliveryRequest: order.delivery_request,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productOptionId: item.product_option_id,
      productName: item.product_name,
      thumbnailUrl: item.thumbnail_url,
      color: item.color,
      size: item.size,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    createdAt: order.created_at,
  };
};

export const getOrderShipment = async (userId: number, orderId: number) => {
  const result = await orderRepository.getShipmentByOrderIdAndUserId(orderId, userId);

  if (!result) {
    throw new AppError(404, '주문을 찾을 수 없습니다.');
  }

  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
    orderStatus: result.order_status,
    shipment:
      result.shipment_id === null
        ? null
        : {
            id: result.shipment_id,
            status: result.shipment_status,
            carrier: result.carrier,
            trackingNumber: result.tracking_number,
            shippedAt: result.shipped_at,
            deliveredAt: result.delivered_at,
          },
  };
};
