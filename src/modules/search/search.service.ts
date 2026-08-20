import * as searchRepository from './search.repository';

export const searchProducts = async (query: string, page: number, size: number) => {
  const offset = (page - 1) * size;
  const [products, totalCount] = await Promise.all([
    searchRepository.searchProducts(query, size, offset),
    searchRepository.countProducts(query),
  ]);
  const totalPages = Math.ceil(totalCount / size);

  return {
    query,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      discountRate: product.discount_rate,
      discountedPrice: Math.floor(product.price * (1 - product.discount_rate / 100)),
      thumbnailUrl: product.thumbnail_url,
      status: product.status,
      likeCount: product.like_count,
      brand: {
        id: product.brand_id,
        name: product.brand_name,
      },
      category: {
        id: product.category_id,
        name: product.category_name,
      },
    })),
    pagination: {
      page,
      size,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
    },
  };
};
