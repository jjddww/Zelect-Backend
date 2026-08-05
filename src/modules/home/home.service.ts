import * as homeRepository from './home.repository';

export const getHomeExhibitions = async () => {
  const exhibitions = await homeRepository.findExhibitions();

  return {
    exhibitions: exhibitions.map((exhibition) => ({
      id: exhibition.id,
      title: exhibition.title,
      bannerImageUrl: exhibition.banner_image_url,
      startAt: exhibition.start_at,
      endAt: exhibition.end_at,
    })),
  };
};

export const getNew = async () => {
  const newProducts = await homeRepository.findNewProducts();

  return {
    newProducts: newProducts.map((newProduct) => ({
      id: newProduct.id,
      name: newProduct.name,
      thumbnail: newProduct.thumbnail_url,
      price: newProduct.price,
      discountRate: newProduct.discount_rate,
    })),
  };
};

export const getRecommendations = async () => {
  const recommendedProducts = await homeRepository.findRecommendations();

  return {
    recommendations: recommendedProducts.map((recommendationProduct) => ({
      id: recommendationProduct.id,
      name: recommendationProduct.name,
      thumbnail: recommendationProduct.thumbnail_url,
      price: recommendationProduct.price,
      discountRate: recommendationProduct.discount_rate,
    })),
  };
};
