import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AppPreferencesContext = createContext(null);

const getStoredPreference = (key, fallback) => {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export const AppPreferencesProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => getStoredPreference('medminders-language', 'en'));
  const [theme, setTheme] = useState(() => getStoredPreference('medminders-theme', 'light'));

  useEffect(() => {
    document.documentElement.dataset.language = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
    window.localStorage.setItem('medminders-language', language);
    window.localStorage.setItem('medminders-theme', theme);
  }, [language, theme]);

  const value = useMemo(() => ({
    language,
    theme,
    isBangla: language === 'bn',
    isDark: theme === 'dark',
    toggleLanguage: () => setLanguage((current) => current === 'en' ? 'bn' : 'en'),
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }), [language, theme]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return context;
};
