import { NextFunction, Request, Response } from 'express';
import * as searchService from './search.service';

export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);

    if (query.length < 1 || query.length > 100) {
      return res.status(400).json({
        success: false,
        message: '검색어(q)는 1자 이상 100자 이하로 입력해 주세요.',
      });
    }

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'page는 1 이상의 정수여야 합니다.',
      });
    }

    if (!Number.isInteger(size) || size < 1 || size > 100) {
      return res.status(400).json({
        success: false,
        message: 'size는 1 이상 100 이하의 정수여야 합니다.',
      });
    }

    const result = await searchService.searchProducts(query, page, size);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
