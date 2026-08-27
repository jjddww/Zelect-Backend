import * as likeRepository from './like.repository';
import AppError from '../../common/exceptions/AppError';

export const getLikedProducts = async (userId: number) => {
  const likedProducts = await likeRepository.getLikedProducts(userId);

  return {
    products: likedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      discountRate: product.discount_rate,
      thumbnail: product.thumbnail_url,
    })),
  };
};

export const addLike = async (userId: number, productId: number) => {
  const result = await likeRepository.addLike(userId, productId);

  if (!result) {
    throw new AppError(404, '상품을 찾을 수 없습니다.');
  }

  return {
    productId,
    liked: true,
    likeCount: result.likeCount,
  };
};

export const removeLike = async (userId: number, productId: number) => {
  const result = await likeRepository.removeLike(userId, productId);

  if (!result) {
    throw new AppError(404, '상품을 찾을 수 없습니다.');
  }

  return {
    productId,
    liked: false,
    likeCount: result.likeCount,
  };
};
