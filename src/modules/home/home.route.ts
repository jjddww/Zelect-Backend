import { Router } from 'express';
import { getHomeBanner } from './home.controller';

const router = Router();

router.get('/banner', getHomeBanner);

export default router;
