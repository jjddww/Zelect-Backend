//URL 연결
import { Router } from 'express';

import { authMiddleware } from '../../common/middleware/auth.middleware';
import {
  cancelEntirePayment,
  cancelPaymentItems,
  completePayment,
  confirmPayment,
  receiveWebhook,
} from './payment.controller';

const router = Router();

router.post('/webhook', receiveWebhook);
router.post('/confirm', authMiddleware, confirmPayment);
router.post('/complete', authMiddleware, completePayment);
router.post('/:paymentId/cancel-all', authMiddleware, cancelEntirePayment);
router.post('/:paymentId/cancel', authMiddleware, cancelPaymentItems);

export default router;
