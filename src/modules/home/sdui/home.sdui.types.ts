export interface HomeSduiResponse {
  schemaVersion: '1.0';
  screenId: 'home';
  components: HomeComponent[];
}

export type HomeComponent = ExhibitionComponent | ProductListComponent;

export interface ExhibitionComponent {
  id: 'home-exhibition';
  type: 'exhibitions';
  data: {
    title: string;
    items: ExhibitionItem[];
  };
}

export interface ProductListComponent {
  id: 'recommended-products' | 'new-products';
  type: 'products';
  variant: 'personalized' | 'new';
  data: {
    title: string;
    products: ProductItem[];
  };
}

export interface ExhibitionItem {
  id: number;
  title: string;
  bannerImageUrl: string;
  startAt: Date | string;
  endAt: Date | string;
  action: OpenExhibitionAction;
}

export interface ProductItem {
  id: number;
  name: string;
  thumbnail: string;
  price: number;
  discountRate: number | null;
  rank?: number;
  action: OpenProductAction;
}

export interface OpenExhibitionAction {
  type: 'open_exhibition';
  payload: {
    exhibitionId: number;
  };
}

export interface OpenProductAction {
  type: 'open_product';
  payload: {
    productId: number;
  };
}
