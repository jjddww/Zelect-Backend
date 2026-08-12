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
