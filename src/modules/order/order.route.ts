import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { getMyOrders, getOrderDetail, getOrderShipment } from './order.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getMyOrders);
router.get('/:orderId/shipment', getOrderShipment);
router.get('/:orderId', getOrderDetail);

export default router;
