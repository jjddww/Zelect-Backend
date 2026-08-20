import { Router } from 'express';
import { searchProducts } from './search.controller';

const router = Router();

router.get('/', searchProducts);

export default router;
