var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { j as jsxRuntimeExports } from "./query-COV5TnaN.js";
import { r as reactExports } from "./vendor-DQuZfOBF.js";
import { T as TriangleAlert, ao as Bug, R as RefreshCw, Q as Shield, H as Home, ax as DollarSign, ay as Download, Z as Zap, a4 as TrendingUp, az as TrendingDown, a1 as Activity, f as Clock, a9 as Calendar, al as MessageSquare, a0 as CircleCheckBig, P as Play, aA as Lightbulb, a5 as BarChart3, aB as ArrowRight, a2 as Database, C as CircleAlert, aC as Table, g as FileText, aD as Mail, S as Settings } from "./ui-DauFEKPW.js";
import { c as cn, B as Button, T as Tabs, a as TabsList, b as TabsTrigger, d as TabsContent } from "./index-CcaL-O-5.js";
import "./router-BPJ_TL1z.js";
const AnalyticsContext = reactExports.createContext(void 0);
const defaultState = {
  timeRange: "24h",
  selectedMetrics: ["cost", "tokens", "messages", "steps"],
  refreshInterval: 3e4,
  autoRefresh: true,
  showOptimizations: true,
  budgetAlerts: []
};
const AnalyticsProvider = ({
  children,
  initialState = {},
  enableRealTime = true,
  refreshInterval = 3e4
}) => {
  const [state, setState] = reactExports.useState({
    ...defaultState,
    ...initialState
  });
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [lastUpdate, setLastUpdate] = reactExports.useState(null);
  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };
  const clearError = () => {
    setError(null);
  };
  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      setLastUpdate(/* @__PURE__ */ new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh analytics data");
    } finally {
      setIsLoading(false);
    }
  };
  reactExports.useEffect(() => {
    if (!state.autoRefresh || !enableRealTime) return;
    const interval = setInterval(() => {
      refreshData();
    }, state.refreshInterval);
    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, enableRealTime]);
  reactExports.useEffect(() => {
    refreshData();
  }, []);
  const contextValue = {
    state,
    updateState,
    isLoading,
    error,
    clearError,
    refreshData,
    lastUpdate
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsContext.Provider, { value: contextValue, children });
};
class AnalyticsErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    __publicField(this, "maxRetries", 3);
    __publicField(this, "retryDelay", 1e3);
    __publicField(this, "handleRetry", () => {
      const { retryCount, lastErrorTime } = this.state;
      const now = Date.now();
      const resetRetryCount = now - lastErrorTime > 6e4;
      if (resetRetryCount || retryCount < this.maxRetries) {
        this.setState({
          nldTriggered: false,
          recoveryAttempted: false,
          fallbackMode: false
        });
        setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: resetRetryCount ? 1 : retryCount + 1,
            lastErrorTime: now
          });
        }, this.retryDelay);
      }
    });
    __publicField(this, "handleFallbackMode", () => {
      var _a;
      this.setState({ fallbackMode: true });
      const event = new CustomEvent("analytics-graceful-degradation", {
        detail: {
          source: "error-boundary",
          errorType: (_a = this.state.error) == null ? void 0 : _a.name,
          fallbackMode: "minimal"
        }
      });
      window.dispatchEvent(event);
    });
    __publicField(this, "canRetry", () => {
      const { retryCount, lastErrorTime } = this.state;
      const now = Date.now();
      return now - lastErrorTime > 6e4 || retryCount < this.maxRetries;
    });
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      fallbackMode: false
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error("Analytics Error Boundary caught an error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-8 max-w-md mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-16 h-16 text-red-500 mx-auto mb-4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-2", children: "Analytics Component Error" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mb-6", children: "There was an error loading the analytics dashboard. This might be due to a temporary issue." }),
        this.props.showDetails && this.state.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold text-red-800 mb-2 flex items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bug, { className: "w-4 h-4 mr-2" }),
            "Error Details"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-700 font-mono break-all", children: this.state.error.message }),
          this.state.errorInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "text-sm font-medium text-red-800 cursor-pointer", children: "Component Stack" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-xs text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32", children: this.state.errorInfo.componentStack })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          this.canRetry() && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: this.handleRetry,
              className: "inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
                "Try Again",
                this.state.retryCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs opacity-75 ml-2", children: [
                  "(",
                  this.state.retryCount,
                  "/",
                  this.maxRetries,
                  ")"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: this.handleFallbackMode,
              className: "inline-flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4 mr-2" }),
                "Safe Mode"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => window.location.href = "/",
              className: "inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Home, { className: "w-4 h-4 mr-2" }),
                "Go to Dashboard"
              ]
            }
          ) })
        ] }),
        !this.canRetry() && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 mt-4", children: "Maximum retry attempts reached. Please refresh the page or contact support." }),
        this.props.showDetails && this.state.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-6 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "text-sm text-gray-500 cursor-pointer hover:text-gray-700", children: [
            "Error Details ",
            false
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 p-3 bg-red-50 rounded border text-xs text-red-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold mb-2", children: "Error:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: this.state.error.toString() }),
            this.state.errorInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold mb-2", children: "Component Stack:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap text-xs", children: this.state.errorInfo.componentStack })
            ] })
          ] })
        ] })
      ] }) });
    }
    return this.props.children;
  }
  componentWillUnmount() {
  }
}
const LineChart = ({
  data,
  config,
  height = 300,
  showTrend = false,
  gradient = false,
  className
}) => {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: config.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center justify-center text-gray-500",
          style: { height: `${height}px` },
          children: "No data available"
        }
      )
    ] });
  }
  const maxValue = Math.max(...data.map((point) => point.value));
  const minValue = Math.min(...data.map((point) => point.value));
  const range = maxValue - minValue;
  const padding = 40;
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  const createPath = (points) => {
    if (points.length === 0) return "";
    const pathPoints = points.map((point, index) => {
      const x = padding + index / (points.length - 1) * chartWidth;
      const y = padding + (maxValue - point.value) / range * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    });
    return pathPoints.join(" ");
  };
  const createGradientPath = (points) => {
    if (points.length === 0) return "";
    const linePath = createPath(points);
    points[points.length - 1];
    const lastX = padding + (points.length - 1) / (points.length - 1) * chartWidth;
    const bottomY = padding + chartHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${padding} ${bottomY} Z`;
  };
  const path = createPath(data);
  const gradientPath = gradient ? createGradientPath(data) : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: config.title }),
      showTrend && data.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: data[data.length - 1].value > data[0].value ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-600", children: "↗ Trending up" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-600", children: "↘ Trending down" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "100%", height, viewBox: `0 0 ${svgWidth} ${svgHeight}`, className: "overflow-visible", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: gradient && /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "lineGradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: config.colors[0], stopOpacity: "0.3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: config.colors[0], stopOpacity: "0.05" })
      ] }) }),
      config.showGrid && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + ratio * chartHeight;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "line",
            {
              x1: padding,
              y1: y,
              x2: padding + chartWidth,
              y2: y,
              stroke: "#e5e7eb",
              strokeWidth: "1"
            },
            `h-grid-${index}`
          );
        }),
        data.map((_, index) => {
          if (index % Math.ceil(data.length / 5) === 0) {
            const x = padding + index / (data.length - 1) * chartWidth;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "line",
              {
                x1: x,
                y1: padding,
                x2: x,
                y2: padding + chartHeight,
                stroke: "#e5e7eb",
                strokeWidth: "1"
              },
              `v-grid-${index}`
            );
          }
          return null;
        })
      ] }),
      gradient && gradientPath && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: gradientPath,
          fill: "url(#lineGradient)",
          stroke: "none"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: path,
          fill: "none",
          stroke: config.colors[0],
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      ),
      data.map((point, index) => {
        const x = padding + index / (data.length - 1) * chartWidth;
        const y = padding + (maxValue - point.value) / range * chartHeight;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "circle",
          {
            cx: x,
            cy: y,
            r: "4",
            fill: config.colors[0],
            stroke: "white",
            strokeWidth: "2",
            className: "cursor-pointer",
            "data-tooltip": `${point.label || ""}: ${point.value}`
          },
          index
        );
      }),
      [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
        const y = padding + ratio * chartHeight;
        const value = maxValue - ratio * range;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "text",
          {
            x: padding - 10,
            y: y + 4,
            textAnchor: "end",
            className: "text-xs fill-gray-500",
            children: typeof value === "number" ? value.toFixed(0) : value
          },
          `y-label-${index}`
        );
      }),
      data.map((point, index) => {
        if (index % Math.ceil(data.length / 5) === 0) {
          const x = padding + index / (data.length - 1) * chartWidth;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x,
              y: padding + chartHeight + 20,
              textAnchor: "middle",
              className: "text-xs fill-gray-500",
              children: point.label || new Date(point.timestamp).toLocaleTimeString()
            },
            `x-label-${index}`
          );
        }
        return null;
      })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex justify-between items-end", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: config.xAxis }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500 transform -rotate-90 origin-center", children: config.yAxis })
    ] })
  ] });
};
const BarChart = ({
  data,
  config,
  height = 300,
  showValues = false,
  horizontal = false,
  className
}) => {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: config.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center justify-center text-gray-500",
          style: { height: `${height}px` },
          children: "No data available"
        }
      )
    ] });
  }
  const maxValue = Math.max(...data.map((point) => point.value));
  const padding = 40;
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  const barWidth = horizontal ? chartHeight / data.length * 0.8 : chartWidth / data.length * 0.8;
  const barSpacing = horizontal ? chartHeight / data.length * 0.2 : chartWidth / data.length * 0.2;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: config.title }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "100%", height, viewBox: `0 0 ${svgWidth} ${svgHeight}`, className: "overflow-visible", children: [
      config.showGrid && /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: horizontal ? (
        // Vertical grid lines for horizontal bars
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const x = padding + ratio * chartWidth;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "line",
            {
              x1: x,
              y1: padding,
              x2: x,
              y2: padding + chartHeight,
              stroke: "#e5e7eb",
              strokeWidth: "1"
            },
            `grid-${index}`
          );
        })
      ) : (
        // Horizontal grid lines for vertical bars
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + ratio * chartHeight;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "line",
            {
              x1: padding,
              y1: y,
              x2: padding + chartWidth,
              y2: y,
              stroke: "#e5e7eb",
              strokeWidth: "1"
            },
            `grid-${index}`
          );
        })
      ) }),
      data.map((point, index) => {
        const colorIndex = index % config.colors.length;
        const color = config.colors[colorIndex];
        if (horizontal) {
          const barHeight = barWidth;
          const barLength = point.value / maxValue * chartWidth;
          const x = padding;
          const y = padding + index * (barHeight + barSpacing);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "rect",
              {
                x,
                y,
                width: barLength,
                height: barHeight,
                fill: color,
                className: "cursor-pointer transition-opacity hover:opacity-80",
                "data-tooltip": `${point.label || ""}: ${point.value}`
              }
            ),
            showValues && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "text",
              {
                x: x + barLength + 5,
                y: y + barHeight / 2 + 4,
                className: "text-xs fill-gray-700",
                textAnchor: "start",
                children: point.value
              }
            )
          ] }, index);
        } else {
          const barHeightValue = point.value / maxValue * chartHeight;
          const x = padding + index * (barWidth + barSpacing);
          const y = padding + chartHeight - barHeightValue;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "rect",
              {
                x,
                y,
                width: barWidth,
                height: barHeightValue,
                fill: color,
                className: "cursor-pointer transition-opacity hover:opacity-80",
                "data-tooltip": `${point.label || ""}: ${point.value}`
              }
            ),
            showValues && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "text",
              {
                x: x + barWidth / 2,
                y: y - 5,
                className: "text-xs fill-gray-700",
                textAnchor: "middle",
                children: point.value
              }
            )
          ] }, index);
        }
      }),
      horizontal ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        data.map((point, index) => {
          const y = padding + index * (barWidth + barSpacing) + barWidth / 2;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: padding - 10,
              y: y + 4,
              textAnchor: "end",
              className: "text-xs fill-gray-500",
              children: point.label || `Item ${index + 1}`
            },
            `y-label-${index}`
          );
        }),
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const x = padding + ratio * chartWidth;
          const value = maxValue * ratio;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x,
              y: padding + chartHeight + 20,
              textAnchor: "middle",
              className: "text-xs fill-gray-500",
              children: value.toFixed(0)
            },
            `x-label-${index}`
          );
        })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        data.map((point, index) => {
          const x = padding + index * (barWidth + barSpacing) + barWidth / 2;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x,
              y: padding + chartHeight + 20,
              textAnchor: "middle",
              className: "text-xs fill-gray-500",
              children: point.label || `Item ${index + 1}`
            },
            `x-label-${index}`
          );
        }),
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + ratio * chartHeight;
          const value = maxValue - maxValue * ratio;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: padding - 10,
              y: y + 4,
              textAnchor: "end",
              className: "text-xs fill-gray-500",
              children: value.toFixed(0)
            },
            `y-label-${index}`
          );
        })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex justify-between items-end", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: config.xAxis }),
      !horizontal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500 transform -rotate-90 origin-center", children: config.yAxis })
    ] }),
    config.showLegend && data.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: data.map((point, index) => {
      const colorIndex = index % config.colors.length;
      const color = config.colors[colorIndex];
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "w-3 h-3 rounded",
            style: { backgroundColor: color }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-gray-600", children: point.label || `Series ${index + 1}` })
      ] }, index);
    }) })
  ] });
};
const PieChart = ({
  data,
  config,
  height = 300,
  donut = false,
  showTotal = false,
  className
}) => {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: config.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex items-center justify-center text-gray-500",
          style: { height: `${height}px` },
          children: "No data available"
        }
      )
    ] });
  }
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const centerX = 300;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 40;
  const innerRadius = donut ? radius * 0.5 : 0;
  let currentAngle = -90;
  const slices = data.map((point, index) => {
    const percentage = point.value / total * 100;
    const angleSlice = point.value / total * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSlice;
    currentAngle = endAngle;
    const colorIndex = index % config.colors.length;
    const color = config.colors[colorIndex];
    return {
      ...point,
      startAngle,
      endAngle,
      percentage,
      color
    };
  });
  const createArcPath = (startAngle, endAngle, outerRadius, innerRadius2 = 0) => {
    const startAngleRad = startAngle * Math.PI / 180;
    const endAngleRad = endAngle * Math.PI / 180;
    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    if (innerRadius2 === 0) {
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    } else {
      const x3 = centerX + innerRadius2 * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius2 * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius2 * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius2 * Math.sin(startAngleRad);
      return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius2} ${innerRadius2} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }
  };
  const getLabelPosition = (startAngle, endAngle, radius2) => {
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = midAngle * Math.PI / 180;
    const labelRadius = radius2 * 0.7;
    return {
      x: centerX + labelRadius * Math.cos(midAngleRad),
      y: centerY + labelRadius * Math.sin(midAngleRad)
    };
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("bg-white rounded-lg border border-gray-200 p-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: config.title }),
      showTotal && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-gray-900", children: total.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "Total" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: centerX * 2, height, className: "overflow-visible", children: [
      slices.map((slice, index) => {
        const path = createArcPath(slice.startAngle, slice.endAngle, radius, innerRadius);
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: path,
            fill: slice.color,
            stroke: "white",
            strokeWidth: "2",
            className: "cursor-pointer transition-opacity hover:opacity-80",
            "data-tooltip": `${slice.label || ""}: ${slice.value} (${slice.percentage.toFixed(1)}%)`
          },
          index
        );
      }),
      slices.map((slice, index) => {
        if (slice.percentage < 5) return null;
        const labelPos = getLabelPosition(slice.startAngle, slice.endAngle, radius);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "text",
          {
            x: labelPos.x,
            y: labelPos.y,
            textAnchor: "middle",
            dominantBaseline: "middle",
            className: "text-xs fill-white font-medium",
            style: { textShadow: "1px 1px 2px rgba(0,0,0,0.8)" },
            children: [
              slice.percentage.toFixed(0),
              "%"
            ]
          },
          `label-${index}`
        );
      }),
      donut && showTotal && /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "text",
          {
            x: centerX,
            y: centerY - 5,
            textAnchor: "middle",
            className: "text-lg font-bold fill-gray-900",
            children: total.toLocaleString()
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "text",
          {
            x: centerX,
            y: centerY + 15,
            textAnchor: "middle",
            className: "text-sm fill-gray-500",
            children: "Total"
          }
        )
      ] })
    ] }) }) }),
    config.showLegend && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: slices.map((slice, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-2 rounded-lg hover:bg-gray-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "w-4 h-4 rounded-full flex-shrink-0",
            style: { backgroundColor: slice.color }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-700 truncate", children: slice.label || `Series ${index + 1}` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-900", children: slice.value.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-500", children: [
          slice.percentage.toFixed(1),
          "%"
        ] })
      ] })
    ] }, index)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 pt-4 border-t border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold text-gray-900", children: data.length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: "Categories" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold text-gray-900", children: Math.max(...data.map((d) => d.value)).toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: "Largest" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold text-gray-900", children: Math.round(total / data.length).toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: "Average" })
      ] })
    ] }) })
  ] });
};
const CostOverviewDashboard = ({
  className,
  onTimeRangeChange,
  onExport,
  realTimeUpdates = true
}) => {
  const [state, setState] = reactExports.useState({
    timeRange: "24h",
    selectedMetrics: ["cost", "tokens", "requests"],
    refreshInterval: 3e4,
    autoRefresh: true,
    showOptimizations: true,
    budgetAlerts: []
  });
  const [loading, setLoading] = reactExports.useState(false);
  const [lastUpdated, setLastUpdated] = reactExports.useState(/* @__PURE__ */ new Date());
  const [costMetrics] = reactExports.useState({
    totalCost: 156.78,
    dailyCost: 12.45,
    weeklyCost: 87.32,
    monthlyCost: 345.67,
    costTrend: "increasing",
    averageCostPerRequest: 0.023,
    lastUpdated: /* @__PURE__ */ new Date()
  });
  const [tokenMetrics] = reactExports.useState({
    totalTokens: 2847392,
    inputTokens: 1698234,
    outputTokens: 1149158,
    tokensPerHour: 12453,
    tokensPerDay: 298872,
    averageTokensPerRequest: 1247,
    tokenEfficiency: 0.87
  });
  const [serviceTiers] = reactExports.useState([
    { tier: "basic", requestCount: 1247, tokenUsage: 847392, cost: 45.67, percentage: 29.1, responseTime: 234 },
    { tier: "premium", requestCount: 856, tokenUsage: 1294857, cost: 78.45, percentage: 50, responseTime: 156 },
    { tier: "enterprise", requestCount: 423, tokenUsage: 705143, cost: 32.66, percentage: 20.9, responseTime: 89 }
  ]);
  const [budgetAlerts] = reactExports.useState([
    {
      id: "1",
      type: "warning",
      message: "Daily budget at 78% - $7.80 of $10.00 used",
      threshold: 80,
      currentValue: 78,
      timestamp: /* @__PURE__ */ new Date()
    }
  ]);
  const generateCostTrendData = () => {
    const data = [];
    const now = /* @__PURE__ */ new Date();
    const hours = state.timeRange === "1h" ? 1 : state.timeRange === "24h" ? 24 : 168;
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1e3);
      const baseValue = 0.5 + Math.random() * 2;
      const trend = Math.sin(i / 10) * 0.3;
      data.push({
        timestamp: timestamp.toISOString(),
        value: baseValue + trend,
        label: timestamp.toLocaleTimeString()
      });
    }
    return data;
  };
  const generateTokenUsageData = () => {
    return serviceTiers.map((tier) => ({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      value: tier.tokenUsage,
      label: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)
    }));
  };
  const generateCostBreakdownData = () => {
    return serviceTiers.map((tier) => ({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      value: tier.cost,
      label: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)
    }));
  };
  const dashboardCards = [
    {
      id: "total-cost",
      title: "Total Cost",
      value: `$${costMetrics.totalCost.toFixed(2)}`,
      change: 12.5,
      trend: costMetrics.costTrend === "increasing" ? "up" : "down",
      icon: "dollar-sign",
      color: "blue",
      subtitle: "This month"
    },
    {
      id: "daily-cost",
      title: "Daily Average",
      value: `$${costMetrics.dailyCost.toFixed(2)}`,
      change: -3.2,
      trend: "down",
      icon: "calendar",
      color: "green",
      subtitle: "vs yesterday"
    },
    {
      id: "total-tokens",
      title: "Total Tokens",
      value: tokenMetrics.totalTokens.toLocaleString(),
      change: 8.7,
      trend: "up",
      icon: "zap",
      color: "purple",
      subtitle: "This month"
    },
    {
      id: "avg-cost-per-token",
      title: "Avg Cost/Token",
      value: `$${costMetrics.averageCostPerRequest.toFixed(6)}`,
      change: 0,
      trend: "stable",
      icon: "activity",
      color: "orange",
      subtitle: "Per request"
    }
  ];
  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    setLastUpdated(/* @__PURE__ */ new Date());
    setLoading(false);
  };
  const handleTimeRangeChange = (range) => {
    setState((prev) => ({ ...prev, timeRange: range }));
    onTimeRangeChange == null ? void 0 : onTimeRangeChange(range);
  };
  const getIconComponent = (iconName) => {
    const icons = {
      "dollar-sign": DollarSign,
      "calendar": Calendar,
      "zap": Zap,
      "activity": Activity,
      "clock": Clock
    };
    return icons[iconName] || DollarSign;
  };
  reactExports.useEffect(() => {
    if (!state.autoRefresh || !realTimeUpdates) return;
    const interval = setInterval(handleRefresh, state.refreshInterval);
    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, realTimeUpdates]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-bold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-8 h-8 mr-3 text-blue-600" }),
          "Cost Analytics Dashboard"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mt-1", children: "Real-time Claude Code SDK cost tracking and analysis" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
            "w-2 h-2 rounded-full",
            realTimeUpdates ? "bg-green-500" : "bg-gray-400"
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-gray-500", children: [
            realTimeUpdates ? "Live updates" : "Static data",
            " • Last updated: ",
            lastUpdated.toLocaleTimeString()
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 lg:mt-0 flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex bg-gray-100 rounded-lg p-1", children: ["1h", "24h", "7d", "30d"].map((range) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => handleTimeRangeChange(range),
            className: cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              state.timeRange === range ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            ),
            children: range
          },
          range
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: onExport,
            className: "flex items-center space-x-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Export" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleRefresh,
            disabled: loading,
            className: "flex items-center space-x-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("w-4 h-4", loading && "animate-spin") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Refresh" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: () => setState((prev) => ({ ...prev, autoRefresh: !prev.autoRefresh })),
            className: cn(
              "flex items-center space-x-2",
              state.autoRefresh ? "text-green-600" : "text-gray-600"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Auto-refresh" })
            ]
          }
        )
      ] })
    ] }),
    budgetAlerts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: budgetAlerts.map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "p-4 rounded-lg border flex items-center space-x-3",
          alert.type === "warning" && "bg-yellow-50 border-yellow-200 text-yellow-800",
          alert.type === "critical" && "bg-orange-50 border-orange-200 text-orange-800",
          alert.type === "exceeded" && "bg-red-50 border-red-200 text-red-800"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 flex-shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: alert.message }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm opacity-75", children: [
              "Alert triggered at ",
              alert.currentValue,
              "% of threshold"
            ] })
          ] })
        ]
      },
      alert.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: dashboardCards.map((card) => {
      const Icon = getIconComponent(card.icon);
      const TrendIcon = card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : Activity;
      const trendColor = card.trend === "up" ? "text-red-500" : card.trend === "down" ? "text-green-500" : "text-gray-500";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-3 rounded-lg bg-${card.color}-100 text-${card.color}-600`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-6 h-6" }) }),
          card.change !== 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendIcon, { className: cn("w-4 h-4", trendColor) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("text-sm font-medium", trendColor), children: [
              card.change > 0 ? "+" : "",
              card.change,
              "%"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: card.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-gray-900", children: card.value }),
          card.subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500", children: card.subtitle })
        ] })
      ] }, card.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          data: generateCostTrendData(),
          config: {
            type: "line",
            title: "Cost Trend Over Time",
            xAxis: "Time",
            yAxis: "Cost ($)",
            colors: ["#3b82f6"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showTrend: true,
          gradient: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        BarChart,
        {
          data: generateTokenUsageData(),
          config: {
            type: "bar",
            title: "Token Usage by Service Tier",
            xAxis: "Service Tier",
            yAxis: "Tokens",
            colors: ["#3b82f6", "#10b981", "#f59e0b"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showValues: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PieChart,
        {
          data: generateCostBreakdownData(),
          config: {
            type: "pie",
            title: "Cost Breakdown by Tier",
            xAxis: "",
            yAxis: "",
            colors: ["#3b82f6", "#10b981", "#f59e0b"],
            showGrid: false,
            showLegend: true
          },
          height: 300,
          donut: true,
          showTotal: true
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Service Tier Performance" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tier" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Requests" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tokens" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cost" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Avg Response" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: serviceTiers.map((tier) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-gray-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize", children: tier.tier }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: tier.requestCount.toLocaleString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: tier.tokenUsage.toLocaleString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: [
              "$",
              tier.cost.toFixed(2)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: [
              tier.responseTime,
              "ms"
            ] })
          ] }, tier.tier)) })
        ] }) })
      ] })
    ] })
  ] });
};
const MessageStepAnalytics = ({
  className,
  timeRange = "24h",
  realTimeUpdates = true
}) => {
  const [selectedView, setSelectedView] = reactExports.useState("combined");
  const [lastUpdated, setLastUpdated] = reactExports.useState(/* @__PURE__ */ new Date());
  const [messageAnalytics] = reactExports.useState({
    totalMessages: 1247,
    successfulMessages: 1198,
    failedMessages: 49,
    averageResponseTime: 1234,
    messageTypes: {
      "text-generation": 567,
      "code-analysis": 234,
      "data-processing": 189,
      "image-generation": 123,
      "document-parsing": 89,
      "other": 45
    },
    errorRate: 0.039
  });
  const [stepAnalytics] = reactExports.useState({
    totalSteps: 3456,
    completedSteps: 3298,
    failedSteps: 158,
    averageStepDuration: 2340,
    stepTypes: {
      "prompt-generation": 1234,
      "api-call": 987,
      "response-parsing": 654,
      "data-validation": 321,
      "error-handling": 158,
      "caching": 102
    },
    stepSuccessRate: 0.954
  });
  const generateMessageTrendData = () => {
    const data = [];
    const now = /* @__PURE__ */ new Date();
    const hours = timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : 168;
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1e3);
      const baseValue = 45 + Math.random() * 30;
      const trend = Math.sin(i / 10) * 5;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + trend),
        label: timestamp.toLocaleTimeString()
      });
    }
    return data;
  };
  const generateStepTrendData = () => {
    const data = [];
    const now = /* @__PURE__ */ new Date();
    const hours = timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : 168;
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1e3);
      const baseValue = 120 + Math.random() * 80;
      const trend = Math.cos(i / 12) * 10;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + trend),
        label: timestamp.toLocaleTimeString()
      });
    }
    return data;
  };
  const generateResponseTimeData = () => {
    const data = [];
    const now = /* @__PURE__ */ new Date();
    const hours = timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : 168;
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1e3);
      const baseValue = 1200 + Math.random() * 600;
      const spike = Math.random() > 0.9 ? 1e3 : 0;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + spike),
        label: timestamp.toLocaleTimeString()
      });
    }
    return data;
  };
  const messageTypeData = Object.entries(messageAnalytics.messageTypes).map(([type, count]) => ({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    value: count,
    label: type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }));
  const stepTypeData = Object.entries(stepAnalytics.stepTypes).map(([type, count]) => ({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    value: count,
    label: type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }));
  const successRate = messageAnalytics.successfulMessages / messageAnalytics.totalMessages * 100;
  const stepSuccessRate = stepAnalytics.stepSuccessRate * 100;
  const errorRate = messageAnalytics.errorRate * 100;
  reactExports.useEffect(() => {
    if (!realTimeUpdates) return;
    const interval = setInterval(() => {
      setLastUpdated(/* @__PURE__ */ new Date());
    }, 3e4);
    return () => clearInterval(interval);
  }, [realTimeUpdates]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "w-7 h-7 mr-3 text-blue-600" }),
          "Message & Step Analytics"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mt-1", children: "Detailed analysis of message processing and step execution" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
            "w-2 h-2 rounded-full",
            realTimeUpdates ? "bg-green-500" : "bg-gray-400"
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-gray-500", children: [
            "Last updated: ",
            lastUpdated.toLocaleTimeString()
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 lg:mt-0 flex bg-gray-100 rounded-lg p-1", children: [{ value: "messages", label: "Messages" }, { value: "steps", label: "Steps" }, { value: "combined", label: "Combined" }].map((view) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setSelectedView(view.value),
          className: cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            selectedView === view.value ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
          ),
          children: view.label
        },
        view.value
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-blue-100 text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "w-4 h-4 text-green-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Messages" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-gray-900", children: messageAnalytics.totalMessages.toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-green-600", children: "+12.5% vs yesterday" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-green-100 text-green-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-400" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Success Rate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-gray-900", children: [
            successRate.toFixed(1),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "bg-green-500 h-2 rounded-full",
              style: { width: `${successRate}%` }
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-yellow-100 text-yellow-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { className: "w-4 h-4 text-green-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Avg Response Time" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-gray-900", children: [
            messageAnalytics.averageResponseTime,
            "ms"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-green-600", children: "-8.2% improvement" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
            "p-3 rounded-lg",
            errorRate < 1 ? "bg-green-100 text-green-600" : errorRate < 5 ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"
          ), children: errorRate < 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center space-x-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "Target: <1%" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Error Rate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-gray-900", children: [
            errorRate.toFixed(2),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-600", children: [
            messageAnalytics.failedMessages,
            " failed messages"
          ] })
        ] })
      ] })
    ] }),
    (selectedView === "steps" || selectedView === "combined") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-purple-100 text-purple-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "w-4 h-4 text-green-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Steps" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-gray-900", children: stepAnalytics.totalSteps.toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-green-600", children: "+18.3% vs yesterday" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-green-100 text-green-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-400" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Step Success Rate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-gray-900", children: [
            stepSuccessRate.toFixed(1),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "bg-green-500 h-2 rounded-full",
              style: { width: `${stepSuccessRate}%` }
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-orange-100 text-orange-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { className: "w-4 h-4 text-green-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Avg Step Duration" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-gray-900", children: [
            stepAnalytics.averageStepDuration,
            "ms"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-green-600", children: "-12.1% improvement" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      (selectedView === "messages" || selectedView === "combined") && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          data: generateMessageTrendData(),
          config: {
            type: "line",
            title: "Message Volume Over Time",
            xAxis: "Time",
            yAxis: "Messages",
            colors: ["#3b82f6"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showTrend: true,
          gradient: true
        }
      ),
      (selectedView === "steps" || selectedView === "combined") && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          data: generateStepTrendData(),
          config: {
            type: "line",
            title: "Step Execution Over Time",
            xAxis: "Time",
            yAxis: "Steps",
            colors: ["#8b5cf6"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showTrend: true,
          gradient: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          data: generateResponseTimeData(),
          config: {
            type: "line",
            title: "Response Time Trends",
            xAxis: "Time",
            yAxis: "Response Time (ms)",
            colors: ["#f59e0b"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showTrend: true
        }
      ),
      selectedView === "combined" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Performance Summary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-gray-600", children: "Messages/Steps Ratio" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-bold text-gray-900", children: [
              "1:",
              (stepAnalytics.totalSteps / messageAnalytics.totalMessages).toFixed(1)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-gray-600", children: "Avg Steps per Message" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-gray-900", children: (stepAnalytics.totalSteps / messageAnalytics.totalMessages).toFixed(1) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-gray-600", children: "Overall Efficiency" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-bold text-green-600", children: [
              ((successRate + stepSuccessRate) / 2).toFixed(1),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-gray-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600 mb-2", children: "System Health" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: cn(
                  "h-3 rounded-full",
                  (successRate + stepSuccessRate) / 2 > 95 ? "bg-green-500" : (successRate + stepSuccessRate) / 2 > 85 ? "bg-yellow-500" : "bg-red-500"
                ),
                style: { width: `${(successRate + stepSuccessRate) / 2}%` }
              }
            ) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      (selectedView === "messages" || selectedView === "combined") && /* @__PURE__ */ jsxRuntimeExports.jsx(
        PieChart,
        {
          data: messageTypeData,
          config: {
            type: "pie",
            title: "Message Types Distribution",
            xAxis: "",
            yAxis: "",
            colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"],
            showGrid: false,
            showLegend: true
          },
          height: 300,
          donut: true,
          showTotal: true
        }
      ),
      (selectedView === "steps" || selectedView === "combined") && /* @__PURE__ */ jsxRuntimeExports.jsx(
        BarChart,
        {
          data: stepTypeData,
          config: {
            type: "bar",
            title: "Step Types Execution Count",
            xAxis: "Step Type",
            yAxis: "Count",
            colors: ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#6b7280"],
            showGrid: true,
            showLegend: false
          },
          height: 300,
          showValues: true
        }
      )
    ] })
  ] });
};
const OptimizationRecommendations = ({
  className,
  onImplement
}) => {
  const [selectedCategory, setSelectedCategory] = reactExports.useState("all");
  const recommendations = [
    {
      id: "1",
      title: "Implement Token Caching",
      description: "Cache frequently used prompts and responses to reduce redundant API calls by up to 40%.",
      potentialSavings: 62.34,
      implementation: "medium",
      priority: "high",
      category: "caching"
    },
    {
      id: "2",
      title: "Optimize Prompt Length",
      description: "Review and shorten prompts without losing functionality. Current avg: 1,247 tokens.",
      potentialSavings: 28.9,
      implementation: "easy",
      priority: "medium",
      category: "tokens"
    },
    {
      id: "3",
      title: "Batch Similar Requests",
      description: "Group similar requests together to reduce overhead and improve efficiency.",
      potentialSavings: 45.12,
      implementation: "hard",
      priority: "high",
      category: "requests"
    },
    {
      id: "4",
      title: "Implement Request Throttling",
      description: "Add intelligent rate limiting to prevent unnecessary rapid-fire requests.",
      potentialSavings: 34.78,
      implementation: "medium",
      priority: "medium",
      category: "timing"
    },
    {
      id: "5",
      title: "Use Lower-Cost Models",
      description: "Switch to more cost-effective models for simple tasks that don't require premium features.",
      potentialSavings: 89.45,
      implementation: "easy",
      priority: "high",
      category: "requests"
    },
    {
      id: "6",
      title: "Optimize Response Parsing",
      description: "Reduce token usage by requesting more structured, concise responses.",
      potentialSavings: 23.67,
      implementation: "easy",
      priority: "low",
      category: "tokens"
    }
  ];
  const categories = [
    { value: "all", label: "All Categories", icon: BarChart3 },
    { value: "tokens", label: "Token Optimization", icon: Zap },
    { value: "requests", label: "Request Efficiency", icon: ArrowRight },
    { value: "timing", label: "Timing & Rate Limiting", icon: Clock },
    { value: "caching", label: "Caching & Storage", icon: Database }
  ];
  const filteredRecommendations = selectedCategory === "all" ? recommendations : recommendations.filter((rec) => rec.category === selectedCategory);
  const totalPotentialSavings = filteredRecommendations.reduce(
    (sum, rec) => sum + rec.potentialSavings,
    0
  );
  const getImplementationColor = (implementation) => {
    switch (implementation) {
      case "easy":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "hard":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };
  const getCategoryIcon = (category) => {
    const categoryData = categories.find((cat) => cat.value === category);
    return categoryData ? categoryData.icon : BarChart3;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { className: "w-7 h-7 mr-3 text-yellow-500" }),
          "Cost Optimization Recommendations"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mt-1", children: "AI-powered suggestions to reduce costs and improve efficiency" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 lg:mt-0 bg-blue-50 border border-blue-200 rounded-lg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-blue-600", children: [
          "$",
          totalPotentialSavings.toFixed(2)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-blue-600", children: "Potential Monthly Savings" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: categories.map((category) => {
      const Icon = category.icon;
      const isSelected = selectedCategory === category.value;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setSelectedCategory(category.value),
          className: cn(
            "flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors",
            isSelected ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: category.label }),
            category.value !== "all" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs", children: recommendations.filter((rec) => rec.category === category.value).length })
          ]
        },
        category.value
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: filteredRecommendations.map((recommendation) => {
      const CategoryIcon = getCategoryIcon(recommendation.category);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-blue-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryIcon, { className: "w-5 h-5 text-blue-600" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: recommendation.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getPriorityColor(recommendation.priority)
                    ), children: [
                      recommendation.priority,
                      " priority"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getImplementationColor(recommendation.implementation)
                    ), children: [
                      recommendation.implementation,
                      " to implement"
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-bold text-green-600", children: [
                  "$",
                  recommendation.potentialSavings.toFixed(2)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "monthly savings" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mb-4", children: recommendation.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 rounded-lg p-4 mb-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-4 h-4 text-green-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-gray-900", children: "Expected Benefits" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "text-sm text-gray-600 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  "• Reduce monthly costs by $",
                  recommendation.potentialSavings.toFixed(2)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Improve system efficiency and response times" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Better resource utilization" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-500", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "Implementation: ",
                  recommendation.implementation
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  onClick: () => onImplement == null ? void 0 : onImplement(recommendation),
                  className: "flex items-center space-x-2",
                  size: "sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Implement" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4" })
                  ]
                }
              )
            ] })
          ]
        },
        recommendation.id
      );
    }) }),
    filteredRecommendations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl font-bold text-blue-600", children: filteredRecommendations.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "Active Recommendations" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-bold text-green-600", children: [
            "$",
            totalPotentialSavings.toFixed(0)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "Total Potential Savings" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-bold text-yellow-600", children: [
            Math.round(totalPotentialSavings / 156.78 * 100),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "Cost Reduction Potential" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          onClick: () => filteredRecommendations.forEach(onImplement),
          className: "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { className: "w-4 h-4 mr-2" }),
            "Implement All High Priority"
          ]
        }
      ) })
    ] }),
    filteredRecommendations.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No recommendations available" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "No optimization opportunities found for the selected category." })
    ] })
  ] });
};
const ExportReportingFeatures = ({
  className,
  onExport,
  data
}) => {
  const [selectedFormat, setSelectedFormat] = reactExports.useState("csv");
  const [selectedTimeRange, setSelectedTimeRange] = reactExports.useState("30d");
  const [includeCharts, setIncludeCharts] = reactExports.useState(true);
  const [includeRecommendations, setIncludeRecommendations] = reactExports.useState(true);
  const [isExporting, setIsExporting] = reactExports.useState(false);
  const [showScheduleModal, setShowScheduleModal] = reactExports.useState(false);
  const exportFormats = [
    {
      id: "csv",
      name: "CSV",
      description: "Comma-separated values for spreadsheet analysis",
      icon: Table,
      fileExtension: "csv",
      mimeType: "text/csv"
    },
    {
      id: "json",
      name: "JSON",
      description: "Machine-readable data format for API integration",
      icon: FileText,
      fileExtension: "json",
      mimeType: "application/json"
    },
    {
      id: "pdf",
      name: "PDF Report",
      description: "Professional report with charts and analysis",
      icon: FileText,
      fileExtension: "pdf",
      mimeType: "application/pdf"
    },
    {
      id: "excel",
      name: "Excel",
      description: "Formatted spreadsheet with multiple sheets",
      icon: BarChart3,
      fileExtension: "xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  ];
  const [scheduledReports] = reactExports.useState([
    {
      id: "1",
      name: "Weekly Cost Summary",
      format: "pdf",
      frequency: "weekly",
      recipients: ["admin@company.com", "finance@company.com"],
      lastSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3),
      nextSend: new Date(Date.now() + 0 * 24 * 60 * 60 * 1e3),
      status: "active"
    },
    {
      id: "2",
      name: "Monthly Analytics Report",
      format: "excel",
      frequency: "monthly",
      recipients: ["ceo@company.com", "cto@company.com"],
      lastSent: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3),
      nextSend: new Date(Date.now() + 5 * 24 * 60 * 60 * 1e3),
      status: "active"
    },
    {
      id: "3",
      name: "Daily Token Usage",
      format: "csv",
      frequency: "daily",
      recipients: ["devops@company.com"],
      lastSent: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3),
      nextSend: new Date(Date.now() + 0 * 24 * 60 * 60 * 1e3),
      status: "paused"
    }
  ]);
  const timeRanges = [
    { value: "1h", label: "Last Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" }
  ];
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      const exportData = {
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3),
          end: /* @__PURE__ */ new Date(),
          granularity: "day"
        },
        costMetrics: {
          totalCost: 156.78,
          dailyCost: 12.45,
          weeklyCost: 87.32,
          monthlyCost: 345.67,
          costTrend: "increasing",
          averageCostPerRequest: 0.023,
          lastUpdated: /* @__PURE__ */ new Date()
        },
        tokenUsage: {
          totalTokens: 2847392,
          inputTokens: 1698234,
          outputTokens: 1149158,
          tokensPerHour: 12453,
          tokensPerDay: 298872,
          averageTokensPerRequest: 1247,
          tokenEfficiency: 0.87
        },
        messageAnalytics: {
          totalMessages: 1247,
          successfulMessages: 1198,
          failedMessages: 49,
          averageResponseTime: 1234,
          messageTypes: { "text": 1e3, "code": 200, "analysis": 47 },
          errorRate: 0.039
        },
        stepAnalytics: {
          totalSteps: 3456,
          completedSteps: 3298,
          failedSteps: 158,
          averageStepDuration: 2340,
          stepTypes: { "generate": 2e3, "analyze": 800, "optimize": 656 },
          stepSuccessRate: 0.954
        },
        serviceTiers: [
          { tier: "basic", requestCount: 1247, tokenUsage: 847392, cost: 45.67, percentage: 29.1, responseTime: 234 },
          { tier: "premium", requestCount: 856, tokenUsage: 1294857, cost: 78.45, percentage: 50, responseTime: 156 },
          { tier: "enterprise", requestCount: 423, tokenUsage: 705143, cost: 32.66, percentage: 20.9, responseTime: 89 }
        ],
        recommendations: [],
        rawData: data
      };
      onExport == null ? void 0 : onExport(selectedFormat, exportData);
      generateDownload(selectedFormat, exportData);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };
  const generateDownload = (format, exportData) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const fileName = `analytics-report-${timestamp}`;
    let content;
    let mimeType;
    let extension;
    switch (format) {
      case "csv":
        content = generateCSV(exportData);
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "json":
        content = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
      case "pdf":
        content = generateTextReport(exportData);
        mimeType = "text/plain";
        extension = "txt";
        break;
      case "excel":
        content = generateCSV(exportData);
        mimeType = "text/csv";
        extension = "csv";
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
        extension = "json";
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const generateCSV = (data2) => {
    const headers = ["Date", "Cost", "Tokens", "Requests", "Success Rate"];
    const rows = [
      headers.join(","),
      `${data2.exportDate},${data2.costMetrics.totalCost},${data2.tokenUsage.totalTokens},${data2.messageAnalytics.totalMessages},${(data2.messageAnalytics.successfulMessages / data2.messageAnalytics.totalMessages * 100).toFixed(2)}%`
    ];
    return rows.join("\n");
  };
  const generateTextReport = (data2) => {
    return `
Claude Code SDK Analytics Report
Generated: ${data2.exportDate}

=== COST METRICS ===
Total Cost: $${data2.costMetrics.totalCost}
Daily Average: $${data2.costMetrics.dailyCost}
Monthly Total: $${data2.costMetrics.monthlyCost}

=== TOKEN USAGE ===
Total Tokens: ${data2.tokenUsage.totalTokens.toLocaleString()}
Input Tokens: ${data2.tokenUsage.inputTokens.toLocaleString()}
Output Tokens: ${data2.tokenUsage.outputTokens.toLocaleString()}

=== MESSAGE ANALYTICS ===
Total Messages: ${data2.messageAnalytics.totalMessages}
Success Rate: ${(data2.messageAnalytics.successfulMessages / data2.messageAnalytics.totalMessages * 100).toFixed(2)}%
Average Response Time: ${data2.messageAnalytics.averageResponseTime}ms

=== SERVICE TIERS ===
${data2.serviceTiers.map(
      (tier) => `${tier.tier.toUpperCase()}: ${tier.requestCount} requests, $${tier.cost.toFixed(2)}`
    ).join("\n")}
`;
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "paused":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return CircleCheckBig;
      case "paused":
        return Clock;
      case "error":
        return CircleAlert;
      default:
        return Clock;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-6", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-gray-900 flex items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-7 h-7 mr-3 text-blue-600" }),
        "Export & Reporting"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mt-1", children: "Generate reports and schedule automated analytics delivery" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Export Data" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Export Format" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: exportFormats.map((format) => {
              const Icon = format.icon;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => setSelectedFormat(format.id),
                  className: cn(
                    "p-4 border rounded-lg text-left transition-colors",
                    selectedFormat === format.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 hover:border-gray-400"
                  ),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-5 h-5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: format.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-500", children: format.description })
                    ] })
                  ] })
                },
                format.id
              );
            }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Time Range" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: selectedTimeRange,
                onChange: (e) => setSelectedTimeRange(e.target.value),
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                children: timeRanges.map((range) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: range.value, children: range.label }, range.value))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: includeCharts,
                  onChange: (e) => setIncludeCharts(e.target.checked),
                  className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-700", children: "Include charts and visualizations" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: includeRecommendations,
                  onChange: (e) => setIncludeRecommendations(e.target.checked),
                  className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-700", children: "Include optimization recommendations" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: handleExport,
              disabled: isExporting,
              className: "w-full flex items-center justify-center space-x-2",
              children: isExporting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Exporting..." })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Export Report" })
              ] })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Scheduled Reports" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              onClick: () => setShowScheduleModal(true),
              className: "flex items-center space-x-2",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Schedule New" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: scheduledReports.map((report) => {
          const StatusIcon = getStatusIcon(report.status);
          return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-gray-900", children: report.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(report.status)
                ), children: report.status })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-1 text-sm text-gray-600", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    report.format.toUpperCase(),
                    " • ",
                    report.frequency
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    report.recipients.length,
                    " recipients"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "Next: ",
                    report.nextSend.toLocaleDateString()
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(StatusIcon, { className: cn(
                "w-5 h-5",
                report.status === "active" ? "text-green-500" : report.status === "paused" ? "text-yellow-500" : "text-red-500"
              ) })
            ] })
          ] }) }, report.id);
        }) }),
        scheduledReports.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-medium text-gray-900 mb-2", children: "No Scheduled Reports" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mb-4", children: "Set up automated reports to stay informed about your costs and usage." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setShowScheduleModal(true), children: "Create First Report" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 rounded-lg p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Quick Export Actions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "flex items-center justify-center space-x-2",
            onClick: () => {
              setSelectedFormat("csv");
              setSelectedTimeRange("24h");
              handleExport();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Table, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Daily CSV" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "flex items-center justify-center space-x-2",
            onClick: () => {
              setSelectedFormat("pdf");
              setSelectedTimeRange("7d");
              handleExport();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Weekly Report" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "flex items-center justify-center space-x-2",
            onClick: () => {
              setSelectedFormat("excel");
              setSelectedTimeRange("30d");
              handleExport();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Monthly Analysis" })
            ]
          }
        )
      ] })
    ] })
  ] });
};
const EnhancedAnalyticsPage = ({
  className,
  enableRealTime = true,
  refreshInterval = 3e4
}) => {
  const handleExport = (format, data) => {
    console.log(`Exporting ${format} format:`, data);
  };
  const handleImplementOptimization = (optimization) => {
    console.log("Implementing optimization:", optimization);
  };
  const handleTimeRangeChange = (range) => {
    console.log("Time range changed:", range);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AnalyticsProvider,
    {
      enableRealTime,
      refreshInterval,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("min-h-screen bg-gray-50 p-6", className), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-2", children: "Claude Code SDK Analytics" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg text-gray-600", children: "Comprehensive cost tracking, usage analytics, and performance insights" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "overview", className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "overview", className: "text-sm", children: "Cost Overview" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "messages", className: "text-sm", children: "Messages & Steps" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "optimize", className: "text-sm", children: "Optimization" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "export", className: "text-sm", children: "Export & Reports" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "overview", className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsErrorBoundary, { enableNLDIntegration: false, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CostOverviewDashboard,
            {
              onTimeRangeChange: handleTimeRangeChange,
              onExport: () => handleExport("pdf", {}),
              realTimeUpdates: enableRealTime
            }
          ) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "messages", className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsErrorBoundary, { enableNLDIntegration: false, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            MessageStepAnalytics,
            {
              realTimeUpdates: enableRealTime
            }
          ) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "optimize", className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsErrorBoundary, { enableNLDIntegration: false, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            OptimizationRecommendations,
            {
              onImplement: handleImplementOptimization
            }
          ) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "export", className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalyticsErrorBoundary, { enableNLDIntegration: false, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ExportReportingFeatures,
            {
              onExport: handleExport
            }
          ) }) })
        ] })
      ] }) }) })
    }
  );
};
const AnalyticsPage = EnhancedAnalyticsPage;
export {
  AnalyticsPage,
  EnhancedAnalyticsPage,
  EnhancedAnalyticsPage as default
};
//# sourceMappingURL=EnhancedAnalyticsPage-CO9X-nLS.js.map
