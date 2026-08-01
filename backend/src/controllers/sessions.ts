import { Request, Response } from 'express';
import { SessionService } from '../services/sessions';

export class SessionController {
  /**
   * POST /api/sessions
   * Creates and stores a completed session.
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      await SessionService.createSession(req.body);
      res.status(201).json({
        success: true,
        message: 'Session stored successfully'
      });
    } catch (error) {
      console.error('[SessionController.create] Error storing session:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while saving the session'
      });
    }
  }

  /**
   * GET /api/sessions
   * Retrieves all sessions or filters by date if query param is set.
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query;

      if (date !== undefined) {
        // Validate date format YYYY-MM-DD
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          res.status(400).json({
            success: false,
            message: 'Invalid date parameter. Format must be YYYY-MM-DD'
          });
          return;
        }

        const sessions = await SessionService.getSessionsByDate(date);
        res.status(200).json(sessions);
        return;
      }

      // No date filter, return all sessions
      const sessions = await SessionService.getAllSessions();
      res.status(200).json(sessions);
    } catch (error) {
      console.error('[SessionController.list] Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while retrieving sessions'
      });
    }
  }
}
