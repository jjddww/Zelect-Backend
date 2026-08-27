import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { addLike, getLikedProducts, removeLike } from './like.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getLikedProducts);
router.post('/products/:productId', addLike);
router.delete('/products/:productId', removeLike);

export default router;
