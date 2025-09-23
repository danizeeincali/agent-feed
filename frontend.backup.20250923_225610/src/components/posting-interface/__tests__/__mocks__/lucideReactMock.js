/**
 * Lucide React Mock
 * Provides mock implementations for all Lucide React icons
 */

const React = require('react');

// Create a generic icon component
const createIcon = (iconName) => {
  const MockIcon = React.forwardRef(({
    className,
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    'data-testid': testId,
    ...props
  }, ref) => {
    return React.createElement('svg', {
      ref,
      className,
      'data-testid': testId || `icon-${iconName.toLowerCase()}`,
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-label': iconName,
      role: 'img',
      ...props
    }, React.createElement('title', null, iconName));
  });

  MockIcon.displayName = iconName;
  return MockIcon;
};

// Export all icons used in the components
module.exports = {
  // Core icons for AviDirectChatSDK
  Send: createIcon('Send'),
  Bot: createIcon('Bot'),
  MessageCircle: createIcon('MessageCircle'),
  Loader: createIcon('Loader'),
  AlertCircle: createIcon('AlertCircle'),
  Image: createIcon('Image'),
  X: createIcon('X'),
  Shield: createIcon('Shield'),

  // Icons for EnhancedPostingInterface
  Edit3: createIcon('Edit3'),
  Zap: createIcon('Zap'),

  // Additional common icons that might be used
  Check: createIcon('Check'),
  CheckCircle: createIcon('CheckCircle'),
  ChevronDown: createIcon('ChevronDown'),
  ChevronLeft: createIcon('ChevronLeft'),
  ChevronRight: createIcon('ChevronRight'),
  ChevronUp: createIcon('ChevronUp'),
  Circle: createIcon('Circle'),
  Clock: createIcon('Clock'),
  Copy: createIcon('Copy'),
  Download: createIcon('Download'),
  Eye: createIcon('Eye'),
  EyeOff: createIcon('EyeOff'),
  File: createIcon('File'),
  FileText: createIcon('FileText'),
  Folder: createIcon('Folder'),
  Heart: createIcon('Heart'),
  Home: createIcon('Home'),
  Info: createIcon('Info'),
  Link: createIcon('Link'),
  Lock: createIcon('Lock'),
  Mail: createIcon('Mail'),
  Menu: createIcon('Menu'),
  MoreHorizontal: createIcon('MoreHorizontal'),
  MoreVertical: createIcon('MoreVertical'),
  Phone: createIcon('Phone'),
  Play: createIcon('Play'),
  Plus: createIcon('Plus'),
  Refresh: createIcon('Refresh'),
  Search: createIcon('Search'),
  Settings: createIcon('Settings'),
  Share: createIcon('Share'),
  Star: createIcon('Star'),
  Trash: createIcon('Trash'),
  Upload: createIcon('Upload'),
  User: createIcon('User'),
  Users: createIcon('Users'),
  Video: createIcon('Video'),
  Wifi: createIcon('Wifi'),
  WifiOff: createIcon('WifiOff'),

  // Arrow icons
  ArrowDown: createIcon('ArrowDown'),
  ArrowLeft: createIcon('ArrowLeft'),
  ArrowRight: createIcon('ArrowRight'),
  ArrowUp: createIcon('ArrowUp'),

  // Status icons
  Bell: createIcon('Bell'),
  BellOff: createIcon('BellOff'),
  Bookmark: createIcon('Bookmark'),
  Calendar: createIcon('Calendar'),
  Camera: createIcon('Camera'),
  Flag: createIcon('Flag'),
  Globe: createIcon('Globe'),
  HelpCircle: createIcon('HelpCircle'),
  MapPin: createIcon('MapPin'),
  Mic: createIcon('Mic'),
  MicOff: createIcon('MicOff'),
  Monitor: createIcon('Monitor'),
  Pause: createIcon('Pause'),
  Power: createIcon('Power'),
  Save: createIcon('Save'),
  Smartphone: createIcon('Smartphone'),
  Speaker: createIcon('Speaker'),
  Square: createIcon('Square'),
  Stop: createIcon('Stop'),
  Sun: createIcon('Sun'),
  Tag: createIcon('Tag'),
  Target: createIcon('Target'),
  Thermometer: createIcon('Thermometer'),
  ToggleLeft: createIcon('ToggleLeft'),
  ToggleRight: createIcon('ToggleRight'),
  Tool: createIcon('Tool'),
  Tv: createIcon('Tv'),
  Type: createIcon('Type'),
  Umbrella: createIcon('Umbrella'),
  Unlock: createIcon('Unlock'),
  Volume: createIcon('Volume'),
  Volume1: createIcon('Volume1'),
  Volume2: createIcon('Volume2'),
  VolumeX: createIcon('VolumeX'),
  Watch: createIcon('Watch'),
  Wifi: createIcon('Wifi'),
  Wind: createIcon('Wind'),
  Zap: createIcon('Zap'),

  // Social and communication
  AtSign: createIcon('AtSign'),
  Hash: createIcon('Hash'),
  MessageSquare: createIcon('MessageSquare'),
  Send: createIcon('Send'),
  Smile: createIcon('Smile'),
  ThumbsDown: createIcon('ThumbsDown'),
  ThumbsUp: createIcon('ThumbsUp'),

  // File and document icons
  Archive: createIcon('Archive'),
  Clipboard: createIcon('Clipboard'),
  Database: createIcon('Database'),
  Folder: createIcon('Folder'),
  FolderOpen: createIcon('FolderOpen'),
  HardDrive: createIcon('HardDrive'),
  Layers: createIcon('Layers'),
  Package: createIcon('Package'),
  PaperClip: createIcon('PaperClip'),
  Printer: createIcon('Printer'),

  // CommonJS compatibility
  __esModule: true,
  default: {
    Send: createIcon('Send'),
    Bot: createIcon('Bot'),
    MessageCircle: createIcon('MessageCircle'),
    Loader: createIcon('Loader'),
    AlertCircle: createIcon('AlertCircle'),
    Image: createIcon('Image'),
    X: createIcon('X'),
    Shield: createIcon('Shield'),
    Edit3: createIcon('Edit3'),
    Zap: createIcon('Zap')
  }
};