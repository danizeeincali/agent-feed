import { useEffect, useState } from 'react';

// Breakpoint definitions (matching Tailwind CSS)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Custom hook for responsive design
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('sm');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else {
        setCurrentBreakpoint('sm');
      }
    };

    // Set initial values
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < breakpoints.md;
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;
  const isLargeDesktop = windowSize.width >= breakpoints.xl;

  const isBreakpoint = (breakpoint: Breakpoint) => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  const isBreakpointOnly = (breakpoint: Breakpoint) => {
    const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];
    const currentIndex = breakpointKeys.indexOf(breakpoint);
    const nextBreakpoint = breakpointKeys[currentIndex + 1];
    
    if (!nextBreakpoint) {
      return windowSize.width >= breakpoints[breakpoint];
    }
    
    return windowSize.width >= breakpoints[breakpoint] && windowSize.width < breakpoints[nextBreakpoint];
  };

  return {
    windowSize,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isBreakpoint,
    isBreakpointOnly
  };
};

// Utility function for responsive grid columns
export const getResponsiveColumns = (
  mobile: number = 1,
  tablet: number = 2,
  desktop: number = 3,
  largeDesktop: number = 4
) => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();

  if (isLargeDesktop) return largeDesktop;
  if (isDesktop) return desktop;
  if (isTablet) return tablet;
  return mobile;
};

// Utility function for responsive spacing
export const getResponsiveSpacing = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return {
    container: isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-8',
    section: isMobile ? 'space-y-4' : isTablet ? 'space-y-6' : 'space-y-8',
    grid: isMobile ? 'gap-4' : isTablet ? 'gap-6' : 'gap-8',
    card: isMobile ? 'p-4' : 'p-6'
  };
};

// Utility for responsive font sizes
export const getResponsiveFontSizes = () => {
  const { isMobile, isTablet } = useResponsive();

  return {
    heading1: isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl',
    heading2: isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl',
    heading3: isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl',
    body: isMobile ? 'text-sm' : 'text-base',
    caption: isMobile ? 'text-xs' : 'text-sm'
  };
};

// Utility for responsive component visibility
export const useComponentVisibility = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return {
    showSidebar: isDesktop,
    showExpandedCards: !isMobile,
    showDetailedMetrics: isDesktop,
    showInlineActions: !isMobile,
    showTooltips: !isMobile,
    maxTableColumns: isMobile ? 3 : isTablet ? 5 : 8,
    cardLayout: isMobile ? 'stacked' : 'side-by-side',
    navigationStyle: isMobile ? 'bottom-bar' : 'sidebar'
  };
};

// Touch and gesture detection
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

// Performance optimization for mobile
export const useMobileOptimization = () => {
  const { isMobile } = useResponsive();
  const isTouchDevice = useTouchDevice();

  return {
    shouldLazyLoad: isMobile,
    shouldReduceAnimations: isMobile,
    shouldShowSimplifiedUI: isMobile,
    shouldUseVirtualization: isMobile,
    touchOptimized: isTouchDevice,
    reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
};

// Responsive table helper
export const useResponsiveTable = () => {
  const { isMobile, isTablet } = useResponsive();

  const getVisibleColumns = (allColumns: string[]) => {
    if (isMobile) {
      return allColumns.slice(0, 2); // Show only first 2 columns on mobile
    }
    if (isTablet) {
      return allColumns.slice(0, 4); // Show first 4 columns on tablet
    }
    return allColumns; // Show all columns on desktop
  };

  const shouldUseCardLayout = isMobile;
  const shouldStackHeaders = isMobile;
  const shouldShowExpandButton = isMobile || isTablet;

  return {
    getVisibleColumns,
    shouldUseCardLayout,
    shouldStackHeaders,
    shouldShowExpandButton
  };
};

// Responsive chart configuration
export const useResponsiveCharts = () => {
  const { isMobile, isTablet, windowSize } = useResponsive();

  const getChartDimensions = () => {
    if (isMobile) {
      return {
        width: windowSize.width - 32, // Account for padding
        height: 200,
        margin: { top: 10, right: 10, bottom: 20, left: 30 }
      };
    }
    
    if (isTablet) {
      return {
        width: windowSize.width * 0.8,
        height: 300,
        margin: { top: 20, right: 20, bottom: 30, left: 50 }
      };
    }

    return {
      width: 600,
      height: 400,
      margin: { top: 20, right: 30, bottom: 40, left: 60 }
    };
  };

  const getChartConfig = () => ({
    showLegend: !isMobile,
    showTooltips: true,
    showGrid: !isMobile,
    showAxis: true,
    fontSize: isMobile ? 10 : 12,
    strokeWidth: isMobile ? 1 : 2,
    pointRadius: isMobile ? 2 : 3
  });

  return {
    getChartDimensions,
    getChartConfig,
    shouldSimplifyChart: isMobile
  };
};

export default {
  useResponsive,
  getResponsiveColumns,
  getResponsiveSpacing,
  getResponsiveFontSizes,
  useComponentVisibility,
  useTouchDevice,
  useMobileOptimization,
  useResponsiveTable,
  useResponsiveCharts
};