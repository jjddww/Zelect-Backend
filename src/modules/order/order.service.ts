import * as orderRepository from './order.repository';
import AppError from '../../common/exceptions/AppError';

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
