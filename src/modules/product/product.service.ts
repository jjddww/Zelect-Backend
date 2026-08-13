import * as productRepository from './product.repository';

export const getProductDetail = async (productId: number) => {
  const result = await productRepository.getProductDetail(productId);

  if (!result) return null;

  const { product, images, options, descriptions } = result;
  const description =
    typeof product.description === 'string'
      ? (JSON.parse(product.description) as Record<string, unknown>)
      : product.description;

  return {
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      discountRate: product.discount_rate,
      discountedPrice: Math.floor(product.price * (1 - product.discount_rate / 100)),
      thumbnailUrl: product.thumbnail_url,
      description,
      status: product.status,
      likeCount: product.like_count,
      brand: {
        id: product.brand_id,
        name: product.brand_name,
        logoUrl: product.brand_logo_url,
      },
      category: {
        id: product.category_id,
        name: product.category_name,
      },
      images: images.map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        sortOrder: image.sort_order,
      })),
      options: options.map((option) => ({
        id: option.id,
        color: option.color,
        size: option.size,
        stockQuantity: option.stock_quantity,
        additionalPrice: option.additional_price,
        status: option.status,
        soldOut: option.status === 'SOLD_OUT' || option.stock_quantity === 0,
      })),
      descriptions: descriptions.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        sortOrder: item.sort_order,
      })),
    },
  };
};

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
