import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export default function useFocusTrap(active, onEscape) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !containerRef.current) return undefined;

    previousFocusRef.current = document.activeElement;
    const container = containerRef.current;
    const focusables = getFocusableElements(container);
    (focusables[0] ?? container).focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusableElements(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
