import React, { useState, useEffect } from 'react';
import { 
  Palette,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Sun,
  Moon,
  Circle,
  Square,
  Hexagon,
  Zap,
  Sparkles,
  Brush,
  Type,
  Layout,
  Grid,
  List,
  Columns,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';

export interface ThemeSettings {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  
  // Typography
  fontFamily: 'system' | 'serif' | 'mono' | 'rounded';
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'light' | 'normal' | 'medium' | 'bold';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  
  // Layout
  layout: 'grid' | 'list' | 'masonry' | 'cards';
  spacing: 'compact' | 'normal' | 'relaxed';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  
  // Effects
  shadows: 'none' | 'soft' | 'medium' | 'strong';
  animations: 'none' | 'subtle' | 'smooth' | 'bouncy';
  glassmorphism: boolean;
  gradientBg: boolean;
  
  // Dark mode
  darkMode: 'light' | 'dark' | 'auto';
  
  // Custom CSS
  customCSS?: string;
}

interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

interface ThemeCustomizerProps {
  settings: ThemeSettings;
  onChange: (settings: Partial<ThemeSettings>) => void;
  onPreview?: (settings: ThemeSettings) => void;
  className?: string;
}

const COLOR_PALETTES: ColorPalette[] = [
  {
    name: 'Blue Ocean',
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#06b6d4',
    background: '#f8fafc',
    text: '#1f2937',
    border: '#e2e8f0'
  },
  {
    name: 'Purple Haze',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
    background: '#faf5ff',
    text: '#374151',
    border: '#e7e5e4'
  },
  {
    name: 'Green Forest',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    background: '#f0fdf4',
    text: '#1f2937',
    border: '#d1fae5'
  },
  {
    name: 'Sunset Orange',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
    background: '#fffbeb',
    text: '#1f2937',
    border: '#fed7aa'
  },
  {
    name: 'Rose Pink',
    primary: '#ec4899',
    secondary: '#db2777',
    accent: '#f472b6',
    background: '#fdf2f8',
    text: '#1f2937',
    border: '#fbcfe8'
  },
  {
    name: 'Dark Professional',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#818cf8',
    background: '#0f172a',
    text: '#f8fafc',
    border: '#334155'
  }
];

const FONT_FAMILIES = [
  { value: 'system', label: 'System Default', preview: 'The quick brown fox' },
  { value: 'serif', label: 'Serif', preview: 'The quick brown fox' },
  { value: 'mono', label: 'Monospace', preview: 'The quick brown fox' },
  { value: 'rounded', label: 'Rounded', preview: 'The quick brown fox' }
];

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  settings,
  onChange,
  onPreview,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'layout' | 'effects'>('colors');
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleColorChange = (colorKey: keyof ThemeSettings, color: string) => {
    onChange({ [colorKey]: color });
  };

  const applyColorPalette = (palette: ColorPalette) => {
    onChange({
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
      textColor: palette.text,
      borderColor: palette.border
    });
  };

  const copyColorToClipboard = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  const generateRandomPalette = () => {
    const hue = Math.floor(Math.random() * 360);
    const primaryColor = `hsl(${hue}, 60%, 50%)`;
    const secondaryColor = `hsl(${(hue + 30) % 360}, 60%, 40%)`;
    const accentColor = `hsl(${(hue + 60) % 360}, 60%, 60%)`;
    
    onChange({
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor: settings.darkMode === 'dark' ? '#0f172a' : '#ffffff',
      textColor: settings.darkMode === 'dark' ? '#f8fafc' : '#1f2937',
      borderColor: settings.darkMode === 'dark' ? '#334155' : '#e2e8f0'
    });
  };

  const resetToDefaults = () => {
    onChange({
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      accentColor: '#06b6d4',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderColor: '#e2e8f0',
      fontFamily: 'system',
      fontSize: 'medium',
      fontWeight: 'normal',
      lineHeight: 'normal',
      layout: 'grid',
      spacing: 'normal',
      borderRadius: 'medium',
      shadows: 'medium',
      animations: 'smooth',
      glassmorphism: false,
      gradientBg: false,
      darkMode: 'light'
    });
  };

  const previewTheme = () => {
    if (onPreview) {
      onPreview(settings);
      setPreviewMode(!previewMode);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Theme Customizer</h3>
          <p className="text-sm text-gray-600">Customize the visual appearance of your agent profile</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={generateRandomPalette}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Random
          </button>
          
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
          
          {onPreview && (
            <button
              onClick={previewTheme}
              className={cn(
                'inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md',
                previewMode
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              )}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'colors', name: 'Colors', icon: Palette },
            { id: 'typography', name: 'Typography', icon: Type },
            { id: 'layout', name: 'Layout', icon: Layout },
            { id: 'effects', name: 'Effects', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Color Palettes */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Pre-built Palettes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => applyColorPalette(palette)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.primary }}></div>
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.secondary }}></div>
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.accent }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{palette.name}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Primary • Secondary • Accent
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'primaryColor', label: 'Primary Color', description: 'Main brand color' },
              { key: 'secondaryColor', label: 'Secondary Color', description: 'Supporting color' },
              { key: 'accentColor', label: 'Accent Color', description: 'Highlight color' },
              { key: 'backgroundColor', label: 'Background Color', description: 'Page background' },
              { key: 'textColor', label: 'Text Color', description: 'Primary text' },
              { key: 'borderColor', label: 'Border Color', description: 'Border elements' }
            ].map(({ key, label, description }) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <p className="text-xs text-gray-500">{description}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings[key as keyof ThemeSettings] as string}
                    onChange={(e) => handleColorChange(key as keyof ThemeSettings, e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings[key as keyof ThemeSettings] as string}
                    onChange={(e) => handleColorChange(key as keyof ThemeSettings, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyColorToClipboard(settings[key as keyof ThemeSettings] as string)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded"
                  >
                    {copiedColor === settings[key as keyof ThemeSettings] ? 
                      <Check className="w-4 h-4 text-green-500" /> : 
                      <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dark Mode Toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Color Mode</h4>
            <div className="flex items-center gap-4">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'auto', label: 'Auto', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => onChange({ darkMode: value as any })}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border rounded-lg',
                    settings.darkMode === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          {/* Font Family */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Font Family</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onChange({ fontFamily: font.value as any })}
                  className={cn(
                    'p-4 border rounded-lg text-left',
                    settings.fontFamily === font.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="font-medium text-gray-900 mb-2">{font.label}</div>
                  <div 
                    className="text-sm text-gray-600"
                    style={{
                      fontFamily: font.value === 'system' ? 'system-ui' :
                                  font.value === 'serif' ? 'Georgia, serif' :
                                  font.value === 'mono' ? 'ui-monospace, monospace' :
                                  'ui-rounded, system-ui'
                    }}
                  >
                    {font.preview}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Font Size</h4>
            <div className="grid grid-cols-3 gap-4">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => onChange({ fontSize: size as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center capitalize',
                    settings.fontSize === size
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'font-medium',
                    size === 'small' ? 'text-sm' :
                    size === 'medium' ? 'text-base' :
                    'text-lg'
                  )}>
                    {size}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Font Weight</h4>
            <div className="grid grid-cols-4 gap-4">
              {['light', 'normal', 'medium', 'bold'].map((weight) => (
                <button
                  key={weight}
                  onClick={() => onChange({ fontWeight: weight as any })}
                  className={cn(
                    'p-3 border rounded-lg text-center capitalize',
                    settings.fontWeight === weight
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'text-sm',
                    weight === 'light' ? 'font-light' :
                    weight === 'normal' ? 'font-normal' :
                    weight === 'medium' ? 'font-medium' :
                    'font-bold'
                  )}>
                    {weight}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Line Height</h4>
            <div className="grid grid-cols-3 gap-4">
              {['tight', 'normal', 'relaxed'].map((height) => (
                <button
                  key={height}
                  onClick={() => onChange({ lineHeight: height as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center capitalize',
                    settings.lineHeight === height
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'text-sm',
                    height === 'tight' ? 'leading-tight' :
                    height === 'normal' ? 'leading-normal' :
                    'leading-relaxed'
                  )}>
                    {height} spacing
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          {/* Layout Style */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Layout Style</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: 'grid', label: 'Grid', icon: Grid },
                { value: 'list', label: 'List', icon: List },
                { value: 'masonry', label: 'Masonry', icon: Columns },
                { value: 'cards', label: 'Cards', icon: Square }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => onChange({ layout: value as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center',
                    settings.layout === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Spacing</h4>
            <div className="grid grid-cols-3 gap-4">
              {['compact', 'normal', 'relaxed'].map((spacing) => (
                <button
                  key={spacing}
                  onClick={() => onChange({ spacing: spacing as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center capitalize',
                    settings.spacing === spacing
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="text-sm font-medium">{spacing}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {spacing === 'compact' ? 'Tight spacing' :
                     spacing === 'normal' ? 'Standard spacing' :
                     'Loose spacing'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Corner Radius</h4>
            <div className="grid grid-cols-5 gap-4">
              {[
                { value: 'none', label: 'None' },
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
                { value: 'full', label: 'Full' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onChange({ borderRadius: value as any })}
                  className={cn(
                    'p-3 border text-center text-sm',
                    value === 'none' ? 'rounded-none' :
                    value === 'small' ? 'rounded-sm' :
                    value === 'medium' ? 'rounded-md' :
                    value === 'large' ? 'rounded-lg' :
                    'rounded-full',
                    settings.borderRadius === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 bg-gray-300 mx-auto mb-2',
                    value === 'none' ? 'rounded-none' :
                    value === 'small' ? 'rounded-sm' :
                    value === 'medium' ? 'rounded-md' :
                    value === 'large' ? 'rounded-lg' :
                    'rounded-full'
                  )}></div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Effects Tab */}
      {activeTab === 'effects' && (
        <div className="space-y-6">
          {/* Shadows */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Shadow Effects</h4>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: 'none', label: 'None', shadow: 'shadow-none' },
                { value: 'soft', label: 'Soft', shadow: 'shadow-sm' },
                { value: 'medium', label: 'Medium', shadow: 'shadow-md' },
                { value: 'strong', label: 'Strong', shadow: 'shadow-lg' }
              ].map(({ value, label, shadow }) => (
                <button
                  key={value}
                  onClick={() => onChange({ shadows: value as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center',
                    shadow,
                    settings.shadows === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Animation Style</h4>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: 'none', label: 'None' },
                { value: 'subtle', label: 'Subtle' },
                { value: 'smooth', label: 'Smooth' },
                { value: 'bouncy', label: 'Bouncy' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onChange({ animations: value as any })}
                  className={cn(
                    'p-4 border rounded-lg text-center transition-all duration-200',
                    settings.animations === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 transform scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                  )}
                >
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Special Effects */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Special Effects</h4>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Glassmorphism</div>
                <div className="text-sm text-gray-500">Translucent glass-like effect</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.glassmorphism}
                  onChange={(e) => onChange({ glassmorphism: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Gradient Background</div>
                <div className="text-sm text-gray-500">Animated gradient backdrop</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gradientBg}
                  onChange={(e) => onChange({ gradientBg: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Custom CSS */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Custom CSS</h4>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Advanced styling (optional)</label>
              <textarea
                value={settings.customCSS || ''}
                onChange={(e) => onChange({ customCSS: e.target.value })}
                placeholder="/* Add custom CSS here */&#10;.agent-profile {&#10;  /* Custom styles */&#10;}"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Custom CSS will be applied to your agent profile. Use with caution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Theme Preview */}
      {previewMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Theme Preview</h4>
              <button
                onClick={() => setPreviewMode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div 
              className="space-y-4 p-4 rounded-lg"
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                fontFamily: settings.fontFamily === 'system' ? 'system-ui' :
                           settings.fontFamily === 'serif' ? 'Georgia, serif' :
                           settings.fontFamily === 'mono' ? 'ui-monospace, monospace' :
                           'ui-rounded, system-ui'
              }}
            >
              <div 
                className="p-4 rounded"
                style={{ 
                  backgroundColor: settings.primaryColor,
                  color: 'white',
                  borderRadius: settings.borderRadius === 'none' ? '0' :
                              settings.borderRadius === 'small' ? '0.125rem' :
                              settings.borderRadius === 'medium' ? '0.375rem' :
                              settings.borderRadius === 'large' ? '0.5rem' :
                              '9999px'
                }}
              >
                <h3 className="font-semibold">Sample Header</h3>
                <p className="text-sm opacity-90">This is how your primary color looks</p>
              </div>
              
              <div 
                className="p-3 border"
                style={{ 
                  borderColor: settings.borderColor,
                  backgroundColor: settings.secondaryColor + '10'
                }}
              >
                <p>Sample content with border and secondary background</p>
              </div>
              
              <button
                className="px-4 py-2 rounded font-medium"
                style={{ 
                  backgroundColor: settings.accentColor,
                  color: 'white'
                }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeCustomizer;