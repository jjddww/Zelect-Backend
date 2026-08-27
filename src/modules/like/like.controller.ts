import { Request, Response, NextFunction } from 'express';
import * as likeService from './like.service';

export const addLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.productId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '회원 정보가 없습니다.',
      });
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 productId 입니다.',
      });
    }

    const result = await likeService.addLike(userId, productId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getLikedProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '회원 정보가 없습니다.',
      });
    }

    const result = await likeService.getLikedProducts(userId);
  } catch (error) {
    next(error);
  }
};

export const removeLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.productId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '회원 정보가 없습니다.',
      });
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 productId 입니다.',
      });
    }

    const result = await likeService.removeLike(userId, productId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
