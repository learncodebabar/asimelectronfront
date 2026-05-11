import { useState, useEffect, createContext, useContext } from 'react';

// Create context for font settings
const FontContext = createContext();

export const useFont = () => useContext(FontContext);

const FONT_STORAGE_KEY = 'global_font_settings';

const DEFAULT_FONT = {
  family: 'Arial, sans-serif',
  // Global settings
  globalSize: '13px',
  globalWeight: '400',
  // Element-specific settings
  labelSize: '11px',
  labelWeight: '600',
  tableSize: '11px',
  tableWeight: '400',
  headingSize: '16px',
  headingWeight: '700',
  spanSize: '12px',
  spanWeight: '400',
  inputSize: '12px',
  inputWeight: '400'
};

export function GlobalFontProvider({ children }) {
  const [fontSettings, setFontSettings] = useState(DEFAULT_FONT);

  // Apply font to specific element types
  const applyFontStyles = (settings) => {
    // Create or get style tag
    let styleTag = document.getElementById('global-font-override');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'global-font-override';
      document.head.appendChild(styleTag);
    }
    
    // Generate CSS that targets specific element types with bold support
    styleTag.textContent = `
      /* Base font for body */
      body, html {
        font-family: ${settings.family} !important;
        font-size: ${settings.globalSize} !important;
        font-weight: ${settings.globalWeight} !important;
      }
      
      /* Labels - all label elements */
      label, 
      .xp-label, 
      .sl-cust-cell label, 
      .sl-sum-cell label, 
      .sl-inv-field-grp label,
      .sl-hold-title,
      .scm-box-label,
      .sl-table-lbl {
        font-size: ${settings.labelSize} !important;
        font-weight: ${settings.labelWeight} !important;
        font-family: ${settings.family} !important;
      }
      
      /* Tables and table cells */
      table, 
      .sl-items-table, 
      .sl-hold-table, 
      .xp-table,
      table td,
      table th,
      .sl-items-table td,
      .sl-items-table th,
      .sl-hold-table td,
      .sl-hold-table th,
      .xp-table td,
      .xp-table th {
        font-size: ${settings.tableSize} !important;
        font-weight: ${settings.tableWeight} !important;
        font-family: ${settings.family} !important;
      }
      
      /* Headings */
      h1, h2, h3, h4, h5, 
      .xp-modal-title, 
      .scm-tb-title,
      .sl-sale-title-box,
      .sl-credit-title,
      .sl-hold-title span:first-child {
        font-size: ${settings.headingSize} !important;
        font-weight: ${settings.headingWeight} !important;
        font-family: ${settings.family} !important;
      }
      
      /* Spans and text elements */
      span, 
      .sl-inv-info, 
      .text-muted, 
      .xp-empty,
      .sl-inv-info span,
      .sl-cust-cell span,
      .muted,
      .sl-table-qty,
      .sl-cur-name-inline,
      .sl-sum-val,
      .scm-box-val {
        font-size: ${settings.spanSize} !important;
        font-weight: ${settings.spanWeight} !important;
        font-family: ${settings.family} !important;
      }
      
      /* Inputs, selects, textareas */
      input, 
      .xp-input, 
      .sl-product-input, 
      .sl-num-input, 
      .sl-sum-input, 
      .sl-cust-input, 
      .sl-sum-val,
      select,
      textarea,
      .sl-credit-statement-input {
        font-size: ${settings.inputSize} !important;
        font-weight: ${settings.inputWeight} !important;
        font-family: ${settings.family} !important;
      }
      
      /* Buttons */
      button, 
      .xp-btn, 
      .sl-pay-btn, 
      .sl-entry-btns .xp-btn {
        font-family: ${settings.family} !important;
        font-weight: ${settings.globalWeight} !important;
      }
      
      /* Strong/Bold elements */
      strong, b, .bold, .font-bold, .sl-hold-cnt, .sl-hold-title {
        font-weight: ${parseInt(settings.globalWeight) + 100} !important;
      }
      
      /* Preserve Urdu font for Urdu text */
      .urdu, 
      [class*="urdu"], 
      [dir="rtl"],
      .shop-urdu,
      .shop-addr,
      .banner,
      .terms-box {
        font-family: ${settings.family}, 'Noto Nastaliq Urdu', 'Mehr Nastaliq', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif !important;
      }
    `;
    
    // Save to localStorage
    const settingsToSave = { 
      ...settings, 
      timestamp: new Date().toISOString() 
    };
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(settingsToSave));
  };

  // Load saved font on mount
  useEffect(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFontSettings({
          family: parsed.family || DEFAULT_FONT.family,
          globalSize: parsed.globalSize || DEFAULT_FONT.globalSize,
          globalWeight: parsed.globalWeight || DEFAULT_FONT.globalWeight,
          labelSize: parsed.labelSize || DEFAULT_FONT.labelSize,
          labelWeight: parsed.labelWeight || DEFAULT_FONT.labelWeight,
          tableSize: parsed.tableSize || DEFAULT_FONT.tableSize,
          tableWeight: parsed.tableWeight || DEFAULT_FONT.tableWeight,
          headingSize: parsed.headingSize || DEFAULT_FONT.headingSize,
          headingWeight: parsed.headingWeight || DEFAULT_FONT.headingWeight,
          spanSize: parsed.spanSize || DEFAULT_FONT.spanSize,
          spanWeight: parsed.spanWeight || DEFAULT_FONT.spanWeight,
          inputSize: parsed.inputSize || DEFAULT_FONT.inputSize,
          inputWeight: parsed.inputWeight || DEFAULT_FONT.inputWeight
        });
        applyFontStyles(parsed);
      } catch (error) {
        console.error('Failed to load font settings:', error);
        applyFontStyles(DEFAULT_FONT);
      }
    } else {
      // Apply default font
      applyFontStyles(DEFAULT_FONT);
    }
  }, []);

  // Update a specific font setting
  const updateFontSetting = (settingName, value) => {
    setFontSettings(prev => {
      const newSettings = { ...prev, [settingName]: value };
      applyFontStyles(newSettings);
      return newSettings;
    });
  };

  const resetFont = () => {
    setFontSettings(DEFAULT_FONT);
    applyFontStyles(DEFAULT_FONT);
  };

  return (
    <FontContext.Provider value={{ 
      fontSettings, 
      updateFontSetting,
      resetFont 
    }}>
      {children}
    </FontContext.Provider>
  );
}