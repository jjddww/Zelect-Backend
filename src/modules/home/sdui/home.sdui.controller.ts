import { Request, Response, NextFunction } from 'express';

import * as homeService from '../home.service';
import { buildHome } from './home.bulider';

export const getHomeSdui = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [exhibitionResult, recommendationResult, newProductResult] = await Promise.all([
      homeService.getHomeExhibitions(),
      homeService.getRecommendations(),
      homeService.getNew(),
    ]);

    const result = buildHome({
      exhibitions: exhibitionResult.exhibitions,

      recommendations: recommendationResult.recommendations,

      newProducts: newProductResult.newProducts,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
