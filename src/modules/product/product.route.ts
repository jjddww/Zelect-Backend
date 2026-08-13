import { Router } from 'express';
import { getProductByBrand, getProductsByCategory } from './product.controller';

const router = Router();

router.get('/by-brand', getProductByBrand);
router.get('/by-category', getProductsByCategory);

export default router;
