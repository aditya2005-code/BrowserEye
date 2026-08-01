import prisma from '../utils/prisma';

export interface CreateSessionInput {
  website: string;
  url: string;
  pageTitle: string;
  startTime: string;
  endTime: string;
  duration: number;
  clicks: number;
  keystrokes: number;
  scrollDepth: number;
  tabSwitches: number;
  aiSummary?: string | null;
  category?: string | null;
}

/**
 * Service to manage business logic for tracking sessions.
 */
export class SessionService {
  /**
   * Saves a completed session to the database.
   */
  public static async createSession(data: CreateSessionInput) {
    return await prisma.session.create({
      data: {
        website: data.website,
        url: data.url,
        pageTitle: data.pageTitle,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        duration: data.duration,
        clicks: data.clicks,
        keystrokes: data.keystrokes,
        scrollDepth: data.scrollDepth,
        tabSwitches: data.tabSwitches,
        aiSummary: data.aiSummary ?? null,
        category: data.category ?? null
      }
    });
  }

  /**
   * Returns all sessions ordered by startTime (descending).
   */
  public static async getAllSessions() {
    return await prisma.session.findMany({
      orderBy: {
        startTime: 'desc'
      }
    });
  }

  /**
   * Returns sessions for the selected UTC date.
   */
  public static async getSessionsByDate(dateString: string) {
    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(`${dateString}T23:59:59.999Z`);

    return await prisma.session.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
  }
}
