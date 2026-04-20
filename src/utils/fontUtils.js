// Create a file: utils/fontUtils.js
export const applyGlobalFont = (fontFamily, fontSize, fontWeight) => {
  // Apply to html element
  document.documentElement.style.fontFamily = fontFamily;
  document.documentElement.style.fontSize = fontSize;
  document.documentElement.style.fontWeight = fontWeight;
  
  // Apply to body
  document.body.style.fontFamily = fontFamily;
  document.body.style.fontSize = fontSize;
  document.body.style.fontWeight = fontWeight;
  
  // Apply to all elements (overrides existing inline styles)
  const allElements = document.querySelectorAll('*');
  allElements.forEach(element => {
    element.style.fontFamily = fontFamily;
    element.style.fontSize = fontSize;
    element.style.fontWeight = fontWeight;
  });
  
  // Save to localStorage
  const settings = { fontFamily, fontSize, fontWeight, timestamp: new Date().toISOString() };
  localStorage.setItem('globalFontSettings', JSON.stringify(settings));
};

export const loadSavedFont = () => {
  const saved = localStorage.getItem('globalFontSettings');
  if (saved) {
    const { fontFamily, fontSize, fontWeight } = JSON.parse(saved);
    applyGlobalFont(fontFamily, fontSize, fontWeight);
    return { fontFamily, fontSize, fontWeight };
  }
  return null;
};

export const resetGlobalFont = () => {
  const defaultFont = { fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400' };
  applyGlobalFont(defaultFont.fontFamily, defaultFont.fontSize, defaultFont.fontWeight);
  return defaultFont;
};