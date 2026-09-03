import fs from 'fs';
import path from 'path';

type ProductTemplate = {
  categoryId: number;
  names: string[];
  colors: string[];
  sizes: string[];
  material: string;
  fit: string;
  basePrice: number;
};

type GeneratedProduct = {
  brand_id: number;
  category_id: number;
  name: string;
  price: number;
  discount_rate: number;
  description: {
    summary: string;
    fit: string;
    material: string;
    color: string[];
    size: string[];
    origin: string;
  };
  status: string;
  like_count: number;
  created_at: string;
  thumbnail_url: string;
};

type GeneratedOption = {
  product_id: number;
  color: string;
  size: string;
  stock_quantity: number;
  additional_price: number;
  status: string;
};

type GeneratedImage = {
  product_id: number;
  image_url: string;
  sort_order: number;
};

type GeneratedDescription = {
  product_id: number;
  title: string;
  content: string;
  sort_order: number;
};

const templates: ProductTemplate[] = [
  {
    categoryId: 6,
    names: ['셔츠', '블라우스', '니트', '카디건', '재킷', '원피스', '슬랙스', '스커트'],
    colors: ['아이보리', '블랙', '스카이블루'],
    sizes: ['S', 'M', 'L'],
    material: '코튼 혼방',
    fit: '세미 오버핏',
    basePrice: 59000,
  },
  {
    categoryId: 7,
    names: ['숄더백', '토트백', '크로스백', '버킷백', '미니백'],
    colors: ['블랙', '탄', '크림'],
    sizes: ['ONE'],
    material: '비건 레더',
    fit: '데일리 사이즈',
    basePrice: 79000,
  },
  {
    categoryId: 8,
    names: ['로퍼', '스니커즈', '메리제인', '앵클 부츠', '플랫 슈즈'],
    colors: ['블랙', '오프화이트', '브라운'],
    sizes: ['230', '240', '250'],
    material: '합성가죽',
    fit: '정사이즈',
    basePrice: 89000,
  },
  {
    categoryId: 9,
    names: ['실버 네크리스', '레더 벨트', '울 머플러', '볼캡', '미니 이어링'],
    colors: ['실버', '블랙', '베이지'],
    sizes: ['ONE'],
    material: '복합 소재',
    fit: '프리 사이즈',
    basePrice: 39000,
  },
  {
    categoryId: 10,
    names: ['요가 레깅스', '러닝 재킷', '트레이닝 탑', '테니스 스커트'],
    colors: ['블랙', '네이비', '라벤더'],
    sizes: ['S', 'M', 'L'],
    material: '기능성 폴리에스터',
    fit: '액티브핏',
    basePrice: 69000,
  },
  {
    categoryId: 13,
    names: [
      '옥스포드 셔츠',
      '코튼 티셔츠',
      '울 니트',
      '블루종',
      '와이드 슬랙스',
      '데님 팬츠',
      '후디',
      '트렌치 코트',
    ],
    colors: ['화이트', '차콜', '네이비'],
    sizes: ['M', 'L', 'XL'],
    material: '프리미엄 코튼 혼방',
    fit: '레귤러핏',
    basePrice: 69000,
  },
  {
    categoryId: 14,
    names: ['레더 백팩', '메신저백', '토트백', '웨이스트백'],
    colors: ['블랙', '카키', '브라운'],
    sizes: ['ONE'],
    material: '나일론 혼방',
    fit: '데일리 사이즈',
    basePrice: 89000,
  },
  {
    categoryId: 15,
    names: ['독일군 스니커즈', '더비 슈즈', '러닝화', '첼시 부츠', '슬라이드'],
    colors: ['블랙', '화이트', '그레이'],
    sizes: ['260', '270', '280'],
    material: '천연가죽 혼방',
    fit: '정사이즈',
    basePrice: 99000,
  },
  {
    categoryId: 16,
    names: ['메탈 워치', '레더 벨트', '코튼 볼캡', '울 머플러', '카드 지갑'],
    colors: ['블랙', '실버', '네이비'],
    sizes: ['ONE'],
    material: '복합 소재',
    fit: '프리 사이즈',
    basePrice: 49000,
  },
  {
    categoryId: 17,
    names: ['러닝 쇼츠', '트랙 재킷', '컴프레션 탑', '하이킹 팬츠'],
    colors: ['블랙', '그레이', '블루'],
    sizes: ['M', 'L', 'XL'],
    material: '흡습속건 폴리에스터',
    fit: '액티브핏',
    basePrice: 59000,
  },
  {
    categoryId: 19,
    names: ['수분 진정 토너', '세라마이드 크림', '비타민 세럼', '클렌징 오일', '선 에센스'],
    colors: ['기본'],
    sizes: ['50ml', '100ml', '200ml'],
    material: '피부 저자극 포뮬러',
    fit: '모든 피부용',
    basePrice: 24000,
  },
  {
    categoryId: 20,
    names: ['벨벳 립 틴트', '글로우 쿠션', '아이 팔레트', '크림 블러셔', '롱래시 마스카라'],
    colors: ['코랄', '로즈', '누드'],
    sizes: ['ONE'],
    material: '고밀착 컬러 포뮬러',
    fit: '데일리 메이크업',
    basePrice: 22000,
  },
  {
    categoryId: 21,
    names: ['단백질 샴푸', '리페어 트리트먼트', '두피 토닉', '헤어 오일'],
    colors: ['기본'],
    sizes: ['100ml', '300ml', '500ml'],
    material: '식물 유래 헤어 포뮬러',
    fit: '손상 모발용',
    basePrice: 26000,
  },
  {
    categoryId: 22,
    names: ['퍼퓸 바디워시', '시어버터 로션', '바디 스크럽', '핸드 크림'],
    colors: ['시트러스', '플로럴', '우디'],
    sizes: ['50ml', '300ml'],
    material: '보습 바디 포뮬러',
    fit: '데일리 케어',
    basePrice: 19000,
  },
  {
    categoryId: 23,
    names: ['오 드 퍼퓸', '솔리드 퍼퓸', '룸 프래그런스', '헤어 퍼퓸'],
    colors: ['시트러스', '플로럴', '우디'],
    sizes: ['30ml', '50ml'],
    material: '프리미엄 향료',
    fit: '유니섹스',
    basePrice: 69000,
  },
  {
    categoryId: 24,
    names: ['LED 마스크', '진동 클렌저', '두피 마사지기', '미니 고데기'],
    colors: ['화이트', '핑크', '블랙'],
    sizes: ['ONE'],
    material: 'ABS 및 실리콘',
    fit: '홈 뷰티 케어',
    basePrice: 119000,
  },
  {
    categoryId: 25,
    names: ['오가닉 바디수트', '코튼 우주복', '베이비 턱받이', '니트 보닛'],
    colors: ['크림', '베이지', '민트'],
    sizes: ['6M', '12M', '18M'],
    material: '오가닉 코튼',
    fit: '베이비 컴포트핏',
    basePrice: 29000,
  },
  {
    categoryId: 26,
    names: ['키즈 맨투맨', '조거 팬츠', '윈드브레이커', '데님 오버롤', '플레어 원피스'],
    colors: ['아이보리', '블루', '옐로우'],
    sizes: ['110', '120', '130'],
    material: '부드러운 코튼 혼방',
    fit: '키즈 레귤러핏',
    basePrice: 39000,
  },
  {
    categoryId: 27,
    names: ['키즈 스니커즈', '레인 부츠', '벨크로 샌들', '퍼 슬립온'],
    colors: ['화이트', '핑크', '블루'],
    sizes: ['170', '180', '190'],
    material: '경량 합성 소재',
    fit: '키즈 정사이즈',
    basePrice: 49000,
  },
  {
    categoryId: 28,
    names: ['미니 백팩', '버킷햇', '캐릭터 양말', '보온 머플러'],
    colors: ['베이지', '민트', '라벤더'],
    sizes: ['ONE'],
    material: '코튼 및 폴리에스터',
    fit: '키즈 프리 사이즈',
    basePrice: 25000,
  },
  {
    categoryId: 29,
    names: ['우드 블록 세트', '역할놀이 키트', '자석 퍼즐', '촉감 인형'],
    colors: ['멀티'],
    sizes: ['ONE'],
    material: '안전 인증 소재',
    fit: '36개월 이상',
    basePrice: 35000,
  },
  {
    categoryId: 30,
    names: ['휴대용 젖병 워머', '실리콘 이유식기', '아기띠', '수유 쿠션'],
    colors: ['크림', '그레이', '민트'],
    sizes: ['ONE'],
    material: '유아 안전 인증 소재',
    fit: '육아 편의 설계',
    basePrice: 45000,
  },
];

const adjectives = [
  '에센셜',
  '시그니처',
  '프리미엄',
  '클래식',
  '컴포트',
  '모던',
  '데일리',
  '라이트',
  '소프트',
  '어반',
];

const seedDir = path.join(__dirname, 'seed');
const products: GeneratedProduct[] = [];
const options: GeneratedOption[] = [];
const images: GeneratedImage[] = [];
const descriptions: GeneratedDescription[] = [];

for (let index = 0; index < 200; index += 1) {
  const id = index + 1;
  const template = templates[index % templates.length];
  const adjective = adjectives[Math.floor(index / templates.length) % adjectives.length];
  const itemName = template.names[Math.floor(index / adjectives.length) % template.names.length];
  const productStatus = id % 53 === 0 ? 'HIDDEN' : id % 17 === 0 ? 'SOLD_OUT' : 'ACTIVE';
  const price = Math.round((template.basePrice + (index % 5) * 10000) / 1000) * 1000;
  const discountRate = [0, 5, 10, 15, 20, 25, 30][id % 7];
  const productName = `${adjective} ${itemName} ${String(id).padStart(3, '0')}`;
  const createdMonth = String((index % 9) + 1).padStart(2, '0');
  const createdDay = String((index % 27) + 1).padStart(2, '0');
  const placeholder = String(((id - 1) % 10) + 1).padStart(2, '0');

  products.push({
    brand_id: ((id - 1) % 50) + 1,
    category_id: template.categoryId,
    name: productName,
    price,
    discount_rate: discountRate,
    description: {
      summary: `${productName}은(는) 실용성과 완성도를 균형 있게 담아 일상에서 편하게 사용할 수 있는 제품입니다.`,
      fit: template.fit,
      material: template.material,
      color: template.colors,
      size: template.sizes,
      origin: id % 4 === 0 ? '중국' : id % 3 === 0 ? '베트남' : '대한민국',
    },
    status: productStatus,
    like_count: (id * 37) % 501,
    created_at: `2026-${createdMonth}-${createdDay} ${String(9 + (id % 10)).padStart(2, '0')}:00:00`,
    thumbnail_url: `/assets/placeholders/placeholder-${placeholder}.png`,
  });

  template.colors.slice(0, 3).forEach((color, optionIndex) => {
    const size = template.sizes[optionIndex % template.sizes.length];
    const soldOut = productStatus !== 'ACTIVE' || (id + optionIndex) % 11 === 0;
    options.push({
      product_id: id,
      color,
      size,
      stock_quantity: soldOut ? 0 : 5 + ((id * (optionIndex + 3)) % 36),
      additional_price: optionIndex === 2 && template.sizes.length > 1 ? 5000 : 0,
      status: productStatus === 'HIDDEN' ? 'HIDDEN' : soldOut ? 'SOLD_OUT' : 'ACTIVE',
    });
  });

  [1, 2].forEach((sortOrder) => {
    const imageNumber = String(((id + sortOrder - 2) % 10) + 1).padStart(2, '0');
    images.push({
      product_id: id,
      image_url: `/assets/placeholders/placeholder-${imageNumber}.png`,
      sort_order: sortOrder,
    });
  });

  descriptions.push(
    {
      product_id: id,
      title: '상품 설명',
      content: `${template.material}을 활용해 편안한 사용감과 안정적인 품질을 갖춘 ${productName}입니다.`,
      sort_order: 1,
    },
    {
      product_id: id,
      title: template.categoryId >= 19 && template.categoryId <= 24 ? '사용 안내' : '관리 안내',
      content:
        template.categoryId >= 19 && template.categoryId <= 24
          ? '사용 전 제품별 주의사항을 확인하고 피부에 이상이 있을 경우 사용을 중단해 주세요.'
          : '제품 라벨의 취급 방법을 확인하고 소재에 맞는 방법으로 관리해 주세요.',
      sort_order: 2,
    },
  );
}

const writeJson = (filename: string, value: unknown) => {
  fs.writeFileSync(path.join(seedDir, filename), `${JSON.stringify(value, null, 2)}\n`);
};

writeJson('products.json', products);
writeJson('product-options.json', options);
writeJson('product-images.json', images);
writeJson('product-descriptions.json', descriptions);

console.log(
  `Generated ${products.length} products, ${options.length} options, ${images.length} images, and ${descriptions.length} descriptions.`,
);
