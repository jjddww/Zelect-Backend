import { Request, Response, NextFunction } from 'express';
import * as productService from './product.service';

export const getProductByBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brandId = Number(req.query.brandId);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const size = Math.min(Math.max(Number(req.query.size) || 20, 1), 100);

    if (!Number.isInteger(brandId) || brandId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 brandId 입니다.',
      });
    }
    const result = await productService.getProductByBrand(brandId, page, size);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = Number(req.query.categoryId);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const size = Math.min(Math.max(Number(req.query.size) || 20, 1), 100);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 categoryId 입니다.',
      });
    }

    const result = await productService.getProductsByCategory(categoryId, page, size);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
