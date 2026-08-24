'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` only after the component has mounted on the client.
 * During SSR and the first client render this returns `false`.
 * Use this to gate any `localStorage` reads or browser-only APIs
 * so the server-rendered HTML always matches the initial client render.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: fires once after mount
    setIsClient(true);
  }, []);
  return isClient;
}
