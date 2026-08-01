export interface PageSession {
  id: string;
  tabId: number;
  website: string;
  url: string;
  title: string;
  startTime: number;
  endTime?: number;
  duration: number;
  clickCount: number;
  keystrokeCount: number;
  maxScrollDepth: number;
  tabSwitchCount: number;
  screenshot?: string;
  screenshotCaptured?: boolean;
  aiSummary?: string | null;
  category?: string | null;
  clicksBase?: number;
  keystrokesBase?: number;
  scrollDepthBase?: number;
}
