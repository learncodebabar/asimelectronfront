import { useState, useEffect, createContext, useContext } from 'react';

// Create context for font settings
const FontContext = createContext();

export const useFont = () => useContext(FontContext);

const FONT_STORAGE_KEY = 'global_font_settings';

const DEFAULT_FONT = {
  family: 'Arial, sans-serif',
  size: '14px',
  weight: '700'
};

export function GlobalFontProvider({ children }) {
  const [fontSettings, setFontSettings] = useState(DEFAULT_FONT);

  // Apply font to entire document
  const applyGlobalFont = (family, size, weight) => {
    // Apply to html and body
    document.documentElement.style.fontFamily = family;
    document.documentElement.style.fontSize = size;
    document.documentElement.style.fontWeight = weight;
    
    document.body.style.fontFamily = family;
    document.body.style.fontSize = size;
    document.body.style.fontWeight = weight;
    
    // Create and inject a style tag for global override
    let styleTag = document.getElementById('global-font-override');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'global-font-override';
      document.head.appendChild(styleTag);
    }
    
    styleTag.textContent = `
      * {
        font-family: ${family} !important;
      }
      body, html, div, span, p, h1, h2, h3, h4, h5, h6, 
      input, select, textarea, button, table, td, th, 
      li, a, label, span, strong, b, i, em {
        font-family: ${family} !important;
        font-size: ${size} !important;
        font-weight: ${weight} !important;
      }
      /* Preserve Urdu font for Urdu text */
      .urdu, [class*="urdu"], [dir="rtl"], 
      .shop-urdu, .shop-addr, .banner, .terms-box {
        font-family: ${family}, 'Noto Nastaliq Urdu', 'Mehr Nastaliq', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif !important;
      }
    `;
    
    // Save to localStorage
    const settings = { family, size, weight, timestamp: new Date().toISOString() };
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(settings));
  };

  // Load saved font on mount
  useEffect(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (saved) {
      try {
        const { family, size, weight } = JSON.parse(saved);
        setFontSettings({ family, size, weight });
        applyGlobalFont(family, size, weight);
      } catch (error) {
        console.error('Failed to load font settings:', error);
      }
    } else {
      // Apply default font
      applyGlobalFont(DEFAULT_FONT.family, DEFAULT_FONT.size, DEFAULT_FONT.weight);
    }
  }, []);

  const updateFont = (family, size, weight) => {
    const newSettings = { family, size, weight };
    setFontSettings(newSettings);
    applyGlobalFont(family, size, weight);
  };

  const resetFont = () => {
    setFontSettings(DEFAULT_FONT);
    applyGlobalFont(DEFAULT_FONT.family, DEFAULT_FONT.size, DEFAULT_FONT.weight);
  };

  return (
    <FontContext.Provider value={{ fontSettings, updateFont, resetFont }}>
      {children}
    </FontContext.Provider>
  );
}