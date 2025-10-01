'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface TelegramContextValue {
  webApp: any;
  initData: string;
  user: any;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<TelegramContextValue | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp) {
        WebApp.ready();
        WebApp.expand();

        setValue({
          webApp: WebApp,
          initData: WebApp.initData,
          user: WebApp.initDataUnsafe?.user,
        });

        // Apply Telegram theme
        if (WebApp.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    }
  }, []);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  return context || { webApp: null, initData: '', user: null };
}