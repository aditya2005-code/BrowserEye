import { Router, Request, Response } from 'express';

import sessionRouter from './sessions';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'BrowserEye Backend Running'
  });
});

router.use('/api/sessions', sessionRouter);

export default router;
