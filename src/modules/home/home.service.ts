import * as homeRepository from './home.repository';

export const getHome = async () => {
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
