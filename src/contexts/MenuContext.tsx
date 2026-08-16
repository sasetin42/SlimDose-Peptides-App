import React, { createContext, useContext } from 'react';
import { useMenu } from '../hooks/useMenu';

type MenuContextValue = ReturnType<typeof useMenu>;

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const menu = useMenu();
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

export function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenuContext must be used within MenuProvider');
  return ctx;
}
