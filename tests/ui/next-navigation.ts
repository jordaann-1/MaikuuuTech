export function usePathname() {
  return new URLSearchParams(location.search).get('path') || '/admin/inquiries';
}
export function useRouter() {
  return {
    push: (path: string) => {
      window.dispatchEvent(new CustomEvent('fixture-navigation', { detail: path }));
      (window as typeof window & { fixtureNavigation?: string }).fixtureNavigation = path;
    },
    refresh: () => {},
    replace: () => {},
  };
}
