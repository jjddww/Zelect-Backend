import { Router } from 'express';
import { getBrandOfWeek } from './brand.controller';

const router = Router();

router.get('/brand-of-week', getBrandOfWeek);
// router.get('brandlist', getBrandList);

export default router;
