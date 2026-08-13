import { Router } from 'express';
import { getProductByBrand, getProductDetail, getProductsByCategory } from './product.controller';

const router = Router();

router.get('/by-brand', getProductByBrand);
router.get('/by-category', getProductsByCategory);
router.get('/:productId', getProductDetail);

export default router;
