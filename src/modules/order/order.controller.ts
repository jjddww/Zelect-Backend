import { Request, Response, NextFunction } from 'express';
import * as orderService from './order.service';

//내 주문내역 조회
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }

    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    if (
      !Number.isInteger(page) ||
      page <= 0 ||
      !Number.isInteger(size) ||
      size <= 0 ||
      size > 100
    ) {
      return res.status(400).json({ success: false, message: '유효하지 않은 페이지 정보입니다.' });
    }

    const result = await orderService.getMyOrders(userId, page, size);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//주문 상세 조회
export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const orderId = Number(req.params.orderId);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 orderId 입니다.' });
    }

    const result = await orderService.getOrderDetail(userId, orderId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//배송 조회
export const getOrderShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const orderId = Number(req.params.orderId);
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 orderId 입니다.' });
    }

    const result = await orderService.getOrderShipment(userId, orderId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
