import { ErrorRequestHandler } from 'express';
import AppError from '../exceptions/AppError';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
  });
};
