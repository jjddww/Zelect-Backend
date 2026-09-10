//요청값 검사와 응답
import { NextFunction, Request, Response } from 'express';

import * as paymentService from './payment.service';

export const confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }
    const { paymentId, paymentToken, txId } = req.body;
    if (
      typeof paymentId !== 'string' ||
      paymentId.trim().length === 0 ||
      paymentId.length > 100 ||
      typeof paymentToken !== 'string' ||
      paymentToken.trim().length === 0 ||
      (txId != null && (typeof txId !== 'string' || txId.length > 100))
    ) {
      return res.status(400).json({ success: false, message: '결제 승인 정보를 확인해 주세요.' });
    }
    const result = await paymentService.confirmPayment(userId, paymentId, paymentToken, txId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const completePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '회원 정보가 없습니다.',
      });
    }

    const { paymentId } = req.body;

    if (typeof paymentId !== 'string' || paymentId.trim().length === 0 || paymentId.length > 100) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 paymentId입니다.',
      });
    }

    const result = await paymentService.completePayment(userId, paymentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const receiveWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (typeof req.body !== 'string') {
      return res.status(400).json({
        success: false,
        message: '웹훅 본문 형식이 올바르지 않습니다.',
      });
    }

    await paymentService.processWebhook(req.body, req.headers);

    return res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
};

export const cancelPaymentItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }
    const paymentId = req.params.paymentId;
    const { requestId, reason, items } = req.body;
    const validItems =
      Array.isArray(items) &&
      items.length > 0 &&
      items.length <= 100 &&
      items.every(
        (item) =>
          item &&
          Number.isInteger(item.orderItemId) &&
          item.orderItemId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );
    if (
      typeof paymentId !== 'string' ||
      paymentId.length === 0 ||
      typeof requestId !== 'string' ||
      requestId.length === 0 ||
      requestId.length > 100 ||
      typeof reason !== 'string' ||
      reason.trim().length === 0 ||
      reason.length > 255 ||
      !validItems
    ) {
      return res.status(400).json({ success: false, message: '취소 요청 정보를 확인해 주세요.' });
    }
    const result = await paymentService.cancelPaymentItems(userId, paymentId, {
      requestId,
      reason,
      items,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const cancelEntirePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '회원 정보가 없습니다.' });
    }
    const paymentId = req.params.paymentId;
    const { requestId, reason } = req.body;
    if (
      typeof paymentId !== 'string' ||
      paymentId.length === 0 ||
      paymentId.length > 100 ||
      typeof requestId !== 'string' ||
      requestId.trim().length === 0 ||
      requestId.length > 100 ||
      typeof reason !== 'string' ||
      reason.trim().length === 0 ||
      reason.length > 255
    ) {
      return res.status(400).json({ success: false, message: '전체 취소 정보를 확인해 주세요.' });
    }
    const result = await paymentService.cancelEntirePayment(userId, paymentId, {
      requestId,
      reason,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
