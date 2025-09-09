import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageSquare, 
  Zap, 
  Bot, 
  Send,
  ChevronDown,
  X
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { PostCreator } from '../PostCreator';
import { QuickPostSection } from './QuickPostSection';
import { AviDMSection } from './AviDMSection';

export type PostingTab = 'post' | 'quickPost' | 'aviDM';

interface PostingInterfaceProps {
  className?: string;
  onPostCreated?: (post: any) => void;
  initialTab?: PostingTab;
  showTabLabels?: boolean;
  compactMode?: boolean;
}

interface TabConfig {
  id: PostingTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortcut?: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'post',
    label: 'Post',
    icon: MessageSquare,
    description: 'Create a full post with rich formatting',
    shortcut: '⌘+1'
  },
  {
    id: 'quickPost',
    label: 'Quick Post',
    icon: Zap,
    description: 'Quick one-line post for fast updates',
    shortcut: '⌘+2'
  },
  {
    id: 'aviDM',
    label: 'Avi DM',
    icon: Bot,
    description: 'Direct message to specific agents',
    shortcut: '⌘+3'
  }
];

export const PostingInterface: React.FC<PostingInterfaceProps> = ({
  className,
  onPostCreated,
  initialTab = 'post',
  showTabLabels = true,
  compactMode = false
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<PostingTab>(initialTab);
  const [isMobile, setIsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            handleTabSwitch('post');
            break;
          case '2':
            e.preventDefault();
            handleTabSwitch('quickPost');
            break;
          case '3':
            e.preventDefault();
            handleTabSwitch('aviDM');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tab switching with transition
  const handleTabSwitch = useCallback(async (newTab: PostingTab) => {
    if (newTab === activeTab || isTransitioning) return;

    setIsTransitioning(true);
    setShowMobileDropdown(false);
    
    // Add slight delay for smooth transition
    setTimeout(() => {
      setActiveTab(newTab);
      setIsTransitioning(false);
    }, 150);
  }, [activeTab, isTransitioning]);

  // Get current tab config
  const currentTabConfig = useMemo(() => 
    TAB_CONFIGS.find(tab => tab.id === activeTab) || TAB_CONFIGS[0],
    [activeTab]
  );

  // Enhanced post creation handler
  const handlePostCreated = useCallback((post: any) => {
    onPostCreated?.(post);
    
    // Optional: Switch back to post tab after quick post
    if (activeTab === 'quickPost') {
      setTimeout(() => handleTabSwitch('post'), 1000);
    }
  }, [onPostCreated, activeTab, handleTabSwitch]);

  // Render tab navigation
  const renderTabNavigation = () => {
    if (isMobile) {
      return (
        <div className="relative">
          <button
            onClick={() => setShowMobileDropdown(!showMobileDropdown)}
            className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <currentTabConfig.icon className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">{currentTabConfig.label}</div>
                {!compactMode && (
                  <div className="text-xs text-gray-500">{currentTabConfig.description}</div>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              showMobileDropdown && "transform rotate-180"
            )} />
          </button>

          {showMobileDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMobileDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {TAB_CONFIGS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    className={cn(
                      "flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                      "first:rounded-t-lg last:rounded-b-lg",
                      activeTab === tab.id && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <tab.icon className={cn(
                      "w-5 h-5 mr-3",
                      activeTab === tab.id ? "text-blue-600" : "text-gray-400"
                    )} />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      {!compactMode && (
                        <div className="text-xs text-gray-500">{tab.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    // Desktop tab navigation
    return (
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {TAB_CONFIGS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={cn(
              "flex items-center px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
              activeTab === tab.id 
                ? "bg-white text-blue-700 shadow-sm" 
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            )}
            title={`${tab.description}${tab.shortcut ? ` (${tab.shortcut})` : ''}`}
          >
            <tab.icon className={cn(
              "w-4 h-4",
              showTabLabels ? "mr-2" : ""
            )} />
            {showTabLabels && tab.label}
          </button>
        ))}
      </div>
    );
  };

  // Render active tab content
  const renderTabContent = () => {
    const contentClasses = cn(
      "transition-opacity duration-150",
      isTransitioning ? "opacity-0" : "opacity-100"
    );

    switch (activeTab) {
      case 'post':
        return (
          <div className={contentClasses}>
            <PostCreator 
              onPostCreated={handlePostCreated}
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        );
      
      case 'quickPost':
        return (
          <div className={contentClasses}>
            <QuickPostSection 
              onPostCreated={handlePostCreated}
              isMobile={isMobile}
            />
          </div>
        );
      
      case 'aviDM':
        return (
          <div className={contentClasses}>
            <AviDMSection 
              onMessageSent={handlePostCreated}
              isMobile={isMobile}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-lg border border-gray-200 shadow-sm",
      className
    )}>
      {/* Header with tab navigation */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Content
          </h2>
          {!compactMode && (
            <div className="text-sm text-gray-500">
              {currentTabConfig.shortcut}
            </div>
          )}
        </div>
        
        {renderTabNavigation()}
        
        {!compactMode && !isMobile && (
          <p className="mt-2 text-sm text-gray-600">
            {currentTabConfig.description}
          </p>
        )}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};