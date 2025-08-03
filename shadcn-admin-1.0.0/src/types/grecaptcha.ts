export interface GrecaptchaAPI {
  render: (
    container: string | HTMLElement,
    parameters: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      size?: string;
    }
  ) => number;
  reset: (widgetId: number) => void;
  ready?: (cb: () => void) => void;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaAPI;
  }
}

export {};