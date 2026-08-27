import AppError from '../../common/exceptions/AppError';
import * as cartRepository from './cart.repository';

export const getCartByMemberId = async (userId: number) => {
  const items = await cartRepository.getCartByUserId(userId);

  const cartItems = items.map((item) => {
    const unitPrice = item.price + item.additional_price;
    const discountedUnitPrice =
      Math.floor(item.price * (1 - item.discount_rate / 100)) + item.additional_price;

    const available =
      item.product_status === 'ACTIVE' &&
      item.option_status === 'ACTIVE' &&
      item.stock_quantity >= item.quantity;

    const status =
      item.product_status !== 'ACTIVE' || item.option_status !== 'ACTIVE'
        ? 'SOLD_OUT'
        : item.stock_quantity < item.quantity
          ? 'INSUFFICIENT_STOCK'
          : 'AVAILABLE';

    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice,
      discountedUnitPrice,
      subtotal: discountedUnitPrice * item.quantity,
      status,
      available, //주문/선택 버튼 비활성화
      product: {
        id: item.product_id,
        name: item.product_name,
        thumbnailUrl: item.thumbnail_url,
        price: item.price,
        discountRate: item.discount_rate,
        status: item.product_status,
        brand: {
          id: item.brand_id,
          name: item.brand_name,
        },
      },
      option: {
        id: item.product_option_id,
        color: item.color,
        size: item.size,
        additionalPrice: item.additional_price,
        stockQuantity: item.stock_quantity,
        status: item.option_status,
      },
    };
  });

  return {
    items: cartItems,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
};

export const addItems = async (userId: number, productOptionId: number, quantity: number) => {
  const result = await cartRepository.addItem(userId, productOptionId, quantity);

  if (result.status === 'OPTION_NOT_FOUND') {
    throw new AppError(404, '상품 옵션을 찾을 수 없습니다.');
  }
  if (result.status === 'NOT_AVAILABLE') {
    throw new AppError(409, '현재 장바구니에 담을 수 없는 상품입니다.');
  }
  if (result.status === 'OUT_OF_STOCK') {
    throw new AppError(409, '재고 수량을 초과했습니다.');
  }

  return {
    cartItemId: result.cartItemId,
    productOptionId,
    quantity: result.quantity,
  };
};

export const updateQuantity = async (userId: number, cartItemId: number, quantity: number) => {
  const result = await cartRepository.updateQuantity(userId, cartItemId, quantity);

  if (result.status === 'NOT_FOUND') {
    throw new AppError(404, '장바구니 항목을 찾을 수 없습니다.');
  }
  if (result.status === 'NOT_AVAILABLE') {
    throw new AppError(409, '현재 수량을 변경할 수 없는 상품입니다.');
  }
  if (result.status === 'OUT_OF_STOCK') {
    throw new AppError(409, '재고 수량을 초과했습니다.');
  }

  return { cartItemId, quantity: result.quantity };
};

export const removeItems = async (userId: number, cartItemId: number) => {
  const removed = await cartRepository.removeItem(userId, cartItemId);

  if (!removed) {
    throw new AppError(404, '장바구니 항목을 찾을 수 없습니다.');
  }

  return { cartItemId };
};
