//URL 연결
import { Router } from 'express';

import { authMiddleware } from '../../common/middleware/auth.middleware';
import { cancelPaymentItems, completePayment, receiveWebhook } from './payment.controller';

const router = Router();

router.post('/webhook', receiveWebhook);
router.post('/complete', authMiddleware, completePayment);
router.post('/:paymentId/cancel', authMiddleware, cancelPaymentItems);

export default router;
