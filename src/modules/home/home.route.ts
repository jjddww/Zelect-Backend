import { Router } from 'express';
import { getHomeBanner, getNew, getRecommendations } from './home.controller';

const router = Router();

router.get('/banner', getHomeBanner);
router.get('/foryou', getRecommendations);
router.get('/new', getNew);

export default router;
