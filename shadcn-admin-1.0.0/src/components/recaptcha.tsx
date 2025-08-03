"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        parameters: { sitekey: string; callback: (token: string) => void }
      ) => number;
      reset: (id: number) => void;
    };
  }
}

export interface RecaptchaHandle {
  reset: () => void;
}

interface RecaptchaProps {
  onChange: (token: string | null) => void;
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ onChange }, ref) => {
  const divRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      return;
    }

    const render = () => {
      if (!divRef.current) return;
      widgetIdRef.current = window.grecaptcha.render(divRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onChange(token),
      });
    };

    if (window.grecaptcha) {
      render();
    } else {
      const scriptId = "recaptcha-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = render;
        document.head.appendChild(script);
      } else {
        const existing = document.getElementById(scriptId)!;
        existing.addEventListener("load", render);
      }
    }
  }, [onChange]);

  return <div ref={divRef} />;
});

Recaptcha.displayName = "Recaptcha";

export default Recaptcha;
