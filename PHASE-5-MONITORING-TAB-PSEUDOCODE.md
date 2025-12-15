# PHASE 5 - MONITORING TAB PSEUDOCODE
## Complete Implementation Blueprint

**Date:** 2025-10-12
**Phase:** SPARC Pseudocode Phase
**Objective:** Provide detailed pseudocode for all 10 Monitoring Tab components

---

## Table of Contents
1. [MonitoringApiService.ts](#1-monitoringapiservicets)
2. [MonitoringTab.tsx](#2-monitoringtabtsx)
3. [useMonitoringData.ts](#3-usemonitoringdatats)
4. [HealthStatusCard.tsx](#4-healthstatuscardtsx)
5. [SystemMetricsGrid.tsx](#5-systemmetricsgridtsx)
6. [MetricCard.tsx](#6-metriccardtsx)
7. [MonitoringCharts.tsx](#7-monitoringchartstsx)
8. [AlertsPanel.tsx](#8-alertspaneltsx)
9. [AlertCard.tsx](#9-alertcardtsx)
10. [RefreshControls.tsx](#10-refreshcontrolstsx)

---

## 1. MonitoringApiService.ts

```typescript
COMPONENT: MonitoringApiService
FILE: /workspaces/agent-feed/frontend/src/services/MonitoringApiService.ts
PURPOSE: Centralized API wrapper for all monitoring endpoints

IMPORTS:
  - axios from 'axios'
  - type { HealthStatus, SystemMetrics, Alert, AlertStats } from '../types/monitoring'

INTERFACES:
  interface MonitoringApiConfig {
    baseURL: string
    timeout: number
    retryAttempts: number
    retryDelay: number
  }

  interface MetricsResponse {
    timestamp: number
    system: SystemMetrics
    health: HealthStatus
  }

  interface AlertsResponse {
    alerts: Alert[]
    total: number
    page: number
    limit: number
    totalPages: number
    stats: AlertStats
  }

  interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy'
    version: string
    uptime: number
    timestamp: number
    checks: {
      database: { status: string; responseTime: number }
      memory: { status: string; usage: number }
      cpu: { status: string; usage: number }
    }
  }

CONSTANTS:
  DEFAULT_CONFIG = {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  }

  API_ENDPOINTS = {
    HEALTH: '/api/monitoring/health',
    METRICS: '/api/monitoring/metrics',
    ALERTS: '/api/monitoring/alerts',
    ALERTS_HISTORY: '/api/monitoring/alerts/history',
    STATS: '/api/monitoring/stats'
  }

CLASS: MonitoringApiService

  PRIVATE_MEMBERS:
    - config: MonitoringApiConfig
    - axiosInstance: AxiosInstance
    - requestCache: Map<string, { data: any, timestamp: number }>
    - CACHE_TTL = 5000 // 5 seconds

  CONSTRUCTOR(config?: Partial<MonitoringApiConfig>):
    STEP 1: Merge provided config with defaults
      this.config = { ...DEFAULT_CONFIG, ...config }

    STEP 2: Create axios instance with interceptors
      this.axiosInstance = axios.create({
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        headers: { 'Content-Type': 'application/json' }
      })

    STEP 3: Setup request interceptor
      this.axiosInstance.interceptors.request.use(
        (config) => {
          // Add timestamp to requests
          config.metadata = { startTime: Date.now() }
          RETURN config
        }
      )

    STEP 4: Setup response interceptor for retries
      this.axiosInstance.interceptors.response.use(
        (response) => {
          // Log response time
          const duration = Date.now() - response.config.metadata.startTime
          console.log(`API call to ${response.config.url} took ${duration}ms`)
          RETURN response
        },
        (error) => this.handleRetry(error)
      )

    STEP 5: Initialize cache
      this.requestCache = new Map()

    STEP 6: Start cache cleanup interval
      setInterval(() => this.cleanupCache(), 60000) // Every minute

  PRIVATE METHOD handleRetry(error: AxiosError):
    IF error.config.retryCount is undefined:
      error.config.retryCount = 0

    IF error.config.retryCount < this.config.retryAttempts:
      INCREMENT error.config.retryCount

      CALCULATE delay = this.config.retryDelay * Math.pow(2, error.config.retryCount - 1)

      console.log(`Retrying request (attempt ${error.config.retryCount}/${this.config.retryAttempts})`)

      RETURN new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.axiosInstance.request(error.config))
        }, delay)
      })

    RETURN Promise.reject(error)

  PRIVATE METHOD getCacheKey(url: string, params?: any): string
    RETURN params ? `${url}?${JSON.stringify(params)}` : url

  PRIVATE METHOD getCachedData<T>(cacheKey: string): T | null
    IF this.requestCache.has(cacheKey):
      const cached = this.requestCache.get(cacheKey)

      IF Date.now() - cached.timestamp < this.CACHE_TTL:
        console.log(`Cache hit for ${cacheKey}`)
        RETURN cached.data as T
      ELSE:
        // Expired, remove from cache
        this.requestCache.delete(cacheKey)

    RETURN null

  PRIVATE METHOD setCachedData(cacheKey: string, data: any): void
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

  PRIVATE METHOD cleanupCache(): void
    const now = Date.now()

    FOR EACH [key, value] OF this.requestCache.entries():
      IF now - value.timestamp > this.CACHE_TTL:
        this.requestCache.delete(key)

  PUBLIC METHOD async getHealth(): Promise<HealthCheckResponse>
    TRY:
      STEP 1: Check cache first
        const cacheKey = this.getCacheKey(API_ENDPOINTS.HEALTH)
        const cached = this.getCachedData<HealthCheckResponse>(cacheKey)

        IF cached:
          RETURN cached

      STEP 2: Make API request
        const response = await this.axiosInstance.get<HealthCheckResponse>(
          API_ENDPOINTS.HEALTH
        )

      STEP 3: Validate response data
        IF NOT response.data OR NOT response.data.status:
          THROW new Error('Invalid health check response')

      STEP 4: Cache the response
        this.setCachedData(cacheKey, response.data)

      STEP 5: Return data
        RETURN response.data

    CATCH error:
      console.error('Health check failed:', error)

      IF axios.isAxiosError(error) AND error.response:
        // Server returned error response
        THROW new Error(`Health check failed: ${error.response.status}`)
      ELSE IF error.code === 'ECONNABORTED':
        // Timeout
        THROW new Error('Health check timed out')
      ELSE:
        // Network or other error
        THROW new Error('Health check failed: Network error')

  PUBLIC METHOD async getMetrics(type?: string): Promise<MetricsResponse>
    TRY:
      STEP 1: Build request parameters
        const params = type ? { type } : undefined

      STEP 2: Check cache
        const cacheKey = this.getCacheKey(API_ENDPOINTS.METRICS, params)
        const cached = this.getCachedData<MetricsResponse>(cacheKey)

        IF cached:
          RETURN cached

      STEP 3: Make API request
        const response = await this.axiosInstance.get<MetricsResponse>(
          API_ENDPOINTS.METRICS,
          { params }
        )

      STEP 4: Validate response
        IF NOT response.data OR NOT response.data.timestamp:
          THROW new Error('Invalid metrics response')

      STEP 5: Cache and return
        this.setCachedData(cacheKey, response.data)
        RETURN response.data

    CATCH error:
      console.error('Metrics fetch failed:', error)
      THROW this.formatError(error, 'Failed to fetch metrics')

  PUBLIC METHOD async getAlerts(options?: {
    severity?: string
    acknowledged?: boolean
    page?: number
    limit?: number
  }): Promise<AlertsResponse>
    TRY:
      STEP 1: Build query parameters
        const params = {
          page: options?.page || 1,
          limit: options?.limit || 50,
          ...(options?.severity && { severity: options.severity }),
          ...(options?.acknowledged !== undefined && {
            acknowledged: options.acknowledged.toString()
          })
        }

      STEP 2: Check cache
        const cacheKey = this.getCacheKey(API_ENDPOINTS.ALERTS, params)
        const cached = this.getCachedData<AlertsResponse>(cacheKey)

        IF cached:
          RETURN cached

      STEP 3: Make API request
        const response = await this.axiosInstance.get<AlertsResponse>(
          API_ENDPOINTS.ALERTS,
          { params }
        )

      STEP 4: Validate response
        IF NOT response.data OR NOT Array.isArray(response.data.alerts):
          THROW new Error('Invalid alerts response')

      STEP 5: Cache and return
        this.setCachedData(cacheKey, response.data)
        RETURN response.data

    CATCH error:
      console.error('Alerts fetch failed:', error)
      THROW this.formatError(error, 'Failed to fetch alerts')

  PUBLIC METHOD async getHistoricalStats(
    timeRange: string = '24h'
  ): Promise<{ stats: any[] }>
    TRY:
      STEP 1: Build parameters
        const params = { timeRange }

      STEP 2: Check cache (longer TTL for historical data)
        const cacheKey = this.getCacheKey(API_ENDPOINTS.STATS, params)
        const cached = this.getCachedData<{ stats: any[] }>(cacheKey)

        IF cached:
          RETURN cached

      STEP 3: Make API request
        const response = await this.axiosInstance.get(
          API_ENDPOINTS.STATS,
          { params }
        )

      STEP 4: Validate response
        IF NOT response.data OR NOT Array.isArray(response.data.stats):
          THROW new Error('Invalid stats response')

      STEP 5: Cache with longer TTL and return
        this.setCachedData(cacheKey, response.data)
        RETURN response.data

    CATCH error:
      console.error('Historical stats fetch failed:', error)
      THROW this.formatError(error, 'Failed to fetch historical stats')

  PUBLIC METHOD async acknowledgeAlert(alertId: string): Promise<void>
    TRY:
      STEP 1: Make POST request
        await this.axiosInstance.post(
          `${API_ENDPOINTS.ALERTS}/${alertId}/acknowledge`
        )

      STEP 2: Clear alerts cache to force refresh
        this.clearAlertsCache()

    CATCH error:
      console.error('Alert acknowledgment failed:', error)
      THROW this.formatError(error, 'Failed to acknowledge alert')

  PUBLIC METHOD clearCache(): void
    this.requestCache.clear()
    console.log('API cache cleared')

  PUBLIC METHOD clearAlertsCache(): void
    FOR EACH key OF this.requestCache.keys():
      IF key.includes(API_ENDPOINTS.ALERTS):
        this.requestCache.delete(key)

  PRIVATE METHOD formatError(error: any, defaultMessage: string): Error
    IF axios.isAxiosError(error):
      IF error.response:
        RETURN new Error(`${defaultMessage}: ${error.response.status} - ${error.response.data?.error || error.message}`)
      ELSE IF error.request:
        RETURN new Error(`${defaultMessage}: No response from server`)
      ELSE:
        RETURN new Error(`${defaultMessage}: ${error.message}`)

    RETURN new Error(defaultMessage)

// Export singleton instance
EXPORT const monitoringApi = new MonitoringApiService()
EXPORT default MonitoringApiService
```

---

## 2. MonitoringTab.tsx

```typescript
COMPONENT: MonitoringTab
FILE: /workspaces/agent-feed/frontend/src/components/MonitoringTab.tsx
PURPOSE: Main monitoring dashboard component with sub-tabs

IMPORTS:
  - React, { useState, useCallback } from 'react'
  - { Activity, TrendingUp, AlertTriangle, Settings } from 'lucide-react'
  - { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
  - { ErrorBoundary } from 'react-error-boundary'
  - HealthStatusCard from './HealthStatusCard'
  - SystemMetricsGrid from './SystemMetricsGrid'
  - MonitoringCharts from './MonitoringCharts'
  - AlertsPanel from './AlertsPanel'
  - RefreshControls from './RefreshControls'
  - useMonitoringData from '../hooks/useMonitoringData'

INTERFACES:
  interface MonitoringTabProps {
    className?: string
    defaultTab?: string
    onTabChange?: (tab: string) => void
  }

CONSTANTS:
  MONITORING_TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'metrics', label: 'Metrics', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ]

  DEFAULT_REFRESH_INTERVAL = 10000 // 10 seconds
  STORAGE_KEY_PREFIX = 'monitoring_tab_'

COMPONENT: MonitoringTab

  FUNCTION MonitoringTab(props: MonitoringTabProps):
    DESTRUCTURE props:
      - className = ''
      - defaultTab = 'overview'
      - onTabChange

    // STATE MANAGEMENT
    INITIALIZE STATE:
      - [activeTab, setActiveTab] = useState(() => {
          // Load from localStorage or URL parameter
          IF typeof window !== 'undefined':
            const urlParams = new URLSearchParams(window.location.search)
            const urlTab = urlParams.get('monitoringTab')

            IF urlTab AND MONITORING_TABS.some(t => t.id === urlTab):
              RETURN urlTab

            const storedTab = localStorage.getItem(`${STORAGE_KEY_PREFIX}active_tab`)
            IF storedTab AND MONITORING_TABS.some(t => t.id === storedTab):
              RETURN storedTab

          RETURN defaultTab
        })

      - [autoRefresh, setAutoRefresh] = useState(true)
      - [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL)
      - [lastRefreshTime, setLastRefreshTime] = useState(Date.now())

    // CUSTOM HOOK FOR DATA FETCHING
    DESTRUCTURE useMonitoringData hook:
      const {
        health,
        metrics,
        alerts,
        stats,
        loading,
        error,
        refetch,
        clearError
      } = useMonitoringData({
        autoRefresh,
        refreshInterval,
        onRefresh: () => setLastRefreshTime(Date.now())
      })

    // TAB CHANGE HANDLER
    FUNCTION handleTabChange(newTab: string):
      STEP 1: Update state
        setActiveTab(newTab)

      STEP 2: Persist to localStorage
        IF typeof window !== 'undefined':
          localStorage.setItem(`${STORAGE_KEY_PREFIX}active_tab`, newTab)

      STEP 3: Update URL parameter without reload
        const url = new URL(window.location.href)
        url.searchParams.set('monitoringTab', newTab)
        window.history.replaceState({}, '', url.toString())

      STEP 4: Call callback if provided
        IF onTabChange:
          onTabChange(newTab)

      STEP 5: Clear any existing errors
        clearError()

    // MANUAL REFRESH HANDLER
    CALLBACK handleManualRefresh = useCallback(async ():
      TRY:
        STEP 1: Update last refresh time
          setLastRefreshTime(Date.now())

        STEP 2: Trigger refetch
          await refetch()

        STEP 3: Show success notification (optional)
          console.log('✅ Monitoring data refreshed')

      CATCH error:
        console.error('❌ Manual refresh failed:', error)
    , [refetch])

    // AUTO-REFRESH TOGGLE HANDLER
    CALLBACK handleAutoRefreshToggle = useCallback((enabled: boolean):
      STEP 1: Update state
        setAutoRefresh(enabled)

      STEP 2: Persist to localStorage
        localStorage.setItem(`${STORAGE_KEY_PREFIX}auto_refresh`, enabled.toString())

      STEP 3: If enabling, trigger immediate refresh
        IF enabled:
          handleManualRefresh()
    , [handleManualRefresh])

    // REFRESH INTERVAL CHANGE HANDLER
    CALLBACK handleRefreshIntervalChange = useCallback((interval: number):
      STEP 1: Validate interval (min 5 seconds)
        IF interval < 5000:
          console.warn('Minimum refresh interval is 5 seconds')
          RETURN

      STEP 2: Update state
        setRefreshInterval(interval)

      STEP 3: Persist to localStorage
        localStorage.setItem(`${STORAGE_KEY_PREFIX}refresh_interval`, interval.toString())
    , [])

    // ERROR BOUNDARY FALLBACK
    FUNCTION ErrorFallback({ error, resetErrorBoundary }):
      RETURN (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Monitoring Error
            </h3>
          </div>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )

    // LOADING STATE
    IF loading AND NOT health AND NOT metrics:
      RETURN (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading monitoring data...</p>
          </div>
        </div>
      )

    // RENDER
    RETURN (
      <div className={`space-y-6 ${className}`}>
        {/* Header with Refresh Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              System Monitoring
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time system health and performance metrics
            </p>
          </div>

          <RefreshControls
            autoRefresh={autoRefresh}
            refreshInterval={refreshInterval}
            lastRefreshTime={lastRefreshTime}
            loading={loading}
            onAutoRefreshToggle={handleAutoRefreshToggle}
            onManualRefresh={handleManualRefresh}
            onRefreshIntervalChange={handleRefreshIntervalChange}
          />
        </div>

        {/* Error Display (non-blocking) */}
        {error AND (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800 dark:text-yellow-200">
                {error.message}
              </p>
              <button
                onClick={clearError}
                className="ml-auto text-yellow-600 hover:text-yellow-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              {MONITORING_TABS.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2"
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                {/* Health Status Card */}
                <HealthStatusCard health={health} loading={loading} />

                {/* System Metrics Grid */}
                <SystemMetricsGrid metrics={metrics} loading={loading} />

                {/* Recent Alerts Summary */}
                {alerts AND alerts.length > 0 AND (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                          {alerts.filter(a => !a.acknowledged).length} Active Alerts
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('alerts')}
                        className="text-sm text-yellow-600 hover:text-yellow-800"
                      >
                        View All →
                      </button>
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>

            {/* METRICS TAB */}
            <TabsContent value="metrics" className="space-y-6">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                {/* Current Metrics */}
                <SystemMetricsGrid metrics={metrics} loading={loading} detailed />

                {/* Historical Charts */}
                <MonitoringCharts
                  stats={stats}
                  timeRange="24h"
                  loading={loading}
                />
              </ErrorBoundary>
            </TabsContent>

            {/* ALERTS TAB */}
            <TabsContent value="alerts" className="space-y-6">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AlertsPanel
                  alerts={alerts}
                  loading={loading}
                  onAcknowledge={(alertId) => {
                    // Trigger refetch after acknowledgment
                    handleManualRefresh()
                  }}
                />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </ErrorBoundary>
      </div>
    )

EXPORT default MonitoringTab
```

---

## 3. useMonitoringData.ts

```typescript
COMPONENT: useMonitoringData
FILE: /workspaces/agent-feed/frontend/src/hooks/useMonitoringData.ts
PURPOSE: Custom React hook for fetching and managing monitoring data

IMPORTS:
  - { useState, useEffect, useCallback, useRef } from 'react'
  - { monitoringApi } from '../services/MonitoringApiService'
  - type { HealthCheckResponse, SystemMetrics, Alert } from '../types/monitoring'

INTERFACES:
  interface UseMonitoringDataOptions {
    autoRefresh?: boolean
    refreshInterval?: number
    onRefresh?: () => void
    onError?: (error: Error) => void
  }

  interface UseMonitoringDataReturn {
    health: HealthCheckResponse | null
    metrics: SystemMetrics | null
    alerts: Alert[]
    stats: any[]
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
    clearError: () => void
  }

CUSTOM HOOK: useMonitoringData

  FUNCTION useMonitoringData(options: UseMonitoringDataOptions = {}):
    DESTRUCTURE options:
      - autoRefresh = false
      - refreshInterval = 10000
      - onRefresh
      - onError

    // STATE MANAGEMENT
    INITIALIZE STATE:
      - [health, setHealth] = useState<HealthCheckResponse | null>(null)
      - [metrics, setMetrics] = useState<SystemMetrics | null>(null)
      - [alerts, setAlerts] = useState<Alert[]>([])
      - [stats, setStats] = useState<any[]>([])
      - [loading, setLoading] = useState(true)
      - [error, setError] = useState<Error | null>(null)

    // REF FOR TRACKING MOUNT STATE
    const isMounted = useRef(true)
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // FETCH ALL MONITORING DATA
    CALLBACK fetchMonitoringData = useCallback(async ():
      // Abort any pending requests
      IF abortControllerRef.current:
        abortControllerRef.current.abort()

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      TRY:
        STEP 1: Set loading state
          setLoading(true)
          setError(null)

        STEP 2: Fetch all data in parallel with Promise.allSettled
          const [healthResult, metricsResult, alertsResult, statsResult] =
            await Promise.allSettled([
              monitoringApi.getHealth(),
              monitoringApi.getMetrics(),
              monitoringApi.getAlerts({ limit: 100 }),
              monitoringApi.getHistoricalStats('24h')
            ])

        STEP 3: Process results (only if still mounted)
          IF NOT isMounted.current:
            RETURN

        // Handle health data
        IF healthResult.status === 'fulfilled':
          setHealth(healthResult.value)
        ELSE:
          console.warn('Health check failed:', healthResult.reason)
          // Set fallback health data
          setHealth({
            status: 'unknown',
            version: '0.0.0',
            uptime: 0,
            timestamp: Date.now(),
            checks: {
              database: { status: 'unknown', responseTime: 0 },
              memory: { status: 'unknown', usage: 0 },
              cpu: { status: 'unknown', usage: 0 }
            }
          })

        // Handle metrics data
        IF metricsResult.status === 'fulfilled':
          setMetrics(metricsResult.value.system)
        ELSE:
          console.warn('Metrics fetch failed:', metricsResult.reason)
          setMetrics(null)

        // Handle alerts data
        IF alertsResult.status === 'fulfilled':
          setAlerts(alertsResult.value.alerts)
        ELSE:
          console.warn('Alerts fetch failed:', alertsResult.reason)
          setAlerts([])

        // Handle stats data
        IF statsResult.status === 'fulfilled':
          setStats(statsResult.value.stats)
        ELSE:
          console.warn('Stats fetch failed:', statsResult.reason)
          setStats([])

        STEP 4: Check if all requests failed
          const allFailed = [healthResult, metricsResult, alertsResult, statsResult]
            .every(result => result.status === 'rejected')

          IF allFailed:
            THROW new Error('All monitoring endpoints failed')

        STEP 5: Call onRefresh callback
          IF onRefresh:
            onRefresh()

      CATCH error:
        IF NOT isMounted.current:
          RETURN

        console.error('❌ Monitoring data fetch failed:', error)

        const errorObj = error instanceof Error ? error : new Error('Failed to fetch monitoring data')
        setError(errorObj)

        IF onError:
          onError(errorObj)

      FINALLY:
        IF isMounted.current:
          setLoading(false)

        abortControllerRef.current = null
    , [onRefresh, onError])

    // MANUAL REFETCH FUNCTION
    CALLBACK refetch = useCallback(async ():
      // Clear any existing timer
      IF refreshTimerRef.current:
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null

      // Fetch data
      await fetchMonitoringData()

      // Restart auto-refresh timer if enabled
      IF autoRefresh AND isMounted.current:
        refreshTimerRef.current = setTimeout(() => {
          fetchMonitoringData()
        }, refreshInterval)
    , [fetchMonitoringData, autoRefresh, refreshInterval])

    // CLEAR ERROR FUNCTION
    CALLBACK clearError = useCallback(():
      setError(null)
    , [])

    // INITIAL DATA FETCH
    EFFECT on mount:
      DEPENDENCIES: [fetchMonitoringData]

      EXECUTE:
        fetchMonitoringData()

      CLEANUP:
        // Component unmounting - abort requests
        IF abortControllerRef.current:
          abortControllerRef.current.abort()

    // AUTO-REFRESH EFFECT
    EFFECT on autoRefresh changes:
      DEPENDENCIES: [autoRefresh, refreshInterval, fetchMonitoringData]

      EXECUTE:
        IF autoRefresh:
          STEP 1: Clear any existing timer
            IF refreshTimerRef.current:
              clearTimeout(refreshTimerRef.current)

          STEP 2: Setup new interval
            refreshTimerRef.current = setInterval(() => {
              fetchMonitoringData()
            }, refreshInterval)

          console.log(`✅ Auto-refresh enabled (${refreshInterval}ms interval)`)
        ELSE:
          // Clear timer when auto-refresh is disabled
          IF refreshTimerRef.current:
            clearTimeout(refreshTimerRef.current)
            refreshTimerRef.current = null

          console.log('⏸️ Auto-refresh disabled')

      CLEANUP:
        IF refreshTimerRef.current:
          clearTimeout(refreshTimerRef.current)
          refreshTimerRef.current = null

    // CLEANUP ON UNMOUNT
    EFFECT on unmount:
      DEPENDENCIES: []

      CLEANUP:
        isMounted.current = false

        IF refreshTimerRef.current:
          clearTimeout(refreshTimerRef.current)

        IF abortControllerRef.current:
          abortControllerRef.current.abort()

    // RETURN HOOK DATA
    RETURN {
      health,
      metrics,
      alerts,
      stats,
      loading,
      error,
      refetch,
      clearError
    }

EXPORT default useMonitoringData
```

---

## 4. HealthStatusCard.tsx

```typescript
COMPONENT: HealthStatusCard
FILE: /workspaces/agent-feed/frontend/src/components/HealthStatusCard.tsx
PURPOSE: Display system health status with visual indicators

IMPORTS:
  - React from 'react'
  - { CheckCircle, AlertTriangle, XCircle, Clock, Database, Cpu, HardDrive } from 'lucide-react'
  - type { HealthCheckResponse } from '../types/monitoring'

INTERFACES:
  interface HealthStatusCardProps {
    health: HealthCheckResponse | null
    loading: boolean
    className?: string
  }

  interface StatusIndicatorProps {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
    label: string
  }

CONSTANTS:
  STATUS_CONFIG = {
    healthy: {
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      icon: CheckCircle,
      label: 'Healthy'
    },
    degraded: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      icon: AlertTriangle,
      label: 'Degraded'
    },
    unhealthy: {
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      icon: XCircle,
      label: 'Unhealthy'
    },
    unknown: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-700',
      icon: AlertTriangle,
      label: 'Unknown'
    }
  }

HELPER COMPONENT: StatusIndicator
  FUNCTION StatusIndicator({ status, label }: StatusIndicatorProps):
    const config = STATUS_CONFIG[status]
    const Icon = config.icon

    RETURN (
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}>
        <Icon className={`w-4 h-4 ${config.color} mr-2`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    )

HELPER FUNCTION: formatUptime
  FUNCTION formatUptime(seconds: number): string
    IF seconds < 60:
      RETURN `${Math.round(seconds)}s`
    ELSE IF seconds < 3600:
      RETURN `${Math.round(seconds / 60)}m`
    ELSE IF seconds < 86400:
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.round((seconds % 3600) / 60)
      RETURN `${hours}h ${minutes}m`
    ELSE:
      const days = Math.floor(seconds / 86400)
      const hours = Math.round((seconds % 86400) / 3600)
      RETURN `${days}d ${hours}h`

HELPER FUNCTION: getCheckStatusColor
  FUNCTION getCheckStatusColor(status: string): string
    SWITCH status:
      CASE 'healthy':
        RETURN 'text-green-600'
      CASE 'degraded':
        RETURN 'text-yellow-600'
      CASE 'unhealthy':
        RETURN 'text-red-600'
      DEFAULT:
        RETURN 'text-gray-600'

MAIN COMPONENT: HealthStatusCard

  FUNCTION HealthStatusCard({ health, loading, className = '' }: HealthStatusCardProps):

    // LOADING STATE
    IF loading AND NOT health:
      RETURN (
        <div className={`p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      )

    // NO DATA STATE
    IF NOT health:
      RETURN (
        <div className={`p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
          <div className="text-center text-gray-500 dark:text-gray-400">
            No health data available
          </div>
        </div>
      )

    // EXTRACT DATA
    const status = health.status || 'unknown'
    const config = STATUS_CONFIG[status]

    // RENDER
    RETURN (
      <div className={`p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            System Health
          </h3>
          <StatusIndicator status={status} label={config.label} />
        </div>

        {/* Main Status Card */}
        <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Version */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Version</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {health.version}
                </p>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatUptime(health.uptime)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Last Check</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Health Checks */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Component Status
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Check */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Database
                  </span>
                </div>
                <CheckCircle
                  className={`w-4 h-4 ${getCheckStatusColor(health.checks.database.status)}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {health.checks.database.responseTime}ms
                </span>
              </div>
            </div>

            {/* Memory Check */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Memory
                  </span>
                </div>
                <CheckCircle
                  className={`w-4 h-4 ${getCheckStatusColor(health.checks.memory.status)}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Usage</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {health.checks.memory.usage}%
                </span>
              </div>
            </div>

            {/* CPU Check */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    CPU
                  </span>
                </div>
                <CheckCircle
                  className={`w-4 h-4 ${getCheckStatusColor(health.checks.cpu.status)}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Usage</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {health.checks.cpu.usage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

EXPORT default HealthStatusCard
```

---

## 5. SystemMetricsGrid.tsx

```typescript
COMPONENT: SystemMetricsGrid
FILE: /workspaces/agent-feed/frontend/src/components/SystemMetricsGrid.tsx
PURPOSE: Display system metrics in a responsive grid

IMPORTS:
  - React from 'react'
  - MetricCard from './MetricCard'
  - { Cpu, HardDrive, MemoryStick, Network, Activity, Clock } from 'lucide-react'
  - type { SystemMetrics } from '../types/monitoring'

INTERFACES:
  interface SystemMetricsGridProps {
    metrics: SystemMetrics | null
    loading: boolean
    detailed?: boolean
    className?: string
  }

  interface MetricDefinition {
    id: string
    label: string
    icon: any
    getValue: (metrics: SystemMetrics) => number
    unit: string
    thresholds: {
      warning: number
      critical: number
    }
    format?: (value: number) => string
  }

CONSTANTS:
  METRIC_DEFINITIONS: MetricDefinition[] = [
    {
      id: 'cpu',
      label: 'CPU Usage',
      icon: Cpu,
      getValue: (m) => m.cpu_usage || 0,
      unit: '%',
      thresholds: { warning: 70, critical: 90 }
    },
    {
      id: 'memory',
      label: 'Memory Usage',
      icon: MemoryStick,
      getValue: (m) => m.memory_usage || 0,
      unit: '%',
      thresholds: { warning: 75, critical: 90 }
    },
    {
      id: 'disk',
      label: 'Disk Usage',
      icon: HardDrive,
      getValue: (m) => m.disk_usage || 0,
      unit: '%',
      thresholds: { warning: 80, critical: 95 }
    },
    {
      id: 'network_in',
      label: 'Network In',
      icon: Network,
      getValue: (m) => m.network_io?.bytes_in || 0,
      unit: 'MB/s',
      thresholds: { warning: 80, critical: 95 },
      format: (value) => (value / 1048576).toFixed(2)
    },
    {
      id: 'response_time',
      label: 'Response Time',
      icon: Clock,
      getValue: (m) => m.response_time || 0,
      unit: 'ms',
      thresholds: { warning: 500, critical: 1000 }
    },
    {
      id: 'throughput',
      label: 'Throughput',
      icon: Activity,
      getValue: (m) => m.throughput || 0,
      unit: 'req/s',
      thresholds: { warning: 200, critical: 500 }
    }
  ]

  DETAILED_METRICS: MetricDefinition[] = [
    {
      id: 'error_rate',
      label: 'Error Rate',
      icon: AlertTriangle,
      getValue: (m) => m.error_rate || 0,
      unit: '%',
      thresholds: { warning: 1, critical: 5 }
    },
    {
      id: 'active_connections',
      label: 'Active Connections',
      icon: Users,
      getValue: (m) => m.active_connections || 0,
      unit: '',
      thresholds: { warning: 100, critical: 200 }
    },
    {
      id: 'queue_depth',
      label: 'Queue Depth',
      icon: List,
      getValue: (m) => m.queue_depth || 0,
      unit: '',
      thresholds: { warning: 100, critical: 500 }
    },
    {
      id: 'cache_hit_rate',
      label: 'Cache Hit Rate',
      icon: Database,
      getValue: (m) => (m.cache_hit_rate || 0) * 100,
      unit: '%',
      thresholds: { warning: 60, critical: 40 },
      // Inverted thresholds (lower is worse for cache hit rate)
      invertThresholds: true
    }
  ]

HELPER FUNCTION: getMetricStatus
  FUNCTION getMetricStatus(
    value: number,
    thresholds: { warning: number; critical: number },
    inverted: boolean = false
  ): 'normal' | 'warning' | 'critical'
    IF inverted:
      // For metrics where lower is worse (e.g., cache hit rate)
      IF value <= thresholds.critical:
        RETURN 'critical'
      ELSE IF value <= thresholds.warning:
        RETURN 'warning'
      ELSE:
        RETURN 'normal'
    ELSE:
      // For metrics where higher is worse
      IF value >= thresholds.critical:
        RETURN 'critical'
      ELSE IF value >= thresholds.warning:
        RETURN 'warning'
      ELSE:
        RETURN 'normal'

MAIN COMPONENT: SystemMetricsGrid

  FUNCTION SystemMetricsGrid({
    metrics,
    loading,
    detailed = false,
    className = ''
  }: SystemMetricsGridProps):

    // DETERMINE WHICH METRICS TO SHOW
    const metricsToShow = detailed
      ? [...METRIC_DEFINITIONS, ...DETAILED_METRICS]
      : METRIC_DEFINITIONS

    // LOADING STATE
    IF loading AND NOT metrics:
      RETURN (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
          {metricsToShow.map((metric) => (
            <div
              key={metric.id}
              className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )

    // NO DATA STATE
    IF NOT metrics:
      RETURN (
        <div className={`p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
          <div className="text-center text-gray-500 dark:text-gray-400">
            No metrics data available
          </div>
        </div>
      )

    // RENDER METRICS GRID
    RETURN (
      <div className={className}>
        {/* Grid Header (optional for detailed view) */}
        {detailed AND (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              System Metrics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time system resource utilization
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricsToShow.map((metric) => {
            // Get current value
            const value = metric.getValue(metrics)

            // Format value if formatter provided
            const displayValue = metric.format
              ? metric.format(value)
              : value.toFixed(metric.unit === '%' ? 1 : 0)

            // Determine status
            const status = getMetricStatus(
              value,
              metric.thresholds,
              metric.invertThresholds || false
            )

            // Calculate percentage for progress bar
            // For inverted metrics, use value directly as percentage
            const percentage = metric.unit === '%'
              ? value
              : metric.invertThresholds
              ? value
              : Math.min((value / metric.thresholds.critical) * 100, 100)

            RETURN (
              <MetricCard
                key={metric.id}
                label={metric.label}
                value={displayValue}
                unit={metric.unit}
                icon={metric.icon}
                status={status}
                percentage={percentage}
                trend={detailed ? calculateTrend(metric.id) : undefined}
              />
            )
          })}
        </div>

        {/* Additional Details (detailed view only) */}
        {detailed AND (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Performance Summary
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Server ID: {metrics.server_id || 'Unknown'} •
                  Last Update: {new Date(metrics.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )

HELPER FUNCTION: calculateTrend (placeholder for future enhancement)
  FUNCTION calculateTrend(metricId: string): number | undefined
    // TODO: Calculate trend based on historical data
    // For now, return undefined to skip trend display
    RETURN undefined

EXPORT default SystemMetricsGrid
```

---

## 6. MetricCard.tsx

```typescript
COMPONENT: MetricCard
FILE: /workspaces/agent-feed/frontend/src/components/MetricCard.tsx
PURPOSE: Reusable card component for displaying individual metrics

IMPORTS:
  - React from 'react'
  - { TrendingUp, TrendingDown, Minus } from 'lucide-react'
  - type { LucideIcon } from 'lucide-react'

INTERFACES:
  interface MetricCardProps {
    label: string
    value: string | number
    unit: string
    icon: LucideIcon
    status: 'normal' | 'warning' | 'critical'
    percentage?: number
    trend?: number
    className?: string
    onClick?: () => void
  }

CONSTANTS:
  STATUS_CONFIG = {
    normal: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      textColor: 'text-green-900 dark:text-green-100',
      iconColor: 'text-green-600',
      progressColor: 'bg-green-600'
    },
    warning: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      textColor: 'text-yellow-900 dark:text-yellow-100',
      iconColor: 'text-yellow-600',
      progressColor: 'bg-yellow-600'
    },
    critical: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-900 dark:text-red-100',
      iconColor: 'text-red-600',
      progressColor: 'bg-red-600'
    }
  }

HELPER FUNCTION: getTrendIcon
  FUNCTION getTrendIcon(trend: number | undefined):
    IF trend === undefined OR trend === 0:
      RETURN { Icon: Minus, color: 'text-gray-400' }
    ELSE IF trend > 0:
      RETURN { Icon: TrendingUp, color: 'text-red-500' }
    ELSE:
      RETURN { Icon: TrendingDown, color: 'text-green-500' }

HELPER FUNCTION: formatTrendValue
  FUNCTION formatTrendValue(trend: number | undefined): string
    IF trend === undefined:
      RETURN 'No change'
    ELSE:
      const sign = trend > 0 ? '+' : ''
      RETURN `${sign}${trend.toFixed(1)}%`

MAIN COMPONENT: MetricCard

  FUNCTION MetricCard({
    label,
    value,
    unit,
    icon: Icon,
    status,
    percentage,
    trend,
    className = '',
    onClick
  }: MetricCardProps):

    // GET STATUS CONFIG
    const config = STATUS_CONFIG[status]

    // GET TREND ICON
    const { Icon: TrendIcon, color: trendColor } = getTrendIcon(trend)

    // DETERMINE IF CARD IS CLICKABLE
    const isClickable = onClick !== undefined

    // RENDER
    RETURN (
      <div
        className={`
          p-4 rounded-lg border
          ${config.bgColor}
          ${config.borderColor}
          ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          ${className}
        `}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyPress={isClickable ? (e) => {
          IF e.key === 'Enter' OR e.key === ' ':
            onClick()
        } : undefined}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 bg-white dark:bg-gray-800 rounded-lg`}>
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          </div>

          {/* Trend Indicator (if provided) */}
          {trend !== undefined AND (
            <div className="flex items-center space-x-1">
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              <span className={`text-xs font-medium ${trendColor}`}>
                {formatTrendValue(trend)}
              </span>
            </div>
          )}
        </div>

        {/* Value Display */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-1">
            <span className={`text-2xl font-bold ${config.textColor}`}>
              {value}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {unit}
            </span>
          </div>
        </div>

        {/* Progress Bar (if percentage provided) */}
        {percentage !== undefined AND (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`${config.progressColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                {percentage.toFixed(1)}%
              </span>
              <span className={config.textColor}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* Status Indicator (no progress bar) */}
        {percentage === undefined AND (
          <div className={`text-xs font-medium ${config.textColor}`}>
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        )}
      </div>
    )

EXPORT default MetricCard
```

---

## 7. MonitoringCharts.tsx

```typescript
COMPONENT: MonitoringCharts
FILE: /workspaces/agent-feed/frontend/src/components/MonitoringCharts.tsx
PURPOSE: Display historical metrics using Chart.js line charts

IMPORTS:
  - React, { useMemo } from 'react'
  - { Line } from 'react-chartjs-2'
  - {
      Chart as ChartJS,
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend,
      Filler
    } from 'chart.js'
  - { Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

INTERFACES:
  interface MonitoringChartsProps {
    stats: any[]
    timeRange: string
    loading: boolean
    className?: string
  }

  interface ChartDataset {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    fill: boolean
    tension: number
  }

CONSTANTS:
  TIME_RANGE_OPTIONS = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ]

  CHART_COLORS = {
    cpu: {
      border: 'rgb(59, 130, 246)',
      background: 'rgba(59, 130, 246, 0.1)'
    },
    memory: {
      border: 'rgb(16, 185, 129)',
      background: 'rgba(16, 185, 129, 0.1)'
    },
    disk: {
      border: 'rgb(245, 158, 11)',
      background: 'rgba(245, 158, 11, 0.1)'
    },
    network: {
      border: 'rgb(139, 92, 246)',
      background: 'rgba(139, 92, 246, 0.1)'
    },
    responseTime: {
      border: 'rgb(236, 72, 153)',
      background: 'rgba(236, 72, 153, 0.1)'
    },
    throughput: {
      border: 'rgb(14, 165, 233)',
      background: 'rgba(14, 165, 233, 0.1)'
    }
  }

  DEFAULT_CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || ''
            IF label:
              label += ': '
            IF context.parsed.y !== null:
              label += context.parsed.y.toFixed(2)
            RETURN label
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value: any) {
            RETURN value.toFixed(0)
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }

HELPER FUNCTION: processStatsData
  FUNCTION processStatsData(stats: any[]): {
    labels: string[]
    datasets: { cpu: number[], memory: number[], disk: number[], responseTime: number[], throughput: number[] }
  }
    IF NOT stats OR stats.length === 0:
      RETURN {
        labels: [],
        datasets: { cpu: [], memory: [], disk: [], responseTime: [], throughput: [] }
      }

    // Sort by timestamp
    const sortedStats = [...stats].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Extract labels and data
    const labels = sortedStats.map(stat =>
      new Date(stat.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    )

    const datasets = {
      cpu: sortedStats.map(stat => stat.cpu_usage || 0),
      memory: sortedStats.map(stat => stat.memory_usage || 0),
      disk: sortedStats.map(stat => stat.disk_usage || 0),
      responseTime: sortedStats.map(stat => stat.response_time || 0),
      throughput: sortedStats.map(stat => stat.throughput || 0)
    }

    RETURN { labels, datasets }

HELPER FUNCTION: createChartData
  FUNCTION createChartData(
    labels: string[],
    dataPoints: number[],
    label: string,
    colorConfig: { border: string; background: string }
  ):
    RETURN {
      labels,
      datasets: [
        {
          label,
          data: dataPoints,
          borderColor: colorConfig.border,
          backgroundColor: colorConfig.background,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: colorConfig.border,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: colorConfig.border,
          pointHoverBorderColor: '#fff'
        }
      ]
    }

MAIN COMPONENT: MonitoringCharts

  FUNCTION MonitoringCharts({
    stats,
    timeRange,
    loading,
    className = ''
  }: MonitoringChartsProps):

    // PROCESS DATA
    const { labels, datasets } = useMemo(() =>
      processStatsData(stats),
      [stats]
    )

    // CREATE CHART DATASETS
    const cpuChartData = useMemo(() =>
      createChartData(labels, datasets.cpu, 'CPU Usage (%)', CHART_COLORS.cpu),
      [labels, datasets.cpu]
    )

    const memoryChartData = useMemo(() =>
      createChartData(labels, datasets.memory, 'Memory Usage (%)', CHART_COLORS.memory),
      [labels, datasets.memory]
    )

    const responseTimeChartData = useMemo(() =>
      createChartData(labels, datasets.responseTime, 'Response Time (ms)', CHART_COLORS.responseTime),
      [labels, datasets.responseTime]
    )

    const throughputChartData = useMemo(() =>
      createChartData(labels, datasets.throughput, 'Throughput (req/s)', CHART_COLORS.throughput),
      [labels, datasets.throughput]
    )

    // LOADING STATE
    IF loading AND stats.length === 0:
      RETURN (
        <div className={`space-y-6 ${className}`}>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      )

    // NO DATA STATE
    IF stats.length === 0:
      RETURN (
        <div className={`p-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Historical Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Historical metrics will appear here once data is collected
            </p>
          </div>
        </div>
      )

    // RENDER CHARTS
    RETURN (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Historical Metrics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              System performance over {TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)?.label || timeRange}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stats.length} data points
            </span>
          </div>
        </div>

        {/* CPU Usage Chart */}
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            CPU Usage
          </h4>
          <div className="h-64">
            <Line data={cpuChartData} options={DEFAULT_CHART_OPTIONS} />
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Memory Usage
          </h4>
          <div className="h-64">
            <Line data={memoryChartData} options={DEFAULT_CHART_OPTIONS} />
          </div>
        </div>

        {/* Combined Performance Chart */}
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Response Time & Throughput
          </h4>
          <div className="h-64">
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Response Time (ms)',
                    data: datasets.responseTime,
                    borderColor: CHART_COLORS.responseTime.border,
                    backgroundColor: CHART_COLORS.responseTime.background,
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.4
                  },
                  {
                    label: 'Throughput (req/s)',
                    data: datasets.throughput,
                    borderColor: CHART_COLORS.throughput.border,
                    backgroundColor: CHART_COLORS.throughput.background,
                    yAxisID: 'y1',
                    fill: true,
                    tension: 0.4
                  }
                ]
              }}
              options={{
                ...DEFAULT_CHART_OPTIONS,
                scales: {
                  ...DEFAULT_CHART_OPTIONS.scales,
                  y: {
                    ...DEFAULT_CHART_OPTIONS.scales.y,
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: {
                      display: true,
                      text: 'Response Time (ms)'
                    }
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                      display: true,
                      text: 'Throughput (req/s)'
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    )

EXPORT default MonitoringCharts
```

---

## 8. AlertsPanel.tsx

```typescript
COMPONENT: AlertsPanel
FILE: /workspaces/agent-feed/frontend/src/components/AlertsPanel.tsx
PURPOSE: Display and manage system alerts with filtering and pagination

IMPORTS:
  - React, { useState, useMemo } from 'react'
  - { AlertTriangle, Filter, Search, CheckCircle } from 'lucide-react'
  - AlertCard from './AlertCard'
  - type { Alert } from '../types/monitoring'

INTERFACES:
  interface AlertsPanelProps {
    alerts: Alert[]
    loading: boolean
    onAcknowledge: (alertId: string) => void
    className?: string
  }

  interface FilterState {
    severity: 'all' | 'critical' | 'warning' | 'info'
    acknowledged: 'all' | 'true' | 'false'
    searchTerm: string
  }

CONSTANTS:
  SEVERITY_OPTIONS = [
    { value: 'all', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' }
  ]

  ACKNOWLEDGED_OPTIONS = [
    { value: 'all', label: 'All Alerts' },
    { value: 'false', label: 'Active Only' },
    { value: 'true', label: 'Acknowledged' }
  ]

  ITEMS_PER_PAGE = 10

HELPER FUNCTION: filterAlerts
  FUNCTION filterAlerts(
    alerts: Alert[],
    filters: FilterState
  ): Alert[]
    RETURN alerts.filter(alert => {
      // Filter by severity
      IF filters.severity !== 'all' AND alert.severity !== filters.severity:
        RETURN false

      // Filter by acknowledged status
      IF filters.acknowledged === 'true' AND NOT alert.acknowledged:
        RETURN false
      IF filters.acknowledged === 'false' AND alert.acknowledged:
        RETURN false

      // Filter by search term
      IF filters.searchTerm:
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesTitle = alert.title?.toLowerCase().includes(searchLower)
        const matchesMessage = alert.message?.toLowerCase().includes(searchLower)

        IF NOT matchesTitle AND NOT matchesMessage:
          RETURN false

      RETURN true
    })

HELPER FUNCTION: getAlertStats
  FUNCTION getAlertStats(alerts: Alert[]):
    RETURN {
      total: alerts.length,
      active: alerts.filter(a => !a.acknowledged).length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length
    }

MAIN COMPONENT: AlertsPanel

  FUNCTION AlertsPanel({
    alerts,
    loading,
    onAcknowledge,
    className = ''
  }: AlertsPanelProps):

    // STATE MANAGEMENT
    INITIALIZE STATE:
      - [filters, setFilters] = useState<FilterState>({
          severity: 'all',
          acknowledged: 'false', // Default to active only
          searchTerm: ''
        })
      - [currentPage, setCurrentPage] = useState(1)
      - [expandedAlertId, setExpandedAlertId] = useState<string | null>(null)

    // FILTER AND PAGINATE ALERTS
    const filteredAlerts = useMemo(() =>
      filterAlerts(alerts, filters),
      [alerts, filters]
    )

    const paginatedAlerts = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      RETURN filteredAlerts.slice(startIndex, endIndex)
    }, [filteredAlerts, currentPage])

    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE)

    // GET ALERT STATISTICS
    const stats = useMemo(() =>
      getAlertStats(alerts),
      [alerts]
    )

    // HANDLE FILTER CHANGES
    FUNCTION handleFilterChange(key: keyof FilterState, value: any):
      setFilters(prev => ({ ...prev, [key]: value }))
      setCurrentPage(1) // Reset to first page

    // HANDLE PAGE CHANGE
    FUNCTION handlePageChange(newPage: number):
      IF newPage < 1 OR newPage > totalPages:
        RETURN
      setCurrentPage(newPage)
      // Scroll to top of alerts panel
      window.scrollTo({ top: 0, behavior: 'smooth' })

    // HANDLE ACKNOWLEDGE
    FUNCTION handleAcknowledge(alertId: string):
      onAcknowledge(alertId)
      // Optionally collapse expanded alert
      IF expandedAlertId === alertId:
        setExpandedAlertId(null)

    // HANDLE BULK ACKNOWLEDGE
    FUNCTION handleBulkAcknowledge():
      const activeAlerts = filteredAlerts.filter(a => !a.acknowledged)

      IF activeAlerts.length === 0:
        RETURN

      IF NOT confirm(`Acknowledge ${activeAlerts.length} active alerts?`):
        RETURN

      FOR EACH alert OF activeAlerts:
        onAcknowledge(alert.id)

    // LOADING STATE
    IF loading AND alerts.length === 0:
      RETURN (
        <div className={`p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )

    // RENDER
    RETURN (
      <div className={`space-y-6 ${className}`}>
        {/* Header with Stats */}
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              System Alerts
            </h3>
            {stats.active > 0 AND (
              <button
                onClick={handleBulkAcknowledge}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Acknowledge All</span>
              </button>
            )}
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              <p className="text-xs text-blue-600">Active</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-red-600">Critical</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              <p className="text-xs text-yellow-600">Warning</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.info}</p>
              <p className="text-xs text-green-600">Info</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Filters
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {SEVERITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.acknowledged}
                onChange={(e) => handleFilterChange('acknowledged', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {ACKNOWLEDGED_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {paginatedAlerts.length === 0 ? (
            <div className="p-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Alerts Found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filters.searchTerm || filters.severity !== 'all' || filters.acknowledged !== 'all'
                  ? 'Try adjusting your filters'
                  : 'System is running smoothly'}
              </p>
            </div>
          ) : (
            paginatedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                expanded={expandedAlertId === alert.id}
                onToggleExpand={() => setExpandedAlertId(
                  expandedAlertId === alert.id ? null : alert.id
                )}
                onAcknowledge={handleAcknowledge}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 AND (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAlerts.length)} of {filteredAlerts.length} alerts
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Previous
              </button>

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )

EXPORT default AlertsPanel
```

---

## 9. AlertCard.tsx

```typescript
COMPONENT: AlertCard
FILE: /workspaces/agent-feed/frontend/src/components/AlertCard.tsx
PURPOSE: Display individual alert with expandable details

IMPORTS:
  - React from 'react'
  - { AlertTriangle, Info, XCircle, ChevronDown, ChevronUp, Check } from 'lucide-react'
  - type { Alert } from '../types/monitoring'

INTERFACES:
  interface AlertCardProps {
    alert: Alert
    expanded: boolean
    onToggleExpand: () => void
    onAcknowledge: (alertId: string) => void
    className?: string
  }

CONSTANTS:
  SEVERITY_CONFIG = {
    critical: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      textColor: 'text-red-900 dark:text-red-100',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      textColor: 'text-yellow-900 dark:text-yellow-100',
      iconColor: 'text-yellow-600',
      badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      textColor: 'text-blue-900 dark:text-blue-100',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
    }
  }

HELPER FUNCTION: formatTimestamp
  FUNCTION formatTimestamp(timestamp: number): string
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    IF diffMins < 1:
      RETURN 'Just now'
    ELSE IF diffMins < 60:
      RETURN `${diffMins}m ago`
    ELSE IF diffMins < 1440:
      const hours = Math.floor(diffMins / 60)
      RETURN `${hours}h ago`
    ELSE:
      const days = Math.floor(diffMins / 1440)
      RETURN `${days}d ago`

MAIN COMPONENT: AlertCard

  FUNCTION AlertCard({
    alert,
    expanded,
    onToggleExpand,
    onAcknowledge,
    className = ''
  }: AlertCardProps):

    // GET SEVERITY CONFIG
    const severity = alert.severity || 'info'
    const config = SEVERITY_CONFIG[severity]
    const Icon = config.icon
    const ChevronIcon = expanded ? ChevronUp : ChevronDown

    // RENDER
    RETURN (
      <div
        className={`
          border rounded-lg overflow-hidden transition-all
          ${config.borderColor}
          ${alert.acknowledged ? 'bg-gray-50 dark:bg-gray-900/50 opacity-75' : config.bgColor}
          ${className}
        `}
      >
        {/* Main Card Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${config.textColor} mb-1`}>
                    {alert.title || 'System Alert'}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {alert.message}
                  </p>
                </div>

                {/* Severity Badge */}
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${config.badge}`}>
                  {severity.toUpperCase()}
                </span>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                <span>{formatTimestamp(alert.timestamp)}</span>
                {alert.source AND (
                  <>
                    <span>•</span>
                    <span>Source: {alert.source}</span>
                  </>
                )}
                {alert.acknowledged AND (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Acknowledged</span>
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onToggleExpand}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <ChevronIcon className="w-4 h-4" />
                  <span>{expanded ? 'Less' : 'More'} Details</span>
                </button>

                {NOT alert.acknowledged AND (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Check className="w-3 h-3" />
                    <span>Acknowledge</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded AND (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="space-y-3">
              {/* Alert ID */}
              <div className="flex items-start">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24">
                  Alert ID:
                </span>
                <span className="text-xs text-gray-900 dark:text-gray-100 font-mono">
                  {alert.id}
                </span>
              </div>

              {/* Full Timestamp */}
              <div className="flex items-start">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24">
                  Timestamp:
                </span>
                <span className="text-xs text-gray-900 dark:text-gray-100">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Source */}
              {alert.source AND (
                <div className="flex items-start">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24">
                    Source:
                  </span>
                  <span className="text-xs text-gray-900 dark:text-gray-100">
                    {alert.source}
                  </span>
                </div>
              )}

              {/* Additional Details */}
              {alert.details AND (
                <div className="flex items-start">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24">
                    Details:
                  </span>
                  <div className="flex-1">
                    <pre className="text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Acknowledged Info */}
              {alert.acknowledged AND alert.acknowledgedAt AND (
                <div className="flex items-start">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24">
                    Acknowledged:
                  </span>
                  <span className="text-xs text-gray-900 dark:text-gray-100">
                    {new Date(alert.acknowledgedAt).toLocaleString()}
                    {alert.acknowledgedBy AND ` by ${alert.acknowledgedBy}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )

EXPORT default AlertCard
```

---

## 10. RefreshControls.tsx

```typescript
COMPONENT: RefreshControls
FILE: /workspaces/agent-feed/frontend/src/components/RefreshControls.tsx
PURPOSE: Control panel for auto-refresh and manual refresh

IMPORTS:
  - React, { useState } from 'react'
  - { RefreshCw, Settings, Clock } from 'lucide-react'

INTERFACES:
  interface RefreshControlsProps {
    autoRefresh: boolean
    refreshInterval: number
    lastRefreshTime: number
    loading: boolean
    onAutoRefreshToggle: (enabled: boolean) => void
    onManualRefresh: () => void
    onRefreshIntervalChange: (interval: number) => void
    className?: string
  }

CONSTANTS:
  REFRESH_INTERVAL_OPTIONS = [
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
    { value: 60000, label: '1m' },
    { value: 300000, label: '5m' }
  ]

HELPER FUNCTION: formatTimeSince
  FUNCTION formatTimeSince(timestamp: number): string
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    IF seconds < 5:
      RETURN 'just now'
    ELSE IF seconds < 60:
      RETURN `${seconds}s ago`
    ELSE IF seconds < 3600:
      const minutes = Math.floor(seconds / 60)
      RETURN `${minutes}m ago`
    ELSE:
      const hours = Math.floor(seconds / 3600)
      RETURN `${hours}h ago`

MAIN COMPONENT: RefreshControls

  FUNCTION RefreshControls({
    autoRefresh,
    refreshInterval,
    lastRefreshTime,
    loading,
    onAutoRefreshToggle,
    onManualRefresh,
    onRefreshIntervalChange,
    className = ''
  }: RefreshControlsProps):

    // STATE FOR SETTINGS DROPDOWN
    const [showSettings, setShowSettings] = useState(false)

    // HANDLE AUTO-REFRESH TOGGLE
    FUNCTION handleToggle():
      onAutoRefreshToggle(!autoRefresh)

    // HANDLE INTERVAL CHANGE
    FUNCTION handleIntervalChange(newInterval: number):
      onRefreshIntervalChange(newInterval)
      setShowSettings(false)

    // HANDLE MANUAL REFRESH
    FUNCTION handleManualRefresh():
      IF NOT loading:
        onManualRefresh()

    // RENDER
    RETURN (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Last Refresh Indicator */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Updated {formatTimeSince(lastRefreshTime)}</span>
        </div>

        {/* Auto-Refresh Toggle */}
        <button
          onClick={handleToggle}
          className={`
            relative inline-flex items-center h-6 rounded-full w-11 transition-colors
            ${autoRefresh ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
          `}
          title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
        >
          <span
            className={`
              inline-block w-4 h-4 transform bg-white rounded-full transition-transform
              ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>

        <span className="text-sm text-gray-700 dark:text-gray-300">
          Auto-refresh
        </span>

        {/* Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh settings"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showSettings AND (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                  Refresh Interval
                </div>
                {REFRESH_INTERVAL_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleIntervalChange(option.value)}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                      ${refreshInterval === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>
    )

// Close dropdown when clicking outside
EFFECT on mount:
  FUNCTION handleClickOutside(event: MouseEvent):
    IF showSettings:
      const target = event.target as HTMLElement
      IF NOT target.closest('.relative'):
        setShowSettings(false)

  document.addEventListener('mousedown', handleClickOutside)

  CLEANUP:
    document.removeEventListener('mousedown', handleClickOutside)

EXPORT default RefreshControls
```

---

## Type Definitions Required

```typescript
FILE: /workspaces/agent-feed/frontend/src/types/monitoring.ts
PURPOSE: TypeScript type definitions for monitoring system

INTERFACES:

  interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
    version: string
    uptime: number
    timestamp: number
    checks: {
      database: {
        status: string
        responseTime: number
      }
      memory: {
        status: string
        usage: number
      }
      cpu: {
        status: string
        usage: number
      }
    }
  }

  interface SystemMetrics {
    timestamp: string
    server_id: string
    cpu_usage: number
    memory_usage: number
    disk_usage: number
    network_io: NetworkIO
    response_time: number
    throughput: number
    error_rate: number
    active_connections: number
    queue_depth: number
    cache_hit_rate: number
  }

  interface NetworkIO {
    bytes_in: number
    bytes_out: number
    packets_in: number
    packets_out: number
  }

  interface Alert {
    id: string
    title: string
    message: string
    severity: 'critical' | 'warning' | 'info'
    timestamp: number
    source?: string
    acknowledged: boolean
    acknowledgedAt?: number
    acknowledgedBy?: string
    details?: any
  }

  interface AlertStats {
    totalAlerts: number
    activeAlerts: number
    alertsBySeverity: {
      critical: number
      warning: number
      info: number
    }
  }

EXPORT all interfaces
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MonitoringTab.tsx                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              useMonitoringData Hook                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │          MonitoringApiService.ts               │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │     API Endpoints (Express)              │  │  │  │
│  │  │  │  - /api/monitoring/health                │  │  │  │
│  │  │  │  - /api/monitoring/metrics               │  │  │  │
│  │  │  │  - /api/monitoring/alerts                │  │  │  │
│  │  │  │  - /api/monitoring/stats                 │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  │                    ▲                            │  │  │
│  │  │                    │ HTTP Requests              │  │  │
│  │  │                    │ with Retry Logic          │  │  │
│  │  │                    │ and Caching               │  │  │
│  │  └────────────────────┼────────────────────────────┘  │  │
│  │                       │                               │  │
│  │  ┌────────────────────▼────────────────────────────┐  │  │
│  │  │  State Management (React Hooks)                │  │  │
│  │  │  - health: HealthCheckResponse                 │  │  │
│  │  │  - metrics: SystemMetrics                      │  │  │
│  │  │  - alerts: Alert[]                             │  │  │
│  │  │  - stats: any[]                                │  │  │
│  │  │  - loading: boolean                            │  │  │
│  │  │  - error: Error | null                         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Component Hierarchy                      │  │
│  │                                                       │  │
│  │  RefreshControls ──► Auto-refresh & Manual Controls │  │
│  │                                                       │  │
│  │  HealthStatusCard ──► System health display         │  │
│  │                                                       │  │
│  │  SystemMetricsGrid ──► Metric cards grid            │  │
│  │      │                                               │  │
│  │      └──► MetricCard (×6-10) ──► Individual metrics │  │
│  │                                                       │  │
│  │  MonitoringCharts ──► Historical data visualization │  │
│  │      │                                               │  │
│  │      └──► Chart.js Line Charts (×4)                 │  │
│  │                                                       │  │
│  │  AlertsPanel ──► Alerts management                  │  │
│  │      │                                               │  │
│  │      └──► AlertCard (×N) ──► Individual alerts      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with RealAnalytics.tsx

```typescript
UPDATE: /workspaces/agent-feed/frontend/src/components/RealAnalytics.tsx

ADD TO IMPORTS:
  - import MonitoringTab from './MonitoringTab'

ADD NEW TAB TO MONITORING_TABS:
  MONITORING_TABS = [
    { id: 'claude-sdk', label: 'Claude SDK Analytics', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'monitoring', label: 'System Monitoring', icon: Activity } // NEW
  ]

ADD NEW TAB CONTENT:
  <TabsContent value="monitoring" className="space-y-6 overflow-y-auto">
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <MonitoringTab />
    </ErrorBoundary>
  </TabsContent>
```

---

## Complexity Analysis

### Time Complexity

1. **Data Fetching (useMonitoringData)**
   - Initial load: O(4) parallel API calls = O(1)
   - Cache lookup: O(1) with Map
   - Auto-refresh: O(1) per interval

2. **Alert Filtering (AlertsPanel)**
   - Filter operation: O(n) where n = number of alerts
   - Pagination: O(1) array slice
   - Search: O(n) linear search

3. **Metrics Grid Rendering**
   - Metric calculation: O(m) where m = number of metrics (6-10)
   - Grid render: O(m)

4. **Chart Data Processing**
   - Data transformation: O(p) where p = number of data points
   - Chart.js rendering: O(p log p) for internal operations

### Space Complexity

1. **API Service Cache**: O(c) where c = number of cached requests
2. **Component State**: O(n + m + p) for alerts, metrics, and stats
3. **React Virtual DOM**: O(components) for rendered tree

### Optimization Notes

1. **useMemo** for expensive calculations (filtering, chart data)
2. **useCallback** for event handlers to prevent re-renders
3. **API caching** with 5-second TTL to reduce server load
4. **Request deduplication** using AbortController
5. **Pagination** to limit DOM elements (10 alerts per page)
6. **Lazy loading** for Chart.js if needed

---

## Error Handling Strategy

```
ERROR SCENARIOS:

1. API Request Failure:
   - Retry 3 times with exponential backoff
   - Show degraded UI with cached data
   - Display non-blocking warning banner

2. Network Timeout:
   - Abort request after 10 seconds
   - Fallback to cached data
   - Auto-retry on next refresh cycle

3. Invalid Response Data:
   - Validate response structure
   - Use fallback/empty state
   - Log error to console

4. Component Render Error:
   - ErrorBoundary catches errors
   - Show error UI with retry button
   - Preserve other tab functionality

5. Cache Corruption:
   - Automatic cache cleanup every 60 seconds
   - Clear cache on manual refresh
   - Validate cached data before use
```

---

## Testing Checklist

```
UNIT TESTS:
□ MonitoringApiService retry logic
□ useMonitoringData auto-refresh
□ Alert filtering functions
□ Metrics status calculation
□ Chart data transformation
□ Cache TTL expiration

INTEGRATION TESTS:
□ API service → Hook data flow
□ Tab navigation state management
□ Auto-refresh triggers refetch
□ Manual refresh clears cache
□ Alert acknowledgment updates UI

E2E TESTS:
□ Load monitoring tab
□ Toggle auto-refresh on/off
□ Change refresh interval
□ Filter alerts by severity
□ Acknowledge alert
□ Paginate through alerts
□ View historical charts
□ Switch between tabs

PERFORMANCE TESTS:
□ Large alert list (100+ items)
□ Chart rendering with 1000+ data points
□ Rapid refresh cycles
□ Memory leak detection
□ Cache hit rate metrics
```

---

## END OF PSEUDOCODE DOCUMENT

**Summary:**
- 10 components fully specified
- Complete data flow documented
- Error handling defined
- Integration points clarified
- Type definitions provided
- Complexity analyzed

**Next Phase:** Implementation (SPARC Code Phase)
