import { createContext, useContext, ReactNode } from 'react';

export type DrawerContextValue = {
  openDrawer: () => void;
  closeDrawer: () => void;
  isOpen: boolean;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DrawerContextValue;
}) {
  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue | null {
  return useContext(DrawerContext);
}
