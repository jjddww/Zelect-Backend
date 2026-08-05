import * as categoryRepository from './category.repository';

export const getCategories = async () => {
  const categories = await categoryRepository.findCategories();

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
  };
};
