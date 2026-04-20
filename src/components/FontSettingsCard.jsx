import { useState } from 'react';
import { useFont } from "./GlobalFontProvider";
import "./FontSettingsCard.css";

export default function FontSettingsCard() {
  const { fontSettings, updateFont, resetFont } = useFont();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Toggle Button with Text */}
      <button 
        className="font-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Font Settings"
      >
        Font Setting
      </button>

      {/* Compact Card */}
      {isOpen && (
        <div className="font-card">
          <div className="font-card-header">
            <h3>⚙️ Font Settings</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="font-card-body">
            {/* Font Family */}
            <div className="font-field">
              <label>📝 Font Family</label>
              <select
                value={fontSettings.family}
                onChange={(e) => updateFont(e.target.value, fontSettings.size, fontSettings.weight)}
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Poppins', sans-serif">Poppins</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="font-field">
              <label>📏 Font Size: <strong>{fontSettings.size}</strong></label>
              <input
                type="range"
                min="10"
                max="20"
                step="1"
                value={parseInt(fontSettings.size)}
                onChange={(e) => updateFont(fontSettings.family, `${e.target.value}px`, fontSettings.weight)}
              />
              <div className="size-labels">
                <span>10</span><span>12</span><span>14</span><span>16</span><span>18</span><span>20</span>
              </div>
            </div>

            {/* Font Weight */}
            <div className="font-field">
              <label>💪 Font Weight</label>
              <div className="weight-group">
                {[
                  { value: '300', label: 'Light' },
                  { value: '400', label: 'Normal' },
                  { value: '500', label: 'Medium' },
                  { value: '600', label: 'Semi' },
                  { value: '700', label: 'Bold' }
                ].map(w => (
                  <button
                    key={w.value}
                    className={`weight-chip ${fontSettings.weight === w.value ? 'active' : ''}`}
                    onClick={() => updateFont(fontSettings.family, fontSettings.size, w.value)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Preview */}
            <div className="preview-box" style={{
              fontFamily: fontSettings.family,
              fontSize: fontSettings.size,
              fontWeight: fontSettings.weight
            }}>
              <div className="preview-text">Aa</div>
              <div className="preview-sample">The quick brown fox jumps</div>
            </div>

            {/* Current Settings Display */}
            <div className="current-settings">
              <small>
                Current: {fontSettings.size} / 
                {fontSettings.weight === '300' ? 'Light' : 
                 fontSettings.weight === '400' ? 'Normal' : 
                 fontSettings.weight === '500' ? 'Medium' : 
                 fontSettings.weight === '600' ? 'Semi Bold' : 'Bold'}
              </small>
            </div>

            {/* Reset Button */}
            <button className="reset-btn" onClick={resetFont}>
              🔄 Reset to Default (14px Bold)
            </button>
          </div>
        </div>
      )}
    </>
  );
}