import * as brandRepository from './brand.repository';

export const getBrandOfWeek = async () => {
  const brandOfWeek = await brandRepository.getBrandOfWeek();

  if (!brandOfWeek) {
    return {
      brand: null,
    };
  }

  return {
    brand: {
      id: brandOfWeek.id,
      name: brandOfWeek.name,
      desc: brandOfWeek.description,
      headline: brandOfWeek.headline,
      subheadline: brandOfWeek.subheadline,
    },
  };
};

export const getBrandList = async () => {
  const brands = await brandRepository.getBrandList();

  return {
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      image_url: brand.logo_url,
      desc: brand.description,
    })),
  };
};
