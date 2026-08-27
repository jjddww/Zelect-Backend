import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { addItems, getCartByMemberId, removeItems, updateQuantity } from './cart.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getCartByMemberId);
router.post('/items', addItems);
router.patch('/items/:cartItemId', updateQuantity);
router.delete('/items/:cartItemId', removeItems);

export default router;
