import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Table, 
  BarChart3,
  Calendar,
  Mail,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ExportData, AnalyticsTimeRange } from '../types/analytics';

interface ExportReportingFeaturesProps {
  className?: string;
  onExport?: (format: string, data: ExportData) => void;
  data?: any;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  fileExtension: string;
  mimeType: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  format: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  lastSent: Date;
  nextSend: Date;
  status: 'active' | 'paused' | 'error';
}

const ExportReportingFeatures: React.FC<ExportReportingFeaturesProps> = ({
  className,
  onExport,
  data
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const exportFormats: ExportFormat[] = [
    {
      id: 'csv',
      name: 'CSV',
      description: 'Comma-separated values for spreadsheet analysis',
      icon: Table,
      fileExtension: 'csv',
      mimeType: 'text/csv'
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'Machine-readable data format for API integration',
      icon: FileText,
      fileExtension: 'json',
      mimeType: 'application/json'
    },
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional report with charts and analysis',
      icon: FileText,
      fileExtension: 'pdf',
      mimeType: 'application/pdf'
    },
    {
      id: 'excel',
      name: 'Excel',
      description: 'Formatted spreadsheet with multiple sheets',
      icon: BarChart3,
      fileExtension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  ];

  const [scheduledReports] = useState<ScheduledReport[]>([
    {
      id: '1',
      name: 'Weekly Cost Summary',
      format: 'pdf',
      frequency: 'weekly',
      recipients: ['admin@company.com', 'finance@company.com'],
      lastSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextSend: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: '2',
      name: 'Monthly Analytics Report',
      format: 'excel',
      frequency: 'monthly',
      recipients: ['ceo@company.com', 'cto@company.com'],
      lastSent: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextSend: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: '3',
      name: 'Daily Token Usage',
      format: 'csv',
      frequency: 'daily',
      recipients: ['devops@company.com'],
      lastSent: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      nextSend: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000),
      status: 'paused'
    }
  ]);

  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'day'
        },
        costMetrics: {
          totalCost: 156.78,
          dailyCost: 12.45,
          weeklyCost: 87.32,
          monthlyCost: 345.67,
          costTrend: 'increasing',
          averageCostPerRequest: 0.023,
          lastUpdated: new Date()
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
          messageTypes: { 'text': 1000, 'code': 200, 'analysis': 47 },
          errorRate: 0.039
        },
        stepAnalytics: {
          totalSteps: 3456,
          completedSteps: 3298,
          failedSteps: 158,
          averageStepDuration: 2340,
          stepTypes: { 'generate': 2000, 'analyze': 800, 'optimize': 656 },
          stepSuccessRate: 0.954
        },
        serviceTiers: [
          { tier: 'basic', requestCount: 1247, tokenUsage: 847392, cost: 45.67, percentage: 29.1, responseTime: 234 },
          { tier: 'premium', requestCount: 856, tokenUsage: 1294857, cost: 78.45, percentage: 50.0, responseTime: 156 },
          { tier: 'enterprise', requestCount: 423, tokenUsage: 705143, cost: 32.66, percentage: 20.9, responseTime: 89 }
        ],
        recommendations: [],
        rawData: data
      };
      
      onExport?.(selectedFormat, exportData);
      
      // Generate and download file
      generateDownload(selectedFormat, exportData);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateDownload = (format: string, exportData: ExportData) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `analytics-report-${timestamp}`;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'csv':
        content = generateCSV(exportData);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'pdf':
        // In a real implementation, you'd use a PDF library
        content = generateTextReport(exportData);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'excel':
        // In a real implementation, you'd use an Excel library
        content = generateCSV(exportData);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data: ExportData): string => {
    const headers = ['Date', 'Cost', 'Tokens', 'Requests', 'Success Rate'];
    const rows = [
      headers.join(','),
      `${data.exportDate},${data.costMetrics.totalCost},${data.tokenUsage.totalTokens},${data.messageAnalytics.totalMessages},${((data.messageAnalytics.successfulMessages / data.messageAnalytics.totalMessages) * 100).toFixed(2)}%`
    ];
    return rows.join('\n');
  };

  const generateTextReport = (data: ExportData): string => {
    return `
Claude Code SDK Analytics Report
Generated: ${data.exportDate}

=== COST METRICS ===
Total Cost: $${data.costMetrics.totalCost}
Daily Average: $${data.costMetrics.dailyCost}
Monthly Total: $${data.costMetrics.monthlyCost}

=== TOKEN USAGE ===
Total Tokens: ${data.tokenUsage.totalTokens.toLocaleString()}
Input Tokens: ${data.tokenUsage.inputTokens.toLocaleString()}
Output Tokens: ${data.tokenUsage.outputTokens.toLocaleString()}

=== MESSAGE ANALYTICS ===
Total Messages: ${data.messageAnalytics.totalMessages}
Success Rate: ${((data.messageAnalytics.successfulMessages / data.messageAnalytics.totalMessages) * 100).toFixed(2)}%
Average Response Time: ${data.messageAnalytics.averageResponseTime}ms

=== SERVICE TIERS ===
${data.serviceTiers.map(tier => 
  `${tier.tier.toUpperCase()}: ${tier.requestCount} requests, $${tier.cost.toFixed(2)}`
).join('\n')}
`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'paused': return Clock;
      case 'error': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Download className="w-7 h-7 mr-3 text-blue-600" />
          Export & Reporting
        </h2>
        <p className="text-gray-600 mt-1">
          Generate reports and schedule automated analytics delivery
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
          
          {/* Format Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                {exportFormats.map(format => {
                  const Icon = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={cn(
                        'p-4 border rounded-lg text-left transition-colors',
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{format.name}</div>
                          <div className="text-xs text-gray-500">{format.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include charts and visualizations</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={includeRecommendations}
                  onChange={(e) => setIncludeRecommendations(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include optimization recommendations</span>
              </label>
            </div>
            
            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule New</span>
            </Button>
          </div>
          
          <div className="space-y-4">
            {scheduledReports.map(report => {
              const StatusIcon = getStatusIcon(report.status);
              
              return (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getStatusColor(report.status)
                        )}>
                          {report.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>{report.format.toUpperCase()} • {report.frequency}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>{report.recipients.length} recipients</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Next: {report.nextSend.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <StatusIcon className={cn('w-5 h-5', 
                        report.status === 'active' ? 'text-green-500' :
                        report.status === 'paused' ? 'text-yellow-500' : 'text-red-500'
                      )} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {scheduledReports.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Reports</h4>
              <p className="text-gray-600 mb-4">
                Set up automated reports to stay informed about your costs and usage.
              </p>
              <Button onClick={() => setShowScheduleModal(true)}>
                Create First Report
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Export Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Export Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
            onClick={() => {
              setSelectedFormat('csv');
              setSelectedTimeRange('24h');
              handleExport();
            }}
          >
            <Table className="w-4 h-4" />
            <span>Daily CSV</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
            onClick={() => {
              setSelectedFormat('pdf');
              setSelectedTimeRange('7d');
              handleExport();
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Weekly Report</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
            onClick={() => {
              setSelectedFormat('excel');
              setSelectedTimeRange('30d');
              handleExport();
            }}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Monthly Analysis</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportingFeatures;