import { j as jsxRuntimeExports } from "./query-DX_7x9fC.js";
import { r as reactExports } from "./router-CaK4inQI.js";
import { n as nldLogger } from "./index-DTG5e-wJ.js";
import { f as Clock, a4 as DollarSign, ab as Download, R as RefreshCw, e as Activity, a1 as Zap, c as BarChart3, a5 as Cpu } from "./ui-BerF2lbh.js";
import "./vendor-CMtS3IUq.js";
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
  const tokenUsages = [];
  const metrics = null;
  const budgetStatus = null;
  const loading = false;
  const refetch = () => {
  };
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-6 ${className}`, "data-testid": "token-cost-analytics-disabled", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-6 h-6 text-amber-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-amber-800", children: "Token Cost Analytics - Coming Soon" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-700 mb-4", children: "Token cost tracking is temporarily disabled while we remove WebSocket dependencies. This feature will be reimplemented with improved performance and reliability." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-100 rounded-md p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-amber-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "SPARC Implementation:" }),
        " Graceful degradation ensures the UI remains functional while maintaining tab switching behavior and preventing WebSocket connection errors."
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-6 opacity-50 ${className}`, "data-testid": "token-cost-analytics-placeholder", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold text-gray-900 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-7 h-7 text-blue-600" }),
            "Token Cost Analytics"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "Real-time token usage and cost tracking" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 rounded-full bg-gray-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "Feature Disabled" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md", children: "Placeholder Mode" })
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
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 ${""}` }),
                "Refresh"
              ]
            }
          )
        ] })
      ] }),
      showBudgetAlerts && budgetStatus,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-blue-100 text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-6 h-6" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Cost" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: "$0.0000" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "USD" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${"bg-gray-100 text-gray-800"}`, children: "stable" })
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
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: "0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-500", children: "tokens" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: "0/min" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 rounded-lg bg-purple-100 text-purple-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { className: "w-6 h-6" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-gray-500" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Avg Cost/Token" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-baseline gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-gray-900", children: "$0.000000" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: "per token" })
          ] })
        ] }),
        budgetStatus
      ] }),
      metrics,
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
      loading,
      tokenUsages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
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
    ] })
  ] });
};
export {
  TokenCostAnalytics as default
};
//# sourceMappingURL=TokenCostAnalytics-B8ixc3KL.js.map
