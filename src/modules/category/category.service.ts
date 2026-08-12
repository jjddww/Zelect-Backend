import * as categoryRepository from './category.repository';

type CategoryRow = {
  id: number;
  parent_id: number | null;
  name: string;
  depth: number;
  sort_order: number;
};

/* childrenByParentId Map 형태
Map {
  1 => [
    { id: 7, parent_id: 1, name: '신상품' },
    { id: 8, parent_id: 1, name: '의류' }
  ],

  2 => [
    { id: 14, parent_id: 2, name: '신상품' }
  ]
}
*/

export const getCategories = async () => {
  const categories = await categoryRepository.findCategories();

  const childrenByParentId = new Map<number, CategoryRow[]>();

  for (const category of categories) {
    if (category.parent_id === null) continue;

    const children = childrenByParentId.get(category.parent_id) ?? []; //parent_id 기준으로 자식 배열을 꺼냄. 없으면 빈 배열 생성
    children.push(category);
    childrenByParentId.set(category.parent_id, children);
  }

  return {
    categories: categories
      .filter((category) => category.parent_id === null)
      .map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
        children: (childrenByParentId.get(category.id) ?? []).map((child) => ({
          id: child.id,
          name: child.name,
          sortOrder: child.sort_order,
        })),
      })),
  };
};
