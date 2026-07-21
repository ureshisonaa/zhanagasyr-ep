import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement>, onOutsideClick: () => void): void {
  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onOutsideClick]);
}
