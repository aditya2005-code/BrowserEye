export interface InteractionPayload {
  clickCount: number;
  keystrokeCount: number;
  maxScrollDepth: number;
}

export type ExtensionMessage =
  | {
      type: 'INTERACTION_UPDATE';
      payload: InteractionPayload;
    }
  | {
      type: 'PAGE_INITIALIZED';
    };
