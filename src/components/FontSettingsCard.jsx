import { useState } from 'react';
import { useFont } from "./GlobalFontProvider";
import "./FontSettingsCard.css";

export default function FontSettingsCard() {
  const { fontSettings, updateFontSetting, resetFont } = useFont();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');

  const tabs = [
    { id: 'global', label: '🌐 Global', setting: 'globalSize', weight: 'globalWeight' },
    { id: 'label', label: '🏷️ Labels', setting: 'labelSize', weight: 'labelWeight' },
    { id: 'table', label: '📊 Table', setting: 'tableSize', weight: 'tableWeight' },
    { id: 'heading', label: '📝 Headings', setting: 'headingSize', weight: 'headingWeight' },
    { id: 'span', label: '📄 Text', setting: 'spanSize', weight: 'spanWeight' },
    { id: 'input', label: '⌨️ Inputs', setting: 'inputSize', weight: 'inputWeight' }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);
  const currentSize = parseInt(fontSettings[currentTab?.setting] || '13px');
  const currentWeight = fontSettings[currentTab?.weight] || '400';

  const handleSizeChange = (size) => {
    updateFontSetting(currentTab.setting, `${size}px`);
  };

  const handleWeightChange = (weight) => {
    updateFontSetting(currentTab.weight, weight);
  };

  // Get weight label
  const getWeightLabel = (weight) => {
    switch(weight) {
      case '300': return 'Light';
      case '400': return 'Normal';
      case '500': return 'Medium';
      case '600': return 'Semi Bold';
      case '700': return 'Bold';
      case '800': return 'Extra Bold';
      case '900': return 'Black';
      default: return 'Normal';
    }
  };

  return (
    <>
      <button 
        className="font-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Font Settings"
      >
        🔤 Font
      </button>

      {isOpen && (
        <div className="font-card">
          <div className="font-card-header">
            <h3>⚙️ Font Settings</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="font-card-body">
            {/* Tabs */}
            <div className="font-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`font-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Font Family - Only for global */}
            {activeTab === 'global' && (
              <div className="font-field">
                <label>📝 Font Family</label>
                <select
                  value={fontSettings.family}
                  onChange={(e) => updateFontSetting('family', e.target.value)}
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
            )}

            {/* Font Size */}
            <div className="font-field">
              <label>📏 Font Size: <strong>{currentSize}px</strong></label>
              <input
                type="range"
                min="9"
                max="24"
                step="1"
                value={currentSize}
                onChange={(e) => handleSizeChange(parseInt(e.target.value))}
              />
              <div className="size-labels">
                <span>9</span><span>11</span><span>13</span><span>15</span><span>17</span><span>19</span><span>21</span><span>24</span>
              </div>
            </div>

            {/* Font Weight - Available for ALL tabs now */}
            <div className="font-field">
              <label>💪 Font Weight: <strong>{getWeightLabel(currentWeight)}</strong></label>
              <div className="weight-group">
                {[
                  { value: '300', label: 'Light', icon: '✨' },
                  { value: '400', label: 'Normal', icon: '📝' },
                  { value: '500', label: 'Medium', icon: '⚡' },
                  { value: '600', label: 'Semi Bold', icon: '💪' },
                  { value: '700', label: 'Bold', icon: '🔥' },
                  { value: '800', label: 'Extra Bold', icon: '💥' },
                  { value: '900', label: 'Black', icon: '🖤' }
                ].map(w => (
                  <button
                    key={w.value}
                    className={`weight-chip ${currentWeight === w.value ? 'active' : ''}`}
                    onClick={() => handleWeightChange(w.value)}
                    style={{
                      fontWeight: w.value === '400' ? 'normal' : w.value
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{w.icon}</span> {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview for selected element type */}
            <div className="preview-box">
              <div className="preview-label">Preview ({activeTab.toUpperCase()}):</div>
              {activeTab === 'label' && (
                <label style={{ 
                  fontFamily: fontSettings.family,
                  fontSize: `${currentSize}px`,
                  fontWeight: currentWeight
                }}>Sample Label Text - The quick brown fox jumps over the lazy dog</label>
              )}
              {activeTab === 'table' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ 
                        fontFamily: fontSettings.family,
                        fontSize: `${currentSize}px`,
                        fontWeight: currentWeight,
                        border: '1px solid #ccc',
                        padding: '8px'
                      }}>Cell 1</td>
                      <td style={{ 
                        fontFamily: fontSettings.family,
                        fontSize: `${currentSize}px`,
                        fontWeight: currentWeight,
                        border: '1px solid #ccc',
                        padding: '8px'
                      }}>Cell 2</td>
                    </tr>
                    <tr>
                      <td style={{ 
                        fontFamily: fontSettings.family,
                        fontSize: `${currentSize}px`,
                        fontWeight: currentWeight,
                        border: '1px solid #ccc',
                        padding: '8px'
                      }}>Cell 3</td>
                      <td style={{ 
                        fontFamily: fontSettings.family,
                        fontSize: `${currentSize}px`,
                        fontWeight: currentWeight,
                        border: '1px solid #ccc',
                        padding: '8px'
                      }}>Cell 4</td>
                    </tr>
                  </tbody>
                </table>
              )}
              {activeTab === 'heading' && (
                <div>
                  <h1 style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${parseInt(currentSize) + 8}px`,
                    fontWeight: currentWeight,
                    margin: '4px 0'
                  }}>Heading 1</h1>
                  <h2 style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${parseInt(currentSize) + 4}px`,
                    fontWeight: currentWeight,
                    margin: '4px 0'
                  }}>Heading 2</h2>
                  <h3 style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${currentSize}px`,
                    fontWeight: currentWeight,
                    margin: '4px 0'
                  }}>Heading 3 - Sample Text</h3>
                </div>
              )}
              {activeTab === 'span' && (
                <div>
                  <span style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${currentSize}px`,
                    fontWeight: currentWeight,
                    display: 'block',
                    marginBottom: '8px'
                  }}>Regular span text content here</span>
                  <span style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${currentSize}px`,
                    fontWeight: currentWeight === '400' ? '600' : currentWeight,
                    display: 'block',
                    color: '#3b82f6'
                  }}>Important: This text shows bold effect</span>
                </div>
              )}
              {activeTab === 'input' && (
                <div>
                  <input 
                    type="text" 
                    placeholder="Sample input field"
                    value="Sample text input"
                    style={{ 
                      fontFamily: fontSettings.family,
                      fontSize: `${currentSize}px`,
                      fontWeight: currentWeight,
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      width: '100%',
                      marginBottom: '8px'
                    }}
                  />
                  <select style={{ 
                    fontFamily: fontSettings.family,
                    fontSize: `${currentSize}px`,
                    fontWeight: currentWeight,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    width: '100%'
                  }}>
                    <option>Sample select option</option>
                    <option>Another option</option>
                  </select>
                </div>
              )}
              {activeTab === 'global' && (
                <div style={{ 
                  fontFamily: fontSettings.family,
                  fontSize: `${currentSize}px`,
                  fontWeight: currentWeight
                }}>
                  <p style={{ margin: '4px 0' }}>📄 Paragraph text example</p>
                  <label style={{ display: 'block', margin: '4px 0' }}>🏷️ Label text example</label>
                  <div style={{ margin: '4px 0' }}>📦 Div content example</div>
                  <span style={{ display: 'block', margin: '4px 0' }}>✨ Span text example</span>
                  <strong style={{ display: 'block', margin: '4px 0' }}>🔥 Strong/bold text example</strong>
                </div>
              )}
            </div>

            {/* Current Settings Display */}
            <div className="current-settings">
              <small>
                Current: <strong>{activeTab}</strong> → {currentSize}px / {getWeightLabel(currentWeight)}
                {activeTab !== 'global' && (
                  <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
                    (Global: {parseInt(fontSettings.globalSize)}px / {getWeightLabel(fontSettings.globalWeight)})
                  </span>
                )}
              </small>
            </div>

            {/* Reset Button */}
            <button className="reset-btn" onClick={resetFont}>
              🔄 Reset All to Default
            </button>
          </div>
        </div>
      )}
    </>
  );
}