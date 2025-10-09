import { j as jsxRuntimeExports, u as useQueryClient, a as useQuery } from "./query-nnCaEDT4.js";
import { r as reactExports } from "./vendor-Dda1ojue.js";
import { B as Bar, C as Chart, a as CategoryScale, L as LinearScale, b as BarElement, p as plugin_title, c as plugin_tooltip, d as plugin_legend, T as TimeScale } from "./charts-bHvzI7z8.js";
import { c as cn } from "./index-E23w2Ly2.js";
import { R as RefreshCw, D as Download, A as Activity, Z as Zap, a as DollarSign, C as Clock, b as Calendar, T as TrendingUp, S as Search } from "./ui-WXJLiGcV.js";
import "./router-nbYElDQQ.js";
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  plugin_title,
  plugin_tooltip,
  plugin_legend,
  TimeScale
);
const API_BASE = "/api/token-analytics";
const validateTokenUsageRecord = (record) => {
  return typeof record === "object" && typeof record.id === "string" && typeof record.timestamp === "string" && typeof record.session_id === "string" && typeof record.request_id === "string" && typeof record.provider === "string" && typeof record.model === "string" && typeof record.request_type === "string" && typeof record.input_tokens === "number" && typeof record.output_tokens === "number" && typeof record.total_tokens === "number" && typeof record.cost_total === "number" && typeof record.processing_time_ms === "number" && typeof record.message_preview === "string" && typeof record.response_preview === "string";
};
const validateUsageSummary = (summary) => {
  return typeof summary === "object" && typeof summary.total_requests === "number" && typeof summary.total_tokens === "number" && typeof summary.total_cost === "number" && (typeof summary.avg_processing_time === "number" || summary.avg_processing_time === null) && typeof summary.unique_sessions === "number" && typeof summary.providers_used === "number" && typeof summary.models_used === "number";
};
const validateChartData = (data) => {
  return typeof data === "object" && Array.isArray(data.labels) && Array.isArray(data.datasets) && data.datasets.every(
    (dataset) => typeof dataset === "object" && typeof dataset.label === "string" && Array.isArray(dataset.data) && dataset.data.every((value) => typeof value === "number") && typeof dataset.backgroundColor === "string"
  );
};
const useTokenAnalytics = () => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const queryClient = useQueryClient();
  const hourlyQuery = useQuery({
    queryKey: ["token-analytics", "hourly"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/hourly`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hourly data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.data && !validateChartData(data.data)) {
        console.warn("Invalid hourly chart data structure received");
        throw new Error("Invalid hourly data format");
      }
      return data;
    },
    refetchInterval: 6e4,
    // Refresh every minute
    staleTime: 3e4,
    // Consider data stale after 30 seconds
    retry: 3,
    // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
    // Exponential backoff
  });
  const dailyQuery = useQuery({
    queryKey: ["token-analytics", "daily"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/daily`);
      if (!response.ok) {
        throw new Error(`Failed to fetch daily data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.data && !validateChartData(data.data)) {
        console.warn("Invalid daily chart data structure received");
        throw new Error("Invalid daily data format");
      }
      return data;
    },
    refetchInterval: 3e5,
    // Refresh every 5 minutes
    staleTime: 6e4,
    // Consider data stale after 1 minute
    retry: 3,
    // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
    // Exponential backoff
  });
  const messagesQuery = useQuery({
    queryKey: ["token-analytics", "messages"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/messages?limit=100`);
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const invalidRecords = data.data.filter((record) => !validateTokenUsageRecord(record));
        if (invalidRecords.length > 0) {
          console.warn(`Found ${invalidRecords.length} invalid message records`);
        }
        data.data = data.data.filter((record) => validateTokenUsageRecord(record));
      }
      return data;
    },
    refetchInterval: 3e4,
    // Refresh every 30 seconds
    retry: 3,
    // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
    // Exponential backoff
  });
  const summaryQuery = useQuery({
    queryKey: ["token-analytics", "summary"],
    queryFn: async () => {
      var _a2;
      const response = await fetch(`${API_BASE}/summary`);
      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (((_a2 = data.data) == null ? void 0 : _a2.summary) && !validateUsageSummary(data.data.summary)) {
        console.warn("Invalid summary data structure received");
        throw new Error("Invalid summary data format");
      }
      return data;
    },
    refetchInterval: 6e4,
    // Refresh every minute
    retry: 3,
    // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4)
    // Exponential backoff
  });
  const refreshAll = reactExports.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["token-analytics"] });
  }, [queryClient]);
  return {
    hourlyData: (_a = hourlyQuery.data) == null ? void 0 : _a.data,
    dailyData: (_b = dailyQuery.data) == null ? void 0 : _b.data,
    messages: ((_c = messagesQuery.data) == null ? void 0 : _c.data) || [],
    summary: (_e = (_d = summaryQuery.data) == null ? void 0 : _d.data) == null ? void 0 : _e.summary,
    byProvider: ((_g = (_f = summaryQuery.data) == null ? void 0 : _f.data) == null ? void 0 : _g.by_provider) || [],
    byModel: ((_i = (_h = summaryQuery.data) == null ? void 0 : _h.data) == null ? void 0 : _i.by_model) || [],
    isLoading: hourlyQuery.isLoading || dailyQuery.isLoading || messagesQuery.isLoading || summaryQuery.isLoading,
    error: hourlyQuery.error || dailyQuery.error || messagesQuery.error || summaryQuery.error,
    refreshAll
  };
};
const hourlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false
  },
  plugins: {
    legend: {
      position: "top"
    },
    title: {
      display: false
    },
    tooltip: {
      mode: "index",
      intersect: false
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: "Hour"
      }
    },
    y: {
      type: "linear",
      display: true,
      position: "left",
      title: {
        display: true,
        text: "Tokens"
      },
      beginAtZero: true
    },
    y1: {
      type: "linear",
      display: true,
      position: "right",
      title: {
        display: true,
        text: "Requests"
      },
      grid: {
        drawOnChartArea: false
      },
      beginAtZero: true
    }
  }
};
const dailyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false
  },
  plugins: {
    legend: {
      position: "top"
    },
    title: {
      display: false
    },
    tooltip: {
      mode: "index",
      intersect: false
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Date"
      }
    },
    y: {
      type: "linear",
      title: {
        display: true,
        text: "Tokens"
      },
      beginAtZero: true,
      position: "left"
    },
    y1: {
      type: "linear",
      display: true,
      position: "right",
      title: {
        display: true,
        text: "Requests"
      },
      grid: {
        drawOnChartArea: false
      },
      beginAtZero: true
    },
    y2: {
      type: "linear",
      display: true,
      position: "right",
      title: {
        display: true,
        text: "Cost ($)"
      },
      grid: {
        drawOnChartArea: false
      },
      beginAtZero: true
    }
  }
};
const SummaryCard = ({ title, value, icon, trend, color }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white rounded-lg border border-gray-200 p-6 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-gray-600", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-gray-900", children: value }),
    trend && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-green-600 flex items-center mt-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "w-4 h-4 mr-1" }),
      trend
    ] })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("p-3 rounded-full", color), children: icon })
] }) });
const MessageList = ({ messages, searchTerm, onSearchChange }) => {
  const filteredMessages = reactExports.useMemo(() => {
    if (!searchTerm) return messages;
    return messages.filter(
      (msg) => (msg.message_preview || "").toLowerCase().includes(searchTerm.toLowerCase()) || (msg.response_preview || "").toLowerCase().includes(searchTerm.toLowerCase()) || msg.provider.toLowerCase().includes(searchTerm.toLowerCase()) || msg.model.toLowerCase().includes(searchTerm.toLowerCase()) || (msg.component || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Recent Messages" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "Search messages...",
            value: searchTerm,
            onChange: (e) => onSearchChange(e.target.value),
            className: "pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto", children: filteredMessages.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-gray-500", children: searchTerm ? "No messages match your search." : "No messages found." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-gray-200", children: filteredMessages.map((message) => {
      var _a, _b, _c, _d;
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 hover:bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-start justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800", children: message.provider }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: message.model }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800", children: message.request_type }),
          message.component && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800", children: message.component }),
          message.message_id && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800", title: "Unique Message ID", children: [
            "ID: ",
            (_a = message.message_id.split("-").pop()) == null ? void 0 : _a.substring(0, 6),
            "..."
          ] })
        ] }),
        message.message_preview && message.message_preview.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-900 mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Input:" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-xs", children: [
            message.message_preview.substring(0, 200),
            message.message_preview.length > 200 ? "..." : ""
          ] })
        ] }),
        message.response_preview && message.response_preview.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Response:" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-xs", children: [
            message.response_preview.substring(0, 200),
            message.response_preview.length > 200 ? "..." : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4 text-xs text-gray-500", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: message.timestamp, children: new Date(message.timestamp).toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { title: `Input: ${((_b = message.input_tokens) == null ? void 0 : _b.toLocaleString()) || 0}, Output: ${((_c = message.output_tokens) == null ? void 0 : _c.toLocaleString()) || 0}`, children: [
            (message.total_tokens || 0).toLocaleString(),
            " tokens"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "$",
            (message.cost_total || 0).toFixed(4)
          ] }),
          message.processing_time_ms && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            message.processing_time_ms,
            "ms"
          ] }),
          message.session_id && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-blue-600", title: "Session ID", children: [
            "Session: ",
            (_d = message.session_id.split("-").pop()) == null ? void 0 : _d.substring(0, 6),
            "..."
          ] })
        ] })
      ] }) }) }, message.id);
    }) }) })
  ] });
};
const exportData = async (format = "csv", days = 30) => {
  try {
    const response = await fetch(`${API_BASE}/export?format=${format}&days=${days}`);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("Export returned empty data");
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `token-analytics-${days}d.${format}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  } catch (error) {
    console.error("Export failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Export failed. Please try again.";
    alert(`Export Error: ${errorMessage}`);
  }
};
const TokenAnalyticsDashboard = () => {
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [activeTab, setActiveTab] = reactExports.useState("hourly");
  const {
    hourlyData,
    dailyData,
    messages,
    summary,
    byProvider,
    byModel,
    isLoading,
    error,
    refreshAll
  } = useTokenAnalytics();
  const formatCurrency = (dollars) => `$${dollars.toFixed(4)}`;
  const formatNumber = (num) => (num == null ? void 0 : num.toLocaleString()) || "0";
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 bg-red-50 border border-red-200 rounded-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold text-red-800 mb-2", children: "Error Loading Token Analytics" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-600 mb-4", children: error.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: refreshAll,
          className: "inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
            "Retry"
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", "data-testid": "token-analytics-dashboard", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Token Analytics" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "Monitor your Claude API usage and costs in real-time" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => exportData("csv", 30),
            className: "inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-2" }),
              "Export CSV"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: refreshAll,
            disabled: isLoading,
            className: "inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("w-4 h-4 mr-2", isLoading && "animate-spin") }),
              "Refresh"
            ]
          }
        )
      ] })
    ] }),
    summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryCard,
        {
          title: "Total Requests",
          value: formatNumber(summary.total_requests),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-6 h-6 text-white" }),
          color: "bg-blue-500"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryCard,
        {
          title: "Total Tokens",
          value: formatNumber(summary.total_tokens),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-6 h-6 text-white" }),
          color: "bg-green-500"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryCard,
        {
          title: "Total Cost",
          value: formatCurrency(summary.total_cost),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-6 h-6 text-white" }),
          color: "bg-purple-500"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryCard,
        {
          title: "Avg Response Time",
          value: summary.avg_processing_time ? `${Math.round(summary.avg_processing_time)}ms` : "N/A",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-6 h-6 text-white" }),
          color: "bg-orange-500"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-5 h-5 mr-2" }),
          "Hourly Usage (Last 24 Hours)"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-80", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }) : hourlyData ? /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { data: hourlyData, options: hourlyChartOptions }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-gray-500", children: "No hourly data available" }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-5 h-5 mr-2" }),
          "Daily Usage (Last 30 Days)"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-80", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }) : dailyData ? /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { data: dailyData, options: dailyChartOptions }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-gray-500", children: "No daily data available" }) }) })
      ] })
    ] }),
    (byProvider.length > 0 || byModel.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      byProvider.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Usage by Provider" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: byProvider.map((provider, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-gray-900", children: provider.provider }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600", children: [
              formatNumber(provider.requests),
              " requests • ",
              formatNumber(provider.tokens),
              " tokens"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-gray-900", children: formatCurrency(provider.cost) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600", children: [
              Math.round(provider.avg_time),
              "ms avg"
            ] })
          ] })
        ] }, index)) }) })
      ] }),
      byModel.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Usage by Model" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: byModel.slice(0, 5).map((model, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-gray-900", children: model.model }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600", children: [
              model.provider,
              " • ",
              formatNumber(model.requests),
              " requests"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-gray-900", children: formatCurrency(model.cost) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600", children: [
              formatNumber(model.tokens),
              " tokens"
            ] })
          ] })
        ] }, index)) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MessageList,
      {
        messages,
        searchTerm,
        onSearchChange: setSearchTerm
      }
    )
  ] });
};
export {
  TokenAnalyticsDashboard,
  TokenAnalyticsDashboard as default
};
//# sourceMappingURL=TokenAnalyticsDashboard-Cbtl6d0r.js.map
