import { createContext, useContext } from 'react';

export const LayoutContext = createContext({ openMobileMenu: () => {} });

export function useLayout() {
  return useContext(LayoutContext);
}
