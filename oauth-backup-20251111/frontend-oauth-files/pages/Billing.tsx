import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  DollarSign,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';

interface UsageRecord {
  id: string;
  date: string;
  tokens: number;
  cost: number;
  requests: number;
  model: string;
}

interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageCostPerRequest: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const Billing: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [usageData, setUsageData] = useState<UsageRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const loadBillingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claude-code/billing/usage?period=${selectedPeriod}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSummary(result.data.summary);
        setUsageData(result.data.usage);
      } else {
        throw new Error(result.message || 'Failed to load billing data');
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (usageData.length === 0) return;

    const headers = ['Date', 'Requests', 'Tokens', 'Model', 'Cost (USD)'];
    const rows = usageData.map(record => [
      record.date,
      record.requests.toString(),
      record.tokens.toString(),
      record.model,
      record.cost.toFixed(4)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `claude-billing-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded shadow-lg max-w-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Error Loading Billing Data</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <Button onClick={loadBillingData} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-page p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Billing & Usage
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your Claude Code API usage and costs
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' }
          ].map(period => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod(period.value as '7d' | '30d' | '90d')}
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {period.label}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Cost */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</span>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summary.totalCost)}
                </p>
                <div className="flex items-center mt-2">
                  {summary.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  ) : summary.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <Activity className="h-4 w-4 text-gray-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    summary.trend === 'up' ? "text-red-600" :
                    summary.trend === 'down' ? "text-green-600" :
                    "text-gray-600"
                  )}>
                    {summary.trendPercentage.toFixed(1)}% vs previous period
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Tokens */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</span>
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summary.totalTokens)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Across all requests
                </p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</span>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(summary.totalRequests)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  API calls made
                </p>
              </CardContent>
            </Card>

            {/* Average Cost per Request */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cost/Request</span>
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summary.averageCostPerRequest)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Per API call
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Usage Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detailed Usage</CardTitle>
                <CardDescription>
                  Daily breakdown of your API usage and costs
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {usageData.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No usage data available for this period
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cost (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {usageData.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(record.requests)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(record.tokens)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="secondary">{record.model}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(record.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {summary && formatNumber(summary.totalRequests)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {summary && formatNumber(summary.totalTokens)}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-gray-100">
                        {summary && formatCurrency(summary.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
            <CardDescription>Current Claude API pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Claude 3.5 Sonnet</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>Input: $3.00 / million tokens</li>
                  <li>Output: $15.00 / million tokens</li>
                  <li>Cache writes: $3.75 / million tokens</li>
                  <li>Cache reads: $0.30 / million tokens</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Claude 3 Haiku</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>Input: $0.25 / million tokens</li>
                  <li>Output: $1.25 / million tokens</li>
                  <li>Cache writes: $0.30 / million tokens</li>
                  <li>Cache reads: $0.03 / million tokens</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
