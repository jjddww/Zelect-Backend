import { HomeSduiResponse, HomeComponent, ProductItem } from './home.sdui.types';

interface Exhibition {
  id: number;
  title: string;
  bannerImageUrl: string;
  startAt: Date | string;
  endAt: Date | string;
}

interface Product {
  id: number;
  name: string;
  thumbnail: string;
  price: number;
  discountRate: number;
}

interface BuildHomeParams {
  exhibitions: Exhibition[];
  recommendations: Product[];
  newProducts: Product[];
}

export const buildHome = ({
  exhibitions,
  recommendations,
  newProducts,
}: BuildHomeParams): HomeSduiResponse => {
  const components: HomeComponent[] = [];

  if (exhibitions.length > 0) {
    components.push({
      id: 'home-exhibition',
      type: 'exhibitions',
      data: {
        title: '기획전',
        items: exhibitions.map((exhibition) => ({
          id: exhibition.id,
          title: exhibition.title,
          bannerImageUrl: exhibition.bannerImageUrl,
          startAt: exhibition.startAt,
          endAt: exhibition.endAt,
          action: {
            type: 'open_exhibition',
            payload: {
              exhibitionId: exhibition.id,
            },
          },
        })),
      },
    });
  }

  if (recommendations.length > 0) {
    components.push({
      id: 'recommended-products',
      type: 'products',
      variant: 'personalized',
      data: {
        title: '당신을 위한 추천',
        products: recommendations.map(toProductItem),
      },
    });
  }

  if (newProducts.length > 0) {
    components.push({
      id: 'new-products',
      type: 'products',
      variant: 'new',
      data: {
        title: '신상품',
        products: newProducts.map(toProductItem),
      },
    });
  }

  return {
    schemaVersion: '1.0',
    screenId: 'home',
    components,
  };
};

const toProductItem = (product: Product): ProductItem => ({
  id: product.id,
  name: product.name,
  thumbnail: product.thumbnail,
  price: Number(product.price),
  discountRate: product.discountRate === null ? null : Number(product.discountRate),
  action: {
    type: 'open_product',
    payload: {
      productId: product.id,
    },
  },
});
