import { createContext, useContext } from "react";
import { useLocalStorage, useToast } from "../hooks";
import { DEFAULT_SETTINGS } from "../utils/constants";

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useLocalStorage("tm_settings", DEFAULT_SETTINGS);
  const [cache,    setCache]    = useLocalStorage("tm_bookings", {});
  const { toast, show: showToast } = useToast();

  return (
    <AppCtx.Provider value={{ settings, setSettings, cache, setCache, toast, showToast }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
