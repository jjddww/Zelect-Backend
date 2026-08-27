import { NextFunction, Request, Response } from 'express';
import * as cartService from './cart.service';

const getUserId = (req: Request): number | null => req.user?.id ?? null;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const getCartByMemberId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }

    const result = await cartService.getCartByMemberId(userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const addItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }

    const { productOptionId, quantity } = req.body;
    if (!isPositiveInteger(productOptionId)) {
      return res
        .status(400)
        .json({ success: false, message: '유효하지 않은 productOptionId 입니다.' });
    }
    if (!isPositiveInteger(quantity)) {
      return res
        .status(400)
        .json({ success: false, message: 'quantity는 1 이상의 정수여야 합니다.' });
    }

    const result = await cartService.addItems(userId, productOptionId, quantity);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateQuantity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }

    const cartItemId = Number(req.params.cartItemId);
    const { quantity } = req.body;
    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 cartItemId 입니다.' });
    }
    if (!isPositiveInteger(quantity)) {
      return res
        .status(400)
        .json({ success: false, message: 'quantity는 1 이상의 정수여야 합니다.' });
    }

    const result = await cartService.updateQuantity(userId, cartItemId, quantity);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const removeItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }

    const cartItemId = Number(req.params.cartItemId);
    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 cartItemId 입니다.' });
    }

    const result = await cartService.removeItems(userId, cartItemId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
