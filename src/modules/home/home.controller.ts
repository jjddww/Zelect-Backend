import { Request, Response, NextFunction } from 'express';
import * as homeService from './home.service';

export const getHomeBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await homeService.getHomeExhibitions();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getNew = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await homeService.getNew();

    res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await homeService.getRecommendations();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};