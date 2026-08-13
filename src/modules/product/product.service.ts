import * as productRepository from './product.repository';

export const getProductByBrand = async (brandId: number, page: number, size: number) => {
  const offset = (page - 1) * size;
  const products = await productRepository.getProductByBrand(brandId, size, offset);

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      discountRate: product.discount_rate,
      discountedPrice: Math.floor(product.price * (1 - product.discount_rate / 100)),
      thumbnailUrl: product.thumbnail_url,
      likeCount: product.like_count,
      brand: {
        id: product.brand_id,
        name: product.brand_name,
      },
    })),
    pagination: {
      page,
      size,
    },
  };
};

export const getProductsByCategory = async (categoryId: number, page: number, size: number) => {
  const offset = (page - 1) * size;

  const products = await productRepository.getProductsByCategory(categoryId, size, offset);

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      discountRate: product.discount_rate,
      discountedPrice: Math.floor(product.price * (1 - product.discount_rate / 100)),
      thumbnailUrl: product.thumbnail_url,
      likeCount: product.like_count,
      brand: {
        id: product.brand_id,
        name: product.brand_name,
      },
    })),
    pagination: {
      page,
      size,
    },
  };
};
