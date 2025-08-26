import { j as jsxRuntimeExports } from "./query-ByXEBJ34.js";
import { r as reactExports } from "./router-DVGoD1jn.js";
import { u as useWebSocketSingleton, n as nldLogger, g as getSocketIOUrl } from "./index-UAyedyQ3.js";
import { A as AlertTriangle, a4 as DollarSign, R as RefreshCw, ab as Download, T as TrendingUp, au as TrendingDown, e as Activity, a1 as Zap, c as BarChart3, a5 as Cpu } from "./ui-BjcxkqTE.js";
import "./vendor-CMtS3IUq.js";
var define_process_env_default = {};
const PRICING_CONFIG = {
  claude: {
    "claude-3-sonnet": { input: 3e-6, output: 15e-6 },
    "claude-3-haiku": { input: 25e-8, output: 125e-8 },
    "claude-3-opus": { input: 15e-6, output: 75e-6 }
  },
  openai: {
    "gpt-4": { input: 3e-5, output: 6e-5 },
    "gpt-3.5-turbo": { input: 1e-6, output: 2e-6 }
  }
};
const useTokenCostTracking = (config) => {
  const [tokenUsages, setTokenUsages] = reactExports.useState([]);
  const [metrics, setMetrics] = reactExports.useState(null);
  const [budgetStatus, setBudgetStatus] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const subscriptionRef = reactExports.useRef(null);
  const intervalRef = reactExports.useRef(null);
  const metricsCalculationRef = reactExports.useRef(null);
  const { socket, isConnected } = useWebSocketSingleton({
    url: define_process_env_default.NEXT_PUBLIC_WEBSOCKET_URL || getSocketIOUrl(),
    autoConnect: config?.enableRealTime
  });
  const calculateTokenCost = reactExports.useCallback((provider, model, inputTokens, outputTokens = 0) => {
    try {
      const providerConfig = PRICING_CONFIG[provider];
      if (!providerConfig) {
        nldLogger.renderFailure("useTokenCostTracking", new Error(`Unknown provider: ${provider}`));
        return 0;
      }
      const modelConfig = providerConfig[model];
      if (!modelConfig || typeof modelConfig.input !== "number" || typeof modelConfig.output !== "number") {
        nldLogger.renderFailure("useTokenCostTracking", new Error(`Unknown model: ${model}`));
        return 0;
      }
      const inputCost = (inputTokens || 0) * modelConfig.input;
      const outputCost = (outputTokens || 0) * modelConfig.output;
      return Math.round((inputCost + outputCost) * 1e4) / 1e4;
    } catch (error2) {
      nldLogger.renderFailure("useTokenCostTracking", error2);
      return 0;
    }
  }, []);
  const trackTokenUsage = reactExports.useCallback(async (usage) => {
    try {
      const newUsage = {
        ...usage,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: /* @__PURE__ */ new Date(),
        estimatedCost: calculateTokenCost(usage.provider, usage.model, usage.tokensUsed)
      };
      nldLogger.renderAttempt("useTokenCostTracking", "trackTokenUsage", newUsage);
      setTokenUsages((prev) => {
        const updated = [...prev, newUsage];
        if (updated.length > 1e3) {
          return updated.slice(-1e3);
        }
        return updated;
      });
      if (isConnected && socket) {
        socket.emit("token-usage", newUsage);
      }
      nldLogger.renderSuccess("useTokenCostTracking", "trackTokenUsage");
    } catch (error2) {
      nldLogger.renderFailure("useTokenCostTracking", error2, usage);
      setError(error2);
    }
  }, [calculateTokenCost, isConnected, socket]);
  const calculateMetrics = reactExports.useCallback(() => {
    try {
      if (tokenUsages.length === 0) {
        setMetrics(null);
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1e3);
      const recentUsages = tokenUsages.filter((usage) => usage.timestamp >= oneHourAgo);
      const totalTokensUsed = tokenUsages.reduce((sum, usage) => sum + usage.tokensUsed, 0);
      const totalCost = tokenUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const costByProvider = tokenUsages.reduce((acc, usage) => {
        acc[usage.provider] = (acc[usage.provider] || 0) + usage.estimatedCost;
        return acc;
      }, {});
      const costByModel = tokenUsages.reduce((acc, usage) => {
        acc[usage.model] = (acc[usage.model] || 0) + usage.estimatedCost;
        return acc;
      }, {});
      const averageCostPerToken = totalTokensUsed > 0 ? totalCost / totalTokensUsed : 0;
      const tokensPerMinute = recentUsages.length > 0 ? recentUsages.reduce((sum, usage) => sum + usage.tokensUsed, 0) / 60 : 0;
      const midpoint = Math.floor(tokenUsages.length / 2);
      const firstHalfAvg = tokenUsages.slice(0, midpoint).reduce((sum, usage) => sum + usage.estimatedCost, 0) / midpoint || 0;
      const secondHalfAvg = tokenUsages.slice(midpoint).reduce((sum, usage) => sum + usage.estimatedCost, 0) / (tokenUsages.length - midpoint) || 0;
      let costTrend = "stable";
      if (secondHalfAvg > firstHalfAvg * 1.1) costTrend = "increasing";
      else if (secondHalfAvg < firstHalfAvg * 0.9) costTrend = "decreasing";
      setMetrics({
        totalTokensUsed,
        totalCost: Math.round(totalCost * 1e4) / 1e4,
        costByProvider,
        costByModel,
        averageCostPerToken: Math.round(averageCostPerToken * 1e6) / 1e6,
        tokensPerMinute: Math.round(tokensPerMinute * 100) / 100,
        costTrend,
        lastUpdated: /* @__PURE__ */ new Date()
      });
    } catch (error2) {
      nldLogger.renderFailure("useTokenCostTracking", error2, { tokenUsagesCount: tokenUsages.length });
      setError(error2);
    }
  }, [tokenUsages]);
  const calculateBudgetStatus = reactExports.useCallback(() => {
    try {
      if (!config?.budgetLimits || !metrics) {
        setBudgetStatus(null);
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - startOfDay.getDay() * 24 * 60 * 60 * 1e3);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dailyUsages = tokenUsages.filter((usage) => usage.timestamp >= startOfDay);
      const weeklyUsages = tokenUsages.filter((usage) => usage.timestamp >= startOfWeek);
      const monthlyUsages = tokenUsages.filter((usage) => usage.timestamp >= startOfMonth);
      const dailyUsed = dailyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const weeklyUsed = weeklyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const monthlyUsed = monthlyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const dailyBudget = config.budgetLimits.daily || 0;
      const weeklyBudget = config.budgetLimits.weekly || 0;
      const monthlyBudget = config.budgetLimits.monthly || 0;
      const dailyPercentage = dailyBudget > 0 ? dailyUsed / dailyBudget * 100 : 0;
      const weeklyPercentage = weeklyBudget > 0 ? weeklyUsed / weeklyBudget * 100 : 0;
      const monthlyPercentage = monthlyBudget > 0 ? monthlyUsed / monthlyBudget * 100 : 0;
      const maxPercentage = Math.max(dailyPercentage, weeklyPercentage, monthlyPercentage);
      let alertLevel = "safe";
      if (maxPercentage >= 100) alertLevel = "exceeded";
      else if (maxPercentage >= 90) alertLevel = "critical";
      else if (maxPercentage >= 80) alertLevel = "warning";
      const hoursInDay = (now.getTime() - startOfDay.getTime()) / (1e3 * 60 * 60);
      const dailyRate = hoursInDay > 0 ? dailyUsed / hoursInDay : 0;
      const projectedDailyCost = dailyRate * 24;
      const daysInMonth = now.getDate();
      const monthlyRate = daysInMonth > 0 ? monthlyUsed / daysInMonth : 0;
      const projectedMonthlyCost = monthlyRate * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setBudgetStatus({
        dailyBudget,
        weeklyBudget,
        monthlyBudget,
        dailyUsed: Math.round(dailyUsed * 1e4) / 1e4,
        weeklyUsed: Math.round(weeklyUsed * 1e4) / 1e4,
        monthlyUsed: Math.round(monthlyUsed * 1e4) / 1e4,
        dailyPercentage: Math.round(dailyPercentage * 100) / 100,
        weeklyPercentage: Math.round(weeklyPercentage * 100) / 100,
        monthlyPercentage: Math.round(monthlyPercentage * 100) / 100,
        alertLevel,
        projectedDailyCost: Math.round(projectedDailyCost * 1e4) / 1e4,
        projectedMonthlyCost: Math.round(projectedMonthlyCost * 1e4) / 1e4
      });
    } catch (error2) {
      nldLogger.renderFailure("useTokenCostTracking", error2, { budgetConfig: config?.budgetLimits });
      setError(error2);
    }
  }, [config?.budgetLimits, metrics, tokenUsages]);
  const fetchHistoricalData = reactExports.useCallback(async () => {
    try {
      setLoading(true);
      nldLogger.renderAttempt("useTokenCostTracking", "fetchHistoricalData", {});
      await new Promise((resolve) => setTimeout(resolve, 500));
      const stored = localStorage.getItem("tokenUsages");
      if (stored) {
        try {
          const parsedUsages = JSON.parse(stored).map((usage) => ({
            ...usage,
            timestamp: new Date(usage.timestamp)
          }));
          setTokenUsages(parsedUsages);
          nldLogger.renderSuccess("useTokenCostTracking", "loaded-from-storage");
        } catch (parseError) {
          nldLogger.renderFailure("useTokenCostTracking", parseError);
          localStorage.removeItem("tokenUsages");
        }
      } else {
        setTokenUsages([]);
        nldLogger.renderSuccess("useTokenCostTracking", "initialized-empty-state");
      }
      setLoading(false);
      nldLogger.renderSuccess("useTokenCostTracking", "fetchHistoricalData");
    } catch (error2) {
      nldLogger.renderFailure("useTokenCostTracking", error2, {});
      setError(error2);
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    fetchHistoricalData();
    if (socket) {
      const handleTokenUpdate = (data) => {
        setTokenUsages((prev) => {
          const updated = [...prev, { ...data, timestamp: new Date(data.timestamp) }];
          return updated.length > 1e3 ? updated.slice(-1e3) : updated;
        });
      };
      socket.on("token-usage-update", handleTokenUpdate);
      subscriptionRef.current = () => {
        socket.off("token-usage-update", handleTokenUpdate);
      };
    }
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        nldLogger.renderAttempt("useTokenCostTracking", "force-loading-complete", { reason: "timeout" });
        setLoading(false);
        if (!isConnected) {
          const demoData = [
            {
              id: "demo-1",
              timestamp: new Date(Date.now() - 36e5),
              provider: "claude",
              model: "claude-3-sonnet",
              tokensUsed: 1250,
              estimatedCost: 0.0125,
              requestType: "chat",
              component: "TokenCostAnalytics",
              metadata: { demo: true }
            },
            {
              id: "demo-2",
              timestamp: new Date(Date.now() - 18e5),
              provider: "openai",
              model: "gpt-4",
              tokensUsed: 890,
              estimatedCost: 0.0178,
              requestType: "completion",
              component: "TokenCostAnalytics",
              metadata: { demo: true }
            },
            {
              id: "demo-3",
              timestamp: new Date(Date.now() - 6e5),
              provider: "claude-flow",
              model: "flow-agent",
              tokensUsed: 445,
              estimatedCost: 89e-4,
              requestType: "swarm-coordination",
              component: "TokenCostAnalytics",
              metadata: { demo: true }
            }
          ];
          setTokenUsages(demoData);
          nldLogger.renderSuccess("useTokenCostTracking", "demo-data-loaded");
        }
      }
    }, 3e3);
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (metricsCalculationRef.current) {
        clearTimeout(metricsCalculationRef.current);
      }
      clearTimeout(loadingTimeout);
    };
  }, [config?.enableRealTime, socket, fetchHistoricalData, loading]);
  reactExports.useEffect(() => {
    if (metricsCalculationRef.current) {
      clearTimeout(metricsCalculationRef.current);
    }
    metricsCalculationRef.current = setTimeout(() => {
      calculateMetrics();
      calculateBudgetStatus();
    }, 500);
    return () => {
      if (metricsCalculationRef.current) {
        clearTimeout(metricsCalculationRef.current);
      }
    };
  }, [tokenUsages, calculateMetrics, calculateBudgetStatus]);
  reactExports.useEffect(() => {
    if (tokenUsages.length > 0) {
      try {
        localStorage.setItem("tokenUsages", JSON.stringify(tokenUsages.slice(-100)));
      } catch (error2) {
        nldLogger.renderFailure("useTokenCostTracking", error2, { action: "localStorage" });
      }
    }
  }, [tokenUsages]);
  return {
    tokenUsages,
    metrics,
    budgetStatus,
    loading,
    error,
    isConnected,
    trackTokenUsage,
    calculateTokenCost,
    refetch: fetchHistoricalData
  };
};
const TokenCostAnalytics = ({
  className = "",
  showBudgetAlerts = true,
  enableExport = true,
  budgetLimits = {
    daily: 10,
    weekly: 50,
    monthly: 200
  }
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = reactExports.useState("1d");
  const [showSettings, setShowSettings] = reactExports.useState(false);
  const {
    tokenUsages,
    metrics,
    budgetStatus,
    loading,
    error,
    isConnected,
    refetch
  } = useTokenCostTracking({
    enableRealTime: true,
    budgetLimits
  });
  reactExports.useEffect(() => {
    nldLogger.renderAttempt("TokenCostAnalytics", "component-mount", { budgetLimits, showBudgetAlerts });
    return () => {
      nldLogger.renderSuccess("TokenCostAnalytics", "component-unmount");
    };
  }, [budgetLimits, showBudgetAlerts]);
  const filteredTokenUsages = reactExports.useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    let cutoffTime;
    switch (selectedTimeRange) {
      case "1h":
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1e3);
        break;
      case "1d":
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
        break;
      case "7d":
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
        break;
      case "30d":
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    }
    return tokenUsages.filter((usage) => usage.timestamp >= cutoffTime);
  }, [tokenUsages, selectedTimeRange]);
  const chartData = reactExports.useMemo(() => {
    if (filteredTokenUsages.length === 0) return [];
    const groupingInterval = selectedTimeRange === "1h" ? 5 * 60 * 1e3 : (
      // 5 minutes
      selectedTimeRange === "1d" ? 60 * 60 * 1e3 : (
        // 1 hour
        selectedTimeRange === "7d" ? 6 * 60 * 60 * 1e3 : (
          // 6 hours
          24 * 60 * 60 * 1e3
        )
      )
    );
    const groupedData = /* @__PURE__ */ new Map();
    filteredTokenUsages.forEach((usage) => {
      const groupKey = new Date(Math.floor(usage.timestamp.getTime() / groupingInterval) * groupingInterval).toISOString();
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          timestamp: groupKey,
          cost: 0,
          tokens: 0,
          provider: usage.provider
        });
      }
      const existing = groupedData.get(groupKey);
      existing.cost += usage.estimatedCost;
      existing.tokens += usage.tokensUsed;
    });
    return Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredTokenUsages, selectedTimeRange]);
  const handleExport = () => {
    try {
      nldLogger.renderAttempt("TokenCostAnalytics", "export-data", { usageCount: tokenUsages.length });
      const exportData = {
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        timeRange: selectedTimeRange,
        summary: metrics,
        budgetStatus,
        tokenUsages: filteredTokenUsages
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `token-cost-analytics-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      nldLogger.renderSuccess("TokenCostAnalytics", "export-data");
    } catch (error2) {
      nldLogger.renderFailure("TokenCostAnalytics", error2, { action: "export" });
    }
  };
  const getAlertLevelColor = (level) => {
    switch (level) {
      case "safe":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-orange-600 bg-orange-100";
      case "exceeded":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(value);
  };
  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-US").format(value);
  };
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-6 bg-red-50 border border-red-200 rounded-lg ${className}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-6 h-6 text-red-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-red-800", children: "Token Cost Analytics Error" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-700 mb-4", children: error.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: refetch,
          className: "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors",
          children: "Retry"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-6 ${className}`, "data-testid": "token-cost-analytics", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-gray-900 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-7 h-7 text-blue-600" }),
          "Token Cost Analytics"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "Real-time token usage and cost tracking" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: isConnected ? "Real-time updates active" : "Disconnected" }),
          loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-blue-600 flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3 h-3 animate-spin" }),
            "Loading..."
          ] }),
          !isConnected && tokenUsages.length > 0 && tokenUsages[0]?.metadata?.demo && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md", children: "Demo Mode" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex bg-gray-100 rounded-lg p-1", children: ["1h", "1d", "7d", "30d"].map((range) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSelectedTimeRange(range),
            className: `px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedTimeRange === range ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`,
            children: range
          },
          range
        )) }),
        enableExport && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleExport,
            className: "flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4" }),
              "Export"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: refetch,
            disabled: loading,
            className: "flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 ${loading ? "animate-spin" : ""}` }),
              "Refresh"
            ]
          }
        )
      ] })
    ] }),
    showBudgetAlerts && budgetStatus && budgetStatus.alertLevel !== "safe" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-4 rounded-lg border ${getAlertLevelColor(budgetStatus.alertLevel)} border-current border-opacity-20`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-5 h-5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "font-semibold", children: [
          "Budget Alert: ",
          budgetStatus.alertLevel.charAt(0).toUpperCase() + budgetStatus.alertLevel.slice(1)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm opacity-90", children: budgetStatus.alertLevel === "exceeded" ? "Budget limits have been exceeded" : `Budget utilization is at ${Math.max(budgetStatus.dailyPercentage, budgetStatus.weeklyPercentage, budgetStatus.monthlyPercentage).toFixed(1)}%` })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-blue-100 text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-6 h-6" }) }),
          metrics?.costTrend === "increasing" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "w-4 h-4 text-red-500" }) : metrics?.costTrend === "decreasing" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { className: "w-4 h-4 text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Cost" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: metrics ? formatCurrency(metrics.totalCost) : loading ? "..." : "$0.0000" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "USD" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${metrics?.costTrend === "increasing" ? "bg-red-100 text-red-800" : metrics?.costTrend === "decreasing" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`, children: metrics?.costTrend || "stable" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-green-100 text-green-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Tokens" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: metrics ? formatNumber(metrics.totalTokensUsed) : loading ? "..." : "0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "tokens" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: metrics ? `${metrics.tokensPerMinute.toFixed(1)}/min` : "0/min" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-purple-100 text-purple-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Avg Cost/Token" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-baseline gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: metrics ? formatCurrency(metrics.averageCostPerToken) : loading ? "..." : "$0.000000" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: "per token" })
        ] })
      ] }),
      budgetStatus && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-3 rounded-lg ${getAlertLevelColor(budgetStatus.alertLevel)}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Daily Budget" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(budgetStatus.dailyUsed) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-gray-500", children: [
              "/ ",
              formatCurrency(budgetStatus.dailyBudget)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `h-2 rounded-full ${budgetStatus.dailyPercentage >= 100 ? "bg-red-500" : budgetStatus.dailyPercentage >= 80 ? "bg-orange-500" : budgetStatus.dailyPercentage >= 50 ? "bg-yellow-500" : "bg-green-500"}`,
              style: { width: `${Math.min(budgetStatus.dailyPercentage, 100)}%` }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-gray-600", children: [
            budgetStatus.dailyPercentage.toFixed(1),
            "% used"
          ] })
        ] })
      ] })
    ] }),
    metrics && Object.keys(metrics.costByProvider).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Cost Breakdown by Provider" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: Object.entries(metrics.costByProvider).map(([provider, cost]) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3 p-4 bg-gray-50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-900 capitalize", children: provider }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-blue-600", children: formatCurrency(cost) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-500", children: [
          (cost / metrics.totalCost * 100).toFixed(1),
          "% of total"
        ] })
      ] }) }, provider)) })
    ] }),
    chartData.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Usage Timeline" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Time" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tokens" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cost" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Provider" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: chartData.slice(-10).map((dataPoint, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-gray-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: new Date(dataPoint.timestamp).toLocaleTimeString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatNumber(dataPoint.tokens) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatCurrency(dataPoint.cost) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize", children: dataPoint.provider }) })
        ] }, index)) })
      ] }) })
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center h-32", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-3 text-gray-600", children: "Loading token cost data..." })
    ] }),
    !loading && tokenUsages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No token usage data" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mb-4", children: "Start using AI features to see token cost analytics here." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: refetch,
          className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",
          children: "Check Again"
        }
      )
    ] })
  ] });
};
export {
  TokenCostAnalytics as default
};
//# sourceMappingURL=TokenCostAnalytics-DnqHn8aV.js.map
