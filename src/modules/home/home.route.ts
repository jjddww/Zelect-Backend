import { Router } from 'express';
import { getHomeBanner, getNew, getRecommendations } from './home.controller';
import { getHomeSdui } from './sdui/home.sdui.controller';

const router = Router();

router.get('/banner', getHomeBanner);
router.get('/foryou', getRecommendations);
router.get('/new', getNew);

router.get('/sdui', getHomeSdui);

export default router;
