import { Router } from 'express';
import { SessionController } from '../controllers/sessions';
import { validateSessionPayload } from '../middleware/validation';

const router = Router();

router.post('/', validateSessionPayload, SessionController.create);
router.get('/', SessionController.list);

export default router;
