import { useEffect } from 'react';
export default function Script({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    const api = {
      render: (node: HTMLElement, options: Record<string, unknown>) => {
        node.textContent = 'Isolated test verification';
        (options.callback as (token: string) => void)('fixture-token');
        return 'fixture-widget';
      },
      remove: () => {},
    };
    (window as typeof window & { turnstile?: typeof api }).turnstile = api;
    onReady?.();
  }, [onReady]);
  return null;
}
