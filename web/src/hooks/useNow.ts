import { useEffect, useState } from 'react';

/** The current time, ticking every second while `active`. */
const useNow = (active: boolean = true): Date => {
  const [now, setNow] = useState<Date>((): Date => new Date());
  useEffect((): (() => void) | undefined => {
    if (!active) return undefined;
    const timer: ReturnType<typeof setInterval> = setInterval((): void => setNow(new Date()), 1000);
    return (): void => clearInterval(timer);
  }, [active]);
  return now;
};

export default useNow;
