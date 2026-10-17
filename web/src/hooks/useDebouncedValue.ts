import { useEffect, useState } from 'react';

/** `value` once it has stopped changing for `delay` milliseconds. */
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [settled, setSettled] = useState<T>(value);
  useEffect((): (() => void) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => setSettled(value), delay);
    return (): void => clearTimeout(timer);
  }, [value, delay]);
  return settled;
};

export default useDebouncedValue;
