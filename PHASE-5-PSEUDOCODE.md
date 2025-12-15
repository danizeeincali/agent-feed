# Phase 5: Health & Monitoring Pseudocode
## Complete Algorithmic Design for Metrics Collection, Alerting, and Dashboard

**Version:** 1.0
**Date:** 2025-10-12
**Methodology:** SPARC Pseudocode Phase
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [MetricsCollector](#metricscollector)
4. [AlertingService](#alertingservice)
5. [DashboardService](#dashboardservice)
6. [API Endpoints](#api-endpoints)
7. [Database Operations](#database-operations)
8. [Caching Strategies](#caching-strategies)
9. [WebSocket Protocol](#websocket-protocol)
10. [Complexity Analysis](#complexity-analysis)

---

## Overview

Phase 5 builds a comprehensive health and monitoring system on top of existing components:
- **Phase 2**: Orchestrator with HealthMonitorAdapter
- **Phase 3**: Agent workers with execution metrics
- **Phase 4**: Validation service with validation stats

The monitoring system provides:
- Real-time metrics collection
- Alert evaluation and notification
- Live dashboard data via WebSocket
- Historical metrics aggregation
- Database-backed persistence

---

## Data Structures

### Core Types

```typescript
// Metrics snapshot taken at a point in time
STRUCTURE: MetricsSnapshot
    timestamp: Date
    category: MetricCategory (system, orchestrator, workers, validation, database)
    metrics: {
        // System metrics
        cpuUsage: number (0-100)
        memoryUsage: number (0-100)
        diskUsage: number (0-100)

        // Orchestrator metrics
        orchestratorStatus: string (running, stopped, restarting)
        orchestratorUptime: number (milliseconds)
        contextSize: number (tokens)
        contextUtilization: number (0-100 percentage)

        // Worker metrics
        activeWorkers: number
        totalWorkersSpawned: number
        averageWorkerDuration: number (milliseconds)
        workerSuccessRate: number (0-100 percentage)

        // Queue metrics
        queueDepth: number
        pendingTickets: number
        processingTickets: number
        completedTickets: number
        failedTickets: number

        // Validation metrics
        validationsPassed: number
        validationsFailed: number
        validationDurationAvg: number (milliseconds)
        tokensUsedValidation: number

        // Database metrics
        dbConnections: number
        dbQueryDurationAvg: number (milliseconds)
        dbPoolUtilization: number (0-100 percentage)

        // API metrics (if applicable)
        apiRequestRate: number (requests per second)
        apiErrorRate: number (0-100 percentage)
        apiLatencyP95: number (milliseconds)
    }
    metadata: {
        source: string
        version: string
        environment: string
    }
END STRUCTURE

// Time range for queries
STRUCTURE: TimeRange
    start: Date
    end: Date
    window: TimeWindow (1m, 5m, 15m, 1h, 6h, 24h, 7d, 30d)
END STRUCTURE

// Aggregation window
ENUM: TimeWindow
    ONE_MINUTE = '1m'
    FIVE_MINUTES = '5m'
    FIFTEEN_MINUTES = '15m'
    ONE_HOUR = '1h'
    SIX_HOURS = '6h'
    ONE_DAY = '24h'
    ONE_WEEK = '7d'
    ONE_MONTH = '30d'
END ENUM

// Aggregated metrics over time
STRUCTURE: AggregatedMetrics
    timeRange: TimeRange
    window: TimeWindow
    dataPoints: Array<DataPoint>
    summary: {
        avg: number
        min: number
        max: number
        median: number
        p95: number
        p99: number
        count: number
    }
END STRUCTURE

STRUCTURE: DataPoint
    timestamp: Date
    value: number
    metadata: Map<string, any>
END STRUCTURE

// Alert definition
STRUCTURE: Alert
    id: string
    name: string
    severity: AlertSeverity (info, warning, critical)
    condition: AlertCondition
    status: AlertStatus (active, acknowledged, resolved)
    triggeredAt: Date
    acknowledgedAt: Date (nullable)
    resolvedAt: Date (nullable)
    message: string
    metadata: {
        metricName: string
        threshold: number
        actualValue: number
        duration: number (milliseconds)
        ticketId: string (optional)
        agentName: string (optional)
    }
END STRUCTURE

ENUM: AlertSeverity
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'
END ENUM

ENUM: AlertStatus
    ACTIVE = 'active'
    ACKNOWLEDGED = 'acknowledged'
    RESOLVED = 'resolved'
END ENUM

// Alert condition (threshold-based)
STRUCTURE: AlertCondition
    metricName: string
    operator: ComparisonOperator (gt, lt, gte, lte, eq, neq)
    threshold: number
    duration: number (milliseconds - how long condition must be true)
    windowSize: TimeWindow
END STRUCTURE

ENUM: ComparisonOperator
    GREATER_THAN = 'gt'
    LESS_THAN = 'lt'
    GREATER_THAN_OR_EQUAL = 'gte'
    LESS_THAN_OR_EQUAL = 'lte'
    EQUAL = 'eq'
    NOT_EQUAL = 'neq'
END ENUM

// Dashboard data structure
STRUCTURE: DashboardData
    timestamp: Date
    overview: {
        status: SystemStatus
        uptime: number (milliseconds)
        health: HealthScore (0-100)
    }
    currentMetrics: MetricsSnapshot
    recentAlerts: Array<Alert>
    charts: {
        cpuUsage: TimeSeries
        memoryUsage: TimeSeries
        workerActivity: TimeSeries
        queueDepth: TimeSeries
        validationRate: TimeSeries
    }
    topErrors: Array<ErrorSummary>
END STRUCTURE

ENUM: SystemStatus
    HEALTHY = 'healthy'
    DEGRADED = 'degraded'
    UNHEALTHY = 'unhealthy'
    OFFLINE = 'offline'
END ENUM

STRUCTURE: TimeSeries
    name: string
    unit: string
    dataPoints: Array<DataPoint>
END STRUCTURE

STRUCTURE: ErrorSummary
    errorType: string
    count: number
    lastOccurrence: Date
    affectedAgents: Array<string>
END STRUCTURE

// Cache entry for metrics
STRUCTURE: MetricsCacheEntry
    key: string
    data: any
    expiresAt: Date
    hitCount: number
END STRUCTURE
```

---

## MetricsCollector

### Main Algorithm: collectMetrics()

```
ALGORITHM: collectMetrics
INPUT: none
OUTPUT: MetricsSnapshot

BEGIN
    timestamp ← getCurrentTime()

    // Initialize metrics snapshot
    snapshot ← {
        timestamp: timestamp,
        category: 'all',
        metrics: {},
        metadata: {
            source: 'MetricsCollector',
            version: getVersion(),
            environment: getEnvironment()
        }
    }

    // Collect metrics in parallel (independent operations)
    systemMetrics ← collectSystemMetrics()
    orchestratorMetrics ← collectOrchestratorMetrics()
    workerMetrics ← collectWorkerMetrics()
    queueMetrics ← collectQueueMetrics()
    validationMetrics ← collectValidationMetrics()
    databaseMetrics ← collectDatabaseMetrics()

    // Merge all metrics into snapshot
    snapshot.metrics ← merge(
        systemMetrics,
        orchestratorMetrics,
        workerMetrics,
        queueMetrics,
        validationMetrics,
        databaseMetrics
    )

    // Store metrics in database asynchronously
    asyncStoreMetrics(snapshot)

    // Update cache
    cacheMetrics(snapshot)

    RETURN snapshot
END

TIME COMPLEXITY: O(1) - all operations are bounded
SPACE COMPLEXITY: O(1) - fixed size snapshot
```

### Subroutine: collectSystemMetrics()

```
ALGORITHM: collectSystemMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // CPU usage (from os module)
    cpus ← os.cpus()
    totalIdle ← 0
    totalTick ← 0

    FOR EACH cpu IN cpus DO
        FOR EACH type IN cpu.times DO
            totalTick ← totalTick + cpu.times[type]
        END FOR
        totalIdle ← totalIdle + cpu.times.idle
    END FOR

    idle ← totalIdle / cpus.length
    total ← totalTick / cpus.length
    cpuUsage ← 100 - floor((100 * idle) / total)

    metrics.set('cpuUsage', cpuUsage)

    // Memory usage
    totalMem ← os.totalmem()
    freeMem ← os.freemem()
    usedMem ← totalMem - freeMem
    memoryUsage ← round((usedMem / totalMem) * 100)

    metrics.set('memoryUsage', memoryUsage)
    metrics.set('memoryTotal', totalMem)
    metrics.set('memoryFree', freeMem)
    metrics.set('memoryUsed', usedMem)

    // Disk usage (from diskusage module or statvfs)
    diskInfo ← getDiskUsage('/')
    diskUsage ← round((diskInfo.used / diskInfo.total) * 100)

    metrics.set('diskUsage', diskUsage)
    metrics.set('diskTotal', diskInfo.total)
    metrics.set('diskFree', diskInfo.free)

    RETURN metrics
END

TIME COMPLEXITY: O(n) where n = number of CPU cores
SPACE COMPLEXITY: O(1)
```

### Subroutine: collectOrchestratorMetrics()

```
ALGORITHM: collectOrchestratorMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // Get orchestrator state from database
    state ← database.query(`
        SELECT
            context_size,
            last_restart,
            uptime_seconds
        FROM avi_state
        WHERE id = 1
    `)

    IF state.rows.length == 0 THEN
        // Orchestrator not initialized
        metrics.set('orchestratorStatus', 'offline')
        RETURN metrics
    END IF

    row ← state.rows[0]

    // Context size and utilization
    contextSize ← row.context_size || 0
    contextLimit ← getConfig('AVI_CONTEXT_LIMIT') || 50000
    contextUtilization ← round((contextSize / contextLimit) * 100)

    metrics.set('orchestratorStatus', 'running')
    metrics.set('contextSize', contextSize)
    metrics.set('contextLimit', contextLimit)
    metrics.set('contextUtilization', contextUtilization)

    // Uptime calculation
    lastRestart ← row.last_restart
    uptime ← row.uptime_seconds * 1000 // Convert to milliseconds

    IF lastRestart IS NOT NULL THEN
        currentSessionUptime ← getCurrentTime() - lastRestart
        totalUptime ← uptime + currentSessionUptime
    ELSE
        totalUptime ← uptime
    END IF

    metrics.set('orchestratorUptime', totalUptime)

    // Get restart count
    restartCount ← database.query(`
        SELECT COUNT(*) as count
        FROM avi_state_history
        WHERE event_type = 'restart'
          AND created_at > NOW() - INTERVAL '24 hours'
    `)

    metrics.set('restartsLast24h', restartCount.rows[0].count || 0)

    RETURN metrics
END

TIME COMPLEXITY: O(1) - single-row query
SPACE COMPLEXITY: O(1)
```

### Subroutine: collectWorkerMetrics()

```
ALGORITHM: collectWorkerMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // Active workers (from work_queue processing status)
    activeWorkers ← database.query(`
        SELECT COUNT(*) as count
        FROM work_queue
        WHERE status = 'processing'
    `)

    metrics.set('activeWorkers', activeWorkers.rows[0].count || 0)

    // Worker statistics (last 24 hours)
    workerStats ← database.query(`
        SELECT
            COUNT(*) as total_spawned,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) * 1000)
                FILTER (WHERE completed_at IS NOT NULL) as avg_duration_ms
        FROM work_queue
        WHERE created_at > NOW() - INTERVAL '24 hours'
          AND assigned_at IS NOT NULL
    `)

    stats ← workerStats.rows[0]

    totalSpawned ← stats.total_spawned || 0
    completed ← stats.completed || 0
    failed ← stats.failed || 0
    avgDuration ← stats.avg_duration_ms || 0

    // Calculate success rate
    successRate ← 0
    IF totalSpawned > 0 THEN
        successRate ← round((completed / totalSpawned) * 100)
    END IF

    metrics.set('totalWorkersSpawned', totalSpawned)
    metrics.set('workersCompleted', completed)
    metrics.set('workersFailed', failed)
    metrics.set('averageWorkerDuration', avgDuration)
    metrics.set('workerSuccessRate', successRate)

    // Worker pool utilization
    maxWorkers ← getConfig('MAX_CONCURRENT_WORKERS') || 10
    utilization ← round((activeWorkers.rows[0].count / maxWorkers) * 100)
    metrics.set('workerPoolUtilization', utilization)

    RETURN metrics
END

TIME COMPLEXITY: O(1) - aggregated queries with indexes
SPACE COMPLEXITY: O(1)
```

### Subroutine: collectQueueMetrics()

```
ALGORITHM: collectQueueMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // Queue depth by status
    queueStats ← database.query(`
        SELECT
            status,
            COUNT(*) as count,
            MAX(created_at) as newest,
            MIN(created_at) as oldest
        FROM work_queue
        GROUP BY status
    `)

    pending ← 0
    processing ← 0
    completed ← 0
    failed ← 0
    oldestPendingAge ← 0

    FOR EACH row IN queueStats.rows DO
        count ← row.count || 0

        CASE row.status OF
            'pending':
                pending ← count
                IF row.oldest IS NOT NULL THEN
                    oldestPendingAge ← getCurrentTime() - row.oldest
                END IF
            'processing':
                processing ← count
            'completed':
                completed ← count
            'failed':
                failed ← count
        END CASE
    END FOR

    totalDepth ← pending + processing

    metrics.set('queueDepth', totalDepth)
    metrics.set('pendingTickets', pending)
    metrics.set('processingTickets', processing)
    metrics.set('completedTickets', completed)
    metrics.set('failedTickets', failed)
    metrics.set('oldestPendingAge', oldestPendingAge)

    // Queue throughput (tickets processed per hour)
    throughput ← database.query(`
        SELECT COUNT(*) as count
        FROM work_queue
        WHERE status IN ('completed', 'failed')
          AND completed_at > NOW() - INTERVAL '1 hour'
    `)

    metrics.set('throughputPerHour', throughput.rows[0].count || 0)

    RETURN metrics
END

TIME COMPLEXITY: O(1) - aggregated query with index on status
SPACE COMPLEXITY: O(1)
```

### Subroutine: collectValidationMetrics()

```
ALGORITHM: collectValidationMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // Validation statistics (last 24 hours)
    validationStats ← database.query(`
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'validated') as passed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            AVG(generation_time_ms) as avg_duration,
            SUM(tokens_used) as total_tokens
        FROM agent_responses
        WHERE created_at > NOW() - INTERVAL '24 hours'
    `)

    stats ← validationStats.rows[0]

    total ← stats.total || 0
    passed ← stats.passed || 0
    failed ← stats.failed || 0
    avgDuration ← stats.avg_duration || 0
    totalTokens ← stats.total_tokens || 0

    // Calculate pass rate
    passRate ← 0
    IF total > 0 THEN
        passRate ← round((passed / total) * 100)
    END IF

    metrics.set('validationTotal', total)
    metrics.set('validationsPassed', passed)
    metrics.set('validationsFailed', failed)
    metrics.set('validationPassRate', passRate)
    metrics.set('validationDurationAvg', avgDuration)
    metrics.set('tokensUsedValidation', totalTokens)

    // Error types breakdown
    errorTypes ← database.query(`
        SELECT
            error_type,
            COUNT(*) as count
        FROM error_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 5
    `)

    errorBreakdown ← {}
    FOR EACH row IN errorTypes.rows DO
        errorBreakdown[row.error_type] ← row.count
    END FOR

    metrics.set('errorTypeBreakdown', errorBreakdown)

    RETURN metrics
END

TIME COMPLEXITY: O(1) - aggregated queries with time-based index
SPACE COMPLEXITY: O(1)
```

### Subroutine: collectDatabaseMetrics()

```
ALGORITHM: collectDatabaseMetrics
INPUT: none
OUTPUT: Map<string, number>

BEGIN
    metrics ← new Map()

    // Database connection pool stats (from pg.Pool)
    poolStats ← database.pool.totalCount
    idleCount ← database.pool.idleCount
    waitingCount ← database.pool.waitingCount

    metrics.set('dbConnections', poolStats)
    metrics.set('dbIdleConnections', idleCount)
    metrics.set('dbWaitingRequests', waitingCount)

    // Pool utilization
    maxConnections ← getConfig('DB_POOL_MAX') || 20
    utilization ← round((poolStats / maxConnections) * 100)
    metrics.set('dbPoolUtilization', utilization)

    // Query performance (PostgreSQL stats)
    queryStats ← database.query(`
        SELECT
            AVG(mean_exec_time) as avg_time,
            MAX(max_exec_time) as max_time,
            SUM(calls) as total_queries
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        LIMIT 1
    `)

    IF queryStats.rows.length > 0 THEN
        stats ← queryStats.rows[0]
        metrics.set('dbQueryDurationAvg', stats.avg_time || 0)
        metrics.set('dbQueryDurationMax', stats.max_time || 0)
        metrics.set('dbTotalQueries', stats.total_queries || 0)
    END IF

    // Database size
    dbSize ← database.query(`
        SELECT pg_database_size(current_database()) as size_bytes
    `)

    metrics.set('dbSizeBytes', dbSize.rows[0].size_bytes || 0)

    RETURN metrics
END

TIME COMPLEXITY: O(1) - metadata queries
SPACE COMPLEXITY: O(1)
```

### Algorithm: getMetrics(category, timeRange)

```
ALGORITHM: getMetrics
INPUT: category (string), timeRange (TimeRange)
OUTPUT: Array<MetricsSnapshot>

BEGIN
    // Check cache first
    cacheKey ← generateCacheKey(category, timeRange)
    cachedMetrics ← cache.get(cacheKey)

    IF cachedMetrics IS NOT NULL AND NOT isExpired(cachedMetrics) THEN
        RETURN cachedMetrics.data
    END IF

    // Build query based on category
    query ← buildMetricsQuery(category, timeRange)

    // Execute query
    result ← database.query(query)

    // Transform rows into MetricsSnapshot array
    snapshots ← []
    FOR EACH row IN result.rows DO
        snapshot ← {
            timestamp: row.timestamp,
            category: category,
            metrics: JSON.parse(row.metrics_data),
            metadata: JSON.parse(row.metadata)
        }
        snapshots.push(snapshot)
    END FOR

    // Cache result (5 minute TTL)
    cache.set(cacheKey, {
        data: snapshots,
        expiresAt: getCurrentTime() + 300000 // 5 minutes
    })

    RETURN snapshots
END

TIME COMPLEXITY: O(n) where n = number of snapshots in time range
SPACE COMPLEXITY: O(n)
```

### Algorithm: aggregateMetrics(metrics, window)

```
ALGORITHM: aggregateMetrics
INPUT: metrics (Array<MetricsSnapshot>), window (TimeWindow)
OUTPUT: AggregatedMetrics

BEGIN
    IF metrics.length == 0 THEN
        RETURN emptyAggregatedMetrics()
    END IF

    // Determine window size in milliseconds
    windowMs ← getWindowMilliseconds(window)

    // Group metrics by time buckets
    buckets ← new Map()

    FOR EACH snapshot IN metrics DO
        // Calculate bucket timestamp (rounded to window)
        bucketTime ← roundToWindow(snapshot.timestamp, windowMs)

        IF NOT buckets.has(bucketTime) THEN
            buckets.set(bucketTime, [])
        END IF

        buckets.get(bucketTime).push(snapshot)
    END FOR

    // Aggregate each bucket
    dataPoints ← []
    allValues ← []

    FOR EACH [timestamp, snapshotGroup] IN buckets DO
        // Calculate aggregations for this bucket
        values ← snapshotGroup.map(s => extractNumericMetrics(s))

        aggregated ← {
            avg: calculateAverage(values),
            min: calculateMin(values),
            max: calculateMax(values),
            count: values.length
        }

        dataPoint ← {
            timestamp: timestamp,
            value: aggregated.avg,
            metadata: {
                min: aggregated.min,
                max: aggregated.max,
                count: aggregated.count
            }
        }

        dataPoints.push(dataPoint)
        allValues ← allValues.concat(values)
    END FOR

    // Sort data points by timestamp
    dataPoints.sort((a, b) => a.timestamp - b.timestamp)

    // Calculate summary statistics
    sortedValues ← allValues.sort((a, b) => a - b)

    summary ← {
        avg: calculateAverage(allValues),
        min: sortedValues[0],
        max: sortedValues[sortedValues.length - 1],
        median: calculateMedian(sortedValues),
        p95: calculatePercentile(sortedValues, 95),
        p99: calculatePercentile(sortedValues, 99),
        count: allValues.length
    }

    result ← {
        timeRange: {
            start: metrics[0].timestamp,
            end: metrics[metrics.length - 1].timestamp,
            window: window
        },
        window: window,
        dataPoints: dataPoints,
        summary: summary
    }

    RETURN result
END

TIME COMPLEXITY: O(n log n) where n = number of snapshots (due to sorting)
SPACE COMPLEXITY: O(n)
```

### Algorithm: storeMetrics(metrics)

```
ALGORITHM: storeMetrics
INPUT: metrics (MetricsSnapshot)
OUTPUT: Promise<void>

BEGIN
    // Store full snapshot in time-series table
    query ← `
        INSERT INTO metrics_snapshots (
            timestamp,
            category,
            metrics_data,
            metadata
        ) VALUES ($1, $2, $3, $4)
    `

    params ← [
        metrics.timestamp,
        metrics.category,
        JSON.stringify(metrics.metrics),
        JSON.stringify(metrics.metadata)
    ]

    TRY
        await database.query(query, params)

        // Also store individual metrics for easier querying
        individualMetrics ← extractIndividualMetrics(metrics)

        FOR EACH [metricName, value] IN individualMetrics DO
            individualQuery ← `
                INSERT INTO metrics_timeseries (
                    timestamp,
                    metric_name,
                    metric_value,
                    category
                ) VALUES ($1, $2, $3, $4)
            `

            await database.query(individualQuery, [
                metrics.timestamp,
                metricName,
                value,
                metrics.category
            ])
        END FOR

    CATCH error
        logger.error('Failed to store metrics', { error, metrics })
        // Don't throw - metrics collection should not block
    END TRY
END

TIME COMPLEXITY: O(m) where m = number of individual metrics
SPACE COMPLEXITY: O(1)
```

### Algorithm: cleanupOldMetrics(retentionDays)

```
ALGORITHM: cleanupOldMetrics
INPUT: retentionDays (number)
OUTPUT: Promise<number> (rows deleted)

BEGIN
    cutoffDate ← getCurrentTime() - (retentionDays * 24 * 60 * 60 * 1000)

    // Delete from snapshots table
    snapshotQuery ← `
        DELETE FROM metrics_snapshots
        WHERE timestamp < $1
    `

    snapshotResult ← await database.query(snapshotQuery, [cutoffDate])
    snapshotsDeleted ← snapshotResult.rowCount

    // Delete from timeseries table
    timeseriesQuery ← `
        DELETE FROM metrics_timeseries
        WHERE timestamp < $1
    `

    timeseriesResult ← await database.query(timeseriesQuery, [cutoffDate])
    timeseriesDeleted ← timeseriesResult.rowCount

    totalDeleted ← snapshotsDeleted + timeseriesDeleted

    logger.info('Cleaned up old metrics', {
        retentionDays,
        snapshotsDeleted,
        timeseriesDeleted,
        totalDeleted
    })

    RETURN totalDeleted
END

TIME COMPLEXITY: O(n) where n = rows deleted (with index on timestamp, effectively O(log n) + O(deleted))
SPACE COMPLEXITY: O(1)
```

---

## AlertingService

### Main Algorithm: evaluateAlerts(metrics)

```
ALGORITHM: evaluateAlerts
INPUT: metrics (MetricsSnapshot)
OUTPUT: Promise<Array<Alert>>

BEGIN
    triggeredAlerts ← []

    // Load alert definitions from configuration or database
    alertDefinitions ← loadAlertDefinitions()

    // Load active alerts to check for duplicates
    activeAlerts ← await getActiveAlerts()
    activeAlertMap ← createMapByCondition(activeAlerts)

    // Evaluate each alert condition
    FOR EACH definition IN alertDefinitions DO
        condition ← definition.condition

        // Check if condition is met
        isMet ← evaluateCondition(condition, metrics)

        IF isMet THEN
            // Check if already triggered
            existingAlert ← activeAlertMap.get(condition.metricName)

            IF existingAlert IS NULL THEN
                // New alert - check duration requirement
                IF meetsMinimumDuration(condition, metrics) THEN
                    alert ← createAlert(definition, metrics)
                    triggeredAlerts.push(alert)

                    // Store in database
                    await storeAlert(alert)

                    // Send notification
                    await sendAlert(alert)
                END IF
            ELSE
                // Alert already active - update duration
                await updateAlertDuration(existingAlert.id, metrics.timestamp)
            END IF
        ELSE
            // Condition not met - resolve if exists
            existingAlert ← activeAlertMap.get(condition.metricName)

            IF existingAlert IS NOT NULL THEN
                await resolveAlert(existingAlert.id, metrics.timestamp)
                logger.info('Alert resolved', { alertId: existingAlert.id })
            END IF
        END IF
    END FOR

    RETURN triggeredAlerts
END

TIME COMPLEXITY: O(a * c) where a = alert definitions, c = conditions per alert
SPACE COMPLEXITY: O(a)
```

### Subroutine: evaluateCondition(condition, metrics)

```
ALGORITHM: evaluateCondition
INPUT: condition (AlertCondition), metrics (MetricsSnapshot)
OUTPUT: boolean

BEGIN
    // Extract metric value from snapshot
    metricValue ← getMetricValue(metrics, condition.metricName)

    IF metricValue IS NULL THEN
        RETURN false // Metric not found
    END IF

    threshold ← condition.threshold

    // Evaluate based on operator
    result ← false

    CASE condition.operator OF
        'gt':
            result ← metricValue > threshold
        'lt':
            result ← metricValue < threshold
        'gte':
            result ← metricValue >= threshold
        'lte':
            result ← metricValue <= threshold
        'eq':
            result ← metricValue == threshold
        'neq':
            result ← metricValue != threshold
        DEFAULT:
            logger.error('Unknown operator', { operator: condition.operator })
            result ← false
    END CASE

    RETURN result
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

### Subroutine: meetsMinimumDuration(condition, metrics)

```
ALGORITHM: meetsMinimumDuration
INPUT: condition (AlertCondition), metrics (MetricsSnapshot)
OUTPUT: boolean

BEGIN
    // Check historical data to see if condition has been true
    // for at least the required duration

    IF condition.duration == 0 THEN
        RETURN true // No duration requirement
    END IF

    // Query metrics history within duration window
    startTime ← metrics.timestamp - condition.duration
    endTime ← metrics.timestamp

    historicalMetrics ← await getMetrics(
        'all',
        { start: startTime, end: endTime, window: '1m' }
    )

    // Check if condition was met in ALL historical snapshots
    allMet ← true

    FOR EACH snapshot IN historicalMetrics DO
        IF NOT evaluateCondition(condition, snapshot) THEN
            allMet ← false
            BREAK
        END IF
    END FOR

    RETURN allMet
END

TIME COMPLEXITY: O(n) where n = snapshots in duration window
SPACE COMPLEXITY: O(n)
```

### Subroutine: createAlert(definition, metrics)

```
ALGORITHM: createAlert
INPUT: definition (AlertDefinition), metrics (MetricsSnapshot)
OUTPUT: Alert

BEGIN
    metricValue ← getMetricValue(metrics, definition.condition.metricName)

    alert ← {
        id: generateUUID(),
        name: definition.name,
        severity: definition.severity,
        condition: definition.condition,
        status: 'active',
        triggeredAt: metrics.timestamp,
        acknowledgedAt: null,
        resolvedAt: null,
        message: formatAlertMessage(definition, metricValue),
        metadata: {
            metricName: definition.condition.metricName,
            threshold: definition.condition.threshold,
            actualValue: metricValue,
            duration: 0,
            timestamp: metrics.timestamp
        }
    }

    RETURN alert
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

### Algorithm: sendAlert(alert)

```
ALGORITHM: sendAlert
INPUT: alert (Alert)
OUTPUT: Promise<void>

BEGIN
    logger.warn('Alert triggered', {
        alertId: alert.id,
        name: alert.name,
        severity: alert.severity,
        message: alert.message
    })

    // Determine notification channels based on severity
    channels ← determineNotificationChannels(alert.severity)

    // Send to each channel in parallel
    notifications ← []

    FOR EACH channel IN channels DO
        notificationPromise ← sendToChannel(channel, alert)
        notifications.push(notificationPromise)
    END FOR

    // Wait for all notifications
    results ← await Promise.all(notifications)

    // Log notification results
    FOR EACH [index, result] IN results DO
        channel ← channels[index]

        IF result.success THEN
            logger.info('Alert notification sent', {
                alertId: alert.id,
                channel: channel
            })
        ELSE
            logger.error('Alert notification failed', {
                alertId: alert.id,
                channel: channel,
                error: result.error
            })
        END IF
    END FOR
END

TIME COMPLEXITY: O(c) where c = number of channels
SPACE COMPLEXITY: O(c)
```

### Subroutine: sendToChannel(channel, alert)

```
ALGORITHM: sendToChannel
INPUT: channel (string), alert (Alert)
OUTPUT: Promise<NotificationResult>

BEGIN
    result ← {
        channel: channel,
        success: false,
        timestamp: getCurrentTime(),
        error: null
    }

    TRY
        CASE channel OF
            'email':
                await sendEmailNotification(alert)

            'webhook':
                await sendWebhookNotification(alert)

            'slack':
                await sendSlackNotification(alert)

            'pagerduty':
                await sendPagerDutyNotification(alert)

            'log':
                // Already logged, just mark success
                result.success ← true

            DEFAULT:
                throw new Error('Unknown notification channel: ' + channel)
        END CASE

        result.success ← true

    CATCH error
        result.error ← error.message
        logger.error('Notification failed', { channel, alert, error })
    END TRY

    RETURN result
END

TIME COMPLEXITY: O(1) - external API call
SPACE COMPLEXITY: O(1)
```

### Algorithm: acknowledgeAlert(alertId)

```
ALGORITHM: acknowledgeAlert
INPUT: alertId (string)
OUTPUT: Promise<Alert>

BEGIN
    // Update alert status in database
    query ← `
        UPDATE alerts
        SET status = 'acknowledged',
            acknowledged_at = NOW()
        WHERE id = $1
        RETURNING *
    `

    result ← await database.query(query, [alertId])

    IF result.rows.length == 0 THEN
        throw new Error('Alert not found: ' + alertId)
    END IF

    alert ← transformRowToAlert(result.rows[0])

    logger.info('Alert acknowledged', { alertId, acknowledgedAt: alert.acknowledgedAt })

    // Clear from active alerts cache
    cache.delete('active_alerts')

    RETURN alert
END

TIME COMPLEXITY: O(1) - single-row update
SPACE COMPLEXITY: O(1)
```

### Algorithm: getActiveAlerts()

```
ALGORITHM: getActiveAlerts
INPUT: none
OUTPUT: Promise<Array<Alert>>

BEGIN
    // Check cache first
    cachedAlerts ← cache.get('active_alerts')

    IF cachedAlerts IS NOT NULL THEN
        RETURN cachedAlerts.data
    END IF

    // Query from database
    query ← `
        SELECT *
        FROM alerts
        WHERE status IN ('active', 'acknowledged')
        ORDER BY severity DESC, triggered_at DESC
        LIMIT 100
    `

    result ← await database.query(query)

    alerts ← []
    FOR EACH row IN result.rows DO
        alert ← transformRowToAlert(row)
        alerts.push(alert)
    END FOR

    // Cache for 30 seconds
    cache.set('active_alerts', {
        data: alerts,
        expiresAt: getCurrentTime() + 30000
    })

    RETURN alerts
END

TIME COMPLEXITY: O(n) where n = active alerts (max 100)
SPACE COMPLEXITY: O(n)
```

### Algorithm: getAlertHistory(timeRange)

```
ALGORITHM: getAlertHistory
INPUT: timeRange (TimeRange)
OUTPUT: Promise<Array<Alert>>

BEGIN
    query ← `
        SELECT *
        FROM alerts
        WHERE triggered_at >= $1
          AND triggered_at <= $2
        ORDER BY triggered_at DESC
        LIMIT 1000
    `

    result ← await database.query(query, [timeRange.start, timeRange.end])

    alerts ← []
    FOR EACH row IN result.rows DO
        alert ← transformRowToAlert(row)
        alerts.push(alert)
    END FOR

    RETURN alerts
END

TIME COMPLEXITY: O(n) where n = alerts in time range (max 1000)
SPACE COMPLEXITY: O(n)
```

### Subroutine: determineNotificationChannels(severity)

```
ALGORITHM: determineNotificationChannels
INPUT: severity (AlertSeverity)
OUTPUT: Array<string>

BEGIN
    channels ← ['log'] // Always log

    CASE severity OF
        'info':
            // Only log info alerts
            channels ← ['log']

        'warning':
            // Log and send to webhook
            channels ← ['log', 'webhook']

            IF isEmailConfigured() THEN
                channels.push('email')
            END IF

        'critical':
            // Send to all configured channels
            channels ← ['log', 'webhook']

            IF isEmailConfigured() THEN
                channels.push('email')
            END IF

            IF isSlackConfigured() THEN
                channels.push('slack')
            END IF

            IF isPagerDutyConfigured() THEN
                channels.push('pagerduty')
            END IF
    END CASE

    RETURN channels
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

---

## DashboardService

### Algorithm: getDashboardData()

```
ALGORITHM: getDashboardData
INPUT: none
OUTPUT: Promise<DashboardData>

BEGIN
    // Collect current metrics
    currentMetrics ← await metricsCollector.collectMetrics()

    // Get recent alerts (last 10)
    recentAlerts ← await alertingService.getActiveAlerts()
    recentAlerts ← recentAlerts.slice(0, 10)

    // Calculate system status
    status ← calculateSystemStatus(currentMetrics, recentAlerts)

    // Get uptime from orchestrator metrics
    uptime ← currentMetrics.metrics.orchestratorUptime || 0

    // Calculate health score
    health ← calculateHealthScore(currentMetrics, recentAlerts)

    // Get chart data (last 1 hour, 1 minute intervals)
    timeRange ← {
        start: getCurrentTime() - 3600000, // 1 hour ago
        end: getCurrentTime(),
        window: '1m'
    }

    // Fetch historical metrics for charts in parallel
    cpuHistory ← getMetrics('system', timeRange)
    memoryHistory ← getMetrics('system', timeRange)
    workerHistory ← getMetrics('workers', timeRange)
    queueHistory ← getMetrics('queue', timeRange)
    validationHistory ← getMetrics('validation', timeRange)

    // Transform to time series
    charts ← {
        cpuUsage: createTimeSeries('CPU Usage', cpuHistory, 'cpuUsage', '%'),
        memoryUsage: createTimeSeries('Memory Usage', memoryHistory, 'memoryUsage', '%'),
        workerActivity: createTimeSeries('Active Workers', workerHistory, 'activeWorkers', 'workers'),
        queueDepth: createTimeSeries('Queue Depth', queueHistory, 'queueDepth', 'tickets'),
        validationRate: createTimeSeries('Validation Pass Rate', validationHistory, 'validationPassRate', '%')
    }

    // Get top errors (last 24 hours)
    topErrors ← await getTopErrors(24)

    // Assemble dashboard data
    dashboardData ← {
        timestamp: getCurrentTime(),
        overview: {
            status: status,
            uptime: uptime,
            health: health
        },
        currentMetrics: currentMetrics,
        recentAlerts: recentAlerts,
        charts: charts,
        topErrors: topErrors
    }

    RETURN dashboardData
END

TIME COMPLEXITY: O(n) where n = historical data points
SPACE COMPLEXITY: O(n)
```

### Subroutine: calculateSystemStatus(metrics, alerts)

```
ALGORITHM: calculateSystemStatus
INPUT: metrics (MetricsSnapshot), alerts (Array<Alert>)
OUTPUT: SystemStatus

BEGIN
    // Check for critical alerts
    criticalAlerts ← alerts.filter(a => a.severity == 'critical' AND a.status == 'active')

    IF criticalAlerts.length > 0 THEN
        RETURN 'unhealthy'
    END IF

    // Check orchestrator status
    IF metrics.metrics.orchestratorStatus == 'offline' THEN
        RETURN 'offline'
    END IF

    // Check warning alerts
    warningAlerts ← alerts.filter(a => a.severity == 'warning' AND a.status == 'active')

    IF warningAlerts.length > 0 THEN
        RETURN 'degraded'
    END IF

    // Check key metrics
    cpuUsage ← metrics.metrics.cpuUsage || 0
    memoryUsage ← metrics.metrics.memoryUsage || 0
    queueDepth ← metrics.metrics.queueDepth || 0
    workerSuccessRate ← metrics.metrics.workerSuccessRate || 100

    IF cpuUsage > 90 OR memoryUsage > 90 THEN
        RETURN 'degraded'
    END IF

    IF queueDepth > 1000 THEN
        RETURN 'degraded'
    END IF

    IF workerSuccessRate < 80 THEN
        RETURN 'degraded'
    END IF

    RETURN 'healthy'
END

TIME COMPLEXITY: O(a) where a = number of alerts
SPACE COMPLEXITY: O(1)
```

### Subroutine: calculateHealthScore(metrics, alerts)

```
ALGORITHM: calculateHealthScore
INPUT: metrics (MetricsSnapshot), alerts (Array<Alert>)
OUTPUT: number (0-100)

BEGIN
    score ← 100

    // Deduct for critical alerts
    criticalCount ← alerts.filter(a => a.severity == 'critical').length
    score ← score - (criticalCount * 20)

    // Deduct for warning alerts
    warningCount ← alerts.filter(a => a.severity == 'warning').length
    score ← score - (warningCount * 10)

    // Deduct for high CPU usage
    cpuUsage ← metrics.metrics.cpuUsage || 0
    IF cpuUsage > 80 THEN
        score ← score - ((cpuUsage - 80) / 2)
    END IF

    // Deduct for high memory usage
    memoryUsage ← metrics.metrics.memoryUsage || 0
    IF memoryUsage > 80 THEN
        score ← score - ((memoryUsage - 80) / 2)
    END IF

    // Deduct for high queue depth
    queueDepth ← metrics.metrics.queueDepth || 0
    IF queueDepth > 500 THEN
        score ← score - min(10, (queueDepth - 500) / 100)
    END IF

    // Deduct for low worker success rate
    successRate ← metrics.metrics.workerSuccessRate || 100
    IF successRate < 95 THEN
        score ← score - (95 - successRate)
    END IF

    // Ensure score is within bounds
    score ← max(0, min(100, score))

    RETURN round(score)
END

TIME COMPLEXITY: O(a) where a = number of alerts
SPACE COMPLEXITY: O(1)
```

### Subroutine: createTimeSeries(name, metrics, metricKey, unit)

```
ALGORITHM: createTimeSeries
INPUT: name (string), metrics (Array<MetricsSnapshot>), metricKey (string), unit (string)
OUTPUT: TimeSeries

BEGIN
    dataPoints ← []

    FOR EACH snapshot IN metrics DO
        value ← snapshot.metrics[metricKey]

        IF value IS NOT NULL THEN
            dataPoint ← {
                timestamp: snapshot.timestamp,
                value: value,
                metadata: {}
            }
            dataPoints.push(dataPoint)
        END IF
    END FOR

    timeSeries ← {
        name: name,
        unit: unit,
        dataPoints: dataPoints
    }

    RETURN timeSeries
END

TIME COMPLEXITY: O(n) where n = number of snapshots
SPACE COMPLEXITY: O(n)
```

### Subroutine: getTopErrors(hours)

```
ALGORITHM: getTopErrors
INPUT: hours (number)
OUTPUT: Promise<Array<ErrorSummary>>

BEGIN
    query ← `
        SELECT
            error_type,
            COUNT(*) as count,
            MAX(created_at) as last_occurrence,
            ARRAY_AGG(DISTINCT agent_name) as affected_agents
        FROM error_log
        WHERE created_at > NOW() - INTERVAL '$1 hours'
          AND resolved = false
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 10
    `

    result ← await database.query(query, [hours])

    errorSummaries ← []
    FOR EACH row IN result.rows DO
        summary ← {
            errorType: row.error_type,
            count: row.count,
            lastOccurrence: new Date(row.last_occurrence),
            affectedAgents: row.affected_agents.filter(a => a IS NOT NULL)
        }
        errorSummaries.push(summary)
    END FOR

    RETURN errorSummaries
END

TIME COMPLEXITY: O(n log n) where n = error logs (aggregation with sort)
SPACE COMPLEXITY: O(e) where e = unique error types
```

### Algorithm: subscribeToUpdates(callback)

```
ALGORITHM: subscribeToUpdates
INPUT: callback (Function: (DashboardData) => void)
OUTPUT: Subscription

BEGIN
    subscriptionId ← generateUUID()

    // Add to subscriber list
    subscribers.set(subscriptionId, callback)

    // Create unsubscribe function
    unsubscribe ← FUNCTION()
        subscribers.delete(subscriptionId)
        logger.info('Unsubscribed from dashboard updates', { subscriptionId })
    END FUNCTION

    logger.info('Subscribed to dashboard updates', { subscriptionId })

    // Return subscription object
    subscription ← {
        id: subscriptionId,
        unsubscribe: unsubscribe
    }

    RETURN subscription
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

### Background Process: broadcastDashboardUpdates()

```
ALGORITHM: broadcastDashboardUpdates
INPUT: none (runs in background)
OUTPUT: void

BEGIN
    WHILE true DO
        TRY
            // Get latest dashboard data
            dashboardData ← await getDashboardData()

            // Broadcast to all subscribers
            FOR EACH [subscriptionId, callback] IN subscribers DO
                TRY
                    callback(dashboardData)
                CATCH error
                    logger.error('Failed to notify subscriber', {
                        subscriptionId,
                        error
                    })
                    // Remove failed subscriber
                    subscribers.delete(subscriptionId)
                END TRY
            END FOR

        CATCH error
            logger.error('Failed to broadcast dashboard updates', { error })
        END TRY

        // Wait before next update (5 seconds)
        await sleep(5000)
    END WHILE
END

TIME COMPLEXITY: O(s) where s = number of subscribers (per iteration)
SPACE COMPLEXITY: O(1)
```

### Algorithm: getHistoricalData(metric, timeRange)

```
ALGORITHM: getHistoricalData
INPUT: metric (string), timeRange (TimeRange)
OUTPUT: Promise<TimeSeries>

BEGIN
    // Query specific metric from timeseries table
    query ← `
        SELECT
            timestamp,
            metric_value as value
        FROM metrics_timeseries
        WHERE metric_name = $1
          AND timestamp >= $2
          AND timestamp <= $3
        ORDER BY timestamp ASC
    `

    result ← await database.query(query, [
        metric,
        timeRange.start,
        timeRange.end
    ])

    dataPoints ← []
    FOR EACH row IN result.rows DO
        dataPoint ← {
            timestamp: new Date(row.timestamp),
            value: row.value,
            metadata: {}
        }
        dataPoints.push(dataPoint)
    END FOR

    // Aggregate if time range is large
    IF dataPoints.length > 1000 THEN
        aggregated ← aggregateDataPoints(dataPoints, timeRange.window)
        dataPoints ← aggregated
    END IF

    timeSeries ← {
        name: metric,
        unit: getMetricUnit(metric),
        dataPoints: dataPoints
    }

    RETURN timeSeries
END

TIME COMPLEXITY: O(n) where n = data points in range
SPACE COMPLEXITY: O(n)
```

---

## API Endpoints

### Endpoint: GET /api/avi/status

```
ENDPOINT: GET /api/avi/status
DESCRIPTION: Get current orchestrator status
AUTHENTICATION: Required

REQUEST:
    Query Parameters: none

RESPONSE:
    Status: 200 OK
    Body: {
        status: string (running, stopped, restarting, offline),
        uptime: number (milliseconds),
        contextSize: number (tokens),
        contextUtilization: number (percentage),
        activeWorkers: number,
        queueDepth: number,
        health: {
            healthy: boolean,
            issues: Array<string>
        },
        timestamp: Date
    }

ALGORITHM:
BEGIN
    // Collect current metrics
    metrics ← await metricsCollector.collectMetrics()

    // Extract orchestrator-specific metrics
    status ← {
        status: metrics.metrics.orchestratorStatus,
        uptime: metrics.metrics.orchestratorUptime,
        contextSize: metrics.metrics.contextSize,
        contextUtilization: metrics.metrics.contextUtilization,
        activeWorkers: metrics.metrics.activeWorkers,
        queueDepth: metrics.metrics.queueDepth,
        health: {
            healthy: metrics.metrics.cpuUsage < 90 AND
                     metrics.metrics.memoryUsage < 85 AND
                     metrics.metrics.queueDepth < 1000,
            issues: calculateHealthIssues(metrics)
        },
        timestamp: metrics.timestamp
    }

    RETURN response(200, status)
END
```

### Endpoint: GET /api/avi/metrics

```
ENDPOINT: GET /api/avi/metrics
DESCRIPTION: Get all current metrics
AUTHENTICATION: Required

REQUEST:
    Query Parameters:
        - category (optional): string - filter by category
        - start (optional): ISO date - time range start
        - end (optional): ISO date - time range end
        - window (optional): string - aggregation window (1m, 5m, 1h, etc.)

RESPONSE:
    Status: 200 OK
    Body: {
        metrics: MetricsSnapshot or Array<MetricsSnapshot>,
        aggregated: AggregatedMetrics (if window specified),
        timestamp: Date
    }

ALGORITHM:
BEGIN
    category ← request.query.category || 'all'
    start ← request.query.start ? new Date(request.query.start) : null
    end ← request.query.end ? new Date(request.query.end) : getCurrentTime()
    window ← request.query.window || null

    IF start IS NULL THEN
        // Get current snapshot only
        metrics ← await metricsCollector.collectMetrics()

        IF category != 'all' THEN
            metrics ← filterMetricsByCategory(metrics, category)
        END IF

        RETURN response(200, {
            metrics: metrics,
            timestamp: getCurrentTime()
        })
    ELSE
        // Get historical metrics
        timeRange ← { start, end, window }
        metrics ← await metricsCollector.getMetrics(category, timeRange)

        responseData ← {
            metrics: metrics,
            timestamp: getCurrentTime()
        }

        // Add aggregation if window specified
        IF window IS NOT NULL THEN
            aggregated ← await metricsCollector.aggregateMetrics(
                metrics,
                window
            )
            responseData.aggregated ← aggregated
        END IF

        RETURN response(200, responseData)
    END IF
END
```

### Endpoint: GET /api/avi/metrics/:category

```
ENDPOINT: GET /api/avi/metrics/:category
DESCRIPTION: Get metrics for specific category
AUTHENTICATION: Required

REQUEST:
    Path Parameters:
        - category: string (system, orchestrator, workers, queue, validation, database)
    Query Parameters:
        - start (optional): ISO date
        - end (optional): ISO date
        - window (optional): string

RESPONSE:
    Status: 200 OK
    Body: {
        category: string,
        metrics: MetricsSnapshot or Array<MetricsSnapshot>,
        aggregated: AggregatedMetrics (if window specified)
    }

ALGORITHM:
BEGIN
    category ← request.params.category

    // Validate category
    validCategories ← ['system', 'orchestrator', 'workers', 'queue', 'validation', 'database', 'all']

    IF NOT validCategories.includes(category) THEN
        RETURN response(400, { error: 'Invalid category' })
    END IF

    // Delegate to main metrics endpoint logic
    request.query.category ← category
    RETURN handleMetricsRequest(request)
END
```

### Endpoint: GET /api/avi/health

```
ENDPOINT: GET /api/avi/health
DESCRIPTION: Get system health status
AUTHENTICATION: Required

REQUEST:
    Query Parameters: none

RESPONSE:
    Status: 200 OK
    Body: {
        status: string (healthy, degraded, unhealthy, offline),
        health: number (0-100 health score),
        uptime: number (milliseconds),
        metrics: {
            cpuUsage: number,
            memoryUsage: number,
            activeWorkers: number,
            queueDepth: number,
            workerSuccessRate: number
        },
        alerts: Array<Alert> (active alerts),
        issues: Array<string>,
        timestamp: Date
    }

ALGORITHM:
BEGIN
    // Get current metrics
    metrics ← await metricsCollector.collectMetrics()

    // Get active alerts
    alerts ← await alertingService.getActiveAlerts()

    // Calculate status and health score
    status ← calculateSystemStatus(metrics, alerts)
    health ← calculateHealthScore(metrics, alerts)
    issues ← calculateHealthIssues(metrics)

    healthData ← {
        status: status,
        health: health,
        uptime: metrics.metrics.orchestratorUptime,
        metrics: {
            cpuUsage: metrics.metrics.cpuUsage,
            memoryUsage: metrics.metrics.memoryUsage,
            activeWorkers: metrics.metrics.activeWorkers,
            queueDepth: metrics.metrics.queueDepth,
            workerSuccessRate: metrics.metrics.workerSuccessRate
        },
        alerts: alerts,
        issues: issues,
        timestamp: getCurrentTime()
    }

    RETURN response(200, healthData)
END
```

### Endpoint: GET /api/avi/alerts

```
ENDPOINT: GET /api/avi/alerts
DESCRIPTION: Get alerts
AUTHENTICATION: Required

REQUEST:
    Query Parameters:
        - status (optional): string (active, acknowledged, resolved)
        - severity (optional): string (info, warning, critical)
        - start (optional): ISO date
        - end (optional): ISO date
        - limit (optional): number (default 100)

RESPONSE:
    Status: 200 OK
    Body: {
        alerts: Array<Alert>,
        total: number,
        timestamp: Date
    }

ALGORITHM:
BEGIN
    status ← request.query.status
    severity ← request.query.severity
    start ← request.query.start ? new Date(request.query.start) : null
    end ← request.query.end ? new Date(request.query.end) : getCurrentTime()
    limit ← request.query.limit || 100

    // Build query
    conditions ← []
    params ← []
    paramIndex ← 1

    IF status IS NOT NULL THEN
        conditions.push('status = $' + paramIndex)
        params.push(status)
        paramIndex ← paramIndex + 1
    END IF

    IF severity IS NOT NULL THEN
        conditions.push('severity = $' + paramIndex)
        params.push(severity)
        paramIndex ← paramIndex + 1
    END IF

    IF start IS NOT NULL THEN
        conditions.push('triggered_at >= $' + paramIndex)
        params.push(start)
        paramIndex ← paramIndex + 1
    END IF

    conditions.push('triggered_at <= $' + paramIndex)
    params.push(end)
    paramIndex ← paramIndex + 1

    whereClause ← conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    query ← `
        SELECT *
        FROM alerts
        ${whereClause}
        ORDER BY triggered_at DESC
        LIMIT $${paramIndex}
    `
    params.push(limit)

    result ← await database.query(query, params)

    alerts ← []
    FOR EACH row IN result.rows DO
        alert ← transformRowToAlert(row)
        alerts.push(alert)
    END FOR

    RETURN response(200, {
        alerts: alerts,
        total: alerts.length,
        timestamp: getCurrentTime()
    })
END
```

### Endpoint: POST /api/avi/alerts/:id/acknowledge

```
ENDPOINT: POST /api/avi/alerts/:id/acknowledge
DESCRIPTION: Acknowledge an alert
AUTHENTICATION: Required

REQUEST:
    Path Parameters:
        - id: string (alert ID)
    Body: none

RESPONSE:
    Status: 200 OK
    Body: {
        alert: Alert,
        acknowledged: boolean,
        timestamp: Date
    }

ALGORITHM:
BEGIN
    alertId ← request.params.id

    TRY
        // Acknowledge alert
        alert ← await alertingService.acknowledgeAlert(alertId)

        RETURN response(200, {
            alert: alert,
            acknowledged: true,
            timestamp: getCurrentTime()
        })

    CATCH error
        IF error.message.includes('not found') THEN
            RETURN response(404, { error: 'Alert not found' })
        ELSE
            RETURN response(500, { error: error.message })
        END IF
    END TRY
END
```

### WebSocket: /api/avi/realtime

```
WEBSOCKET: /api/avi/realtime
DESCRIPTION: Real-time dashboard updates
AUTHENTICATION: Required via query parameter or handshake

CONNECTION:
    Client connects with authentication token
    Server validates and establishes connection

MESSAGES:

1. Client → Server: subscribe
    {
        type: 'subscribe',
        channels: Array<string> (dashboard, metrics, alerts)
    }

2. Server → Client: subscribed
    {
        type: 'subscribed',
        channels: Array<string>
    }

3. Server → Client: dashboard_update
    {
        type: 'dashboard_update',
        data: DashboardData
    }

4. Server → Client: metrics_update
    {
        type: 'metrics_update',
        data: MetricsSnapshot
    }

5. Server → Client: alert_triggered
    {
        type: 'alert_triggered',
        data: Alert
    }

6. Client → Server: unsubscribe
    {
        type: 'unsubscribe',
        channels: Array<string>
    }

7. Server → Client: error
    {
        type: 'error',
        message: string
    }

ALGORITHM (Server-side handler):
BEGIN
    ON connection DO
        // Authenticate client
        token ← extractTokenFromQuery(request)

        IF NOT isValidToken(token) THEN
            socket.close(401, 'Unauthorized')
            RETURN
        END IF

        clientId ← generateClientId()
        clients.set(clientId, socket)

        logger.info('WebSocket client connected', { clientId })

        // Send initial dashboard data
        dashboardData ← await dashboardService.getDashboardData()
        socket.send(JSON.stringify({
            type: 'dashboard_update',
            data: dashboardData
        }))
    END ON

    ON message DO
        message ← JSON.parse(data)

        CASE message.type OF
            'subscribe':
                FOR EACH channel IN message.channels DO
                    subscribeClientToChannel(clientId, channel)
                END FOR

                socket.send(JSON.stringify({
                    type: 'subscribed',
                    channels: message.channels
                }))

            'unsubscribe':
                FOR EACH channel IN message.channels DO
                    unsubscribeClientFromChannel(clientId, channel)
                END FOR

            'ping':
                socket.send(JSON.stringify({ type: 'pong' }))

            DEFAULT:
                socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }))
        END CASE
    END ON

    ON close DO
        clients.delete(clientId)
        unsubscribeClientFromAllChannels(clientId)
        logger.info('WebSocket client disconnected', { clientId })
    END ON

    ON error DO
        logger.error('WebSocket error', { clientId, error })
    END ON
END

BROADCAST ALGORITHM:
BEGIN
    FUNCTION broadcastToChannel(channel, data)
        message ← JSON.stringify(data)

        subscribers ← getChannelSubscribers(channel)

        FOR EACH clientId IN subscribers DO
            socket ← clients.get(clientId)

            IF socket AND socket.readyState == OPEN THEN
                TRY
                    socket.send(message)
                CATCH error
                    logger.error('Failed to send to client', { clientId, error })
                    // Remove dead connection
                    clients.delete(clientId)
                    unsubscribeClientFromAllChannels(clientId)
                END TRY
            END IF
        END FOR
    END FUNCTION

    // Background process: broadcast updates every 5 seconds
    setInterval(async () => {
        dashboardData ← await dashboardService.getDashboardData()

        broadcastToChannel('dashboard', {
            type: 'dashboard_update',
            data: dashboardData
        })
    }, 5000)

    // Broadcast metrics updates every 10 seconds
    setInterval(async () => {
        metrics ← await metricsCollector.collectMetrics()

        broadcastToChannel('metrics', {
            type: 'metrics_update',
            data: metrics
        })
    }, 10000)

    // Broadcast alerts immediately when triggered
    alertingService.on('alert_triggered', (alert) => {
        broadcastToChannel('alerts', {
            type: 'alert_triggered',
            data: alert
        })
    })
END
```

---

## Database Operations

### Schema: metrics_snapshots

```sql
CREATE TABLE metrics_snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    category VARCHAR(50) NOT NULL,
    metrics_data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_snapshots_timestamp ON metrics_snapshots(timestamp DESC);
CREATE INDEX idx_metrics_snapshots_category ON metrics_snapshots(category);
CREATE INDEX idx_metrics_snapshots_category_timestamp ON metrics_snapshots(category, timestamp DESC);
```

### Schema: metrics_timeseries

```sql
CREATE TABLE metrics_timeseries (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_timeseries_name_timestamp ON metrics_timeseries(metric_name, timestamp DESC);
CREATE INDEX idx_metrics_timeseries_timestamp ON metrics_timeseries(timestamp DESC);
CREATE INDEX idx_metrics_timeseries_category ON metrics_timeseries(category);
```

### Schema: alerts

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    condition JSONB NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    triggered_at TIMESTAMP NOT NULL,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);
```

### Schema: alert_definitions

```sql
CREATE TABLE alert_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    condition JSONB NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    notification_channels JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_definitions_enabled ON alert_definitions(enabled);
```

### Schema: avi_state_history

```sql
CREATE TABLE avi_state_history (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    state_snapshot JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_avi_state_history_event_type ON avi_state_history(event_type);
CREATE INDEX idx_avi_state_history_created_at ON avi_state_history(created_at DESC);
```

### Query: Insert Metrics Snapshot

```sql
INSERT INTO metrics_snapshots (timestamp, category, metrics_data, metadata)
VALUES ($1, $2, $3, $4)
RETURNING id;
```

**Complexity:** O(log n) due to index updates

### Query: Get Metrics by Time Range

```sql
SELECT *
FROM metrics_snapshots
WHERE category = $1
  AND timestamp >= $2
  AND timestamp <= $3
ORDER BY timestamp ASC;
```

**Complexity:** O(log n + m) where m = rows returned (uses index)

### Query: Get Aggregated Metrics

```sql
SELECT
    date_trunc($1, timestamp) as bucket,
    AVG((metrics_data->>'cpuUsage')::numeric) as avg_cpu,
    MAX((metrics_data->>'cpuUsage')::numeric) as max_cpu,
    MIN((metrics_data->>'cpuUsage')::numeric) as min_cpu,
    COUNT(*) as count
FROM metrics_snapshots
WHERE timestamp >= $2
  AND timestamp <= $3
  AND category = $4
GROUP BY bucket
ORDER BY bucket ASC;
```

**Complexity:** O(n log n) where n = rows in range (aggregation)

### Query: Cleanup Old Metrics

```sql
DELETE FROM metrics_snapshots
WHERE timestamp < $1;

DELETE FROM metrics_timeseries
WHERE timestamp < $1;
```

**Complexity:** O(m) where m = rows deleted (with index on timestamp)

### Query: Insert Alert

```sql
INSERT INTO alerts (
    id, name, severity, status, condition, message, metadata, triggered_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;
```

**Complexity:** O(log n) due to index updates

### Query: Update Alert Status

```sql
UPDATE alerts
SET status = $1,
    acknowledged_at = CASE WHEN $1 = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
    resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END
WHERE id = $2
RETURNING *;
```

**Complexity:** O(log n) (indexed primary key lookup)

### Query: Get Active Alerts

```sql
SELECT *
FROM alerts
WHERE status IN ('active', 'acknowledged')
ORDER BY severity DESC, triggered_at DESC
LIMIT 100;
```

**Complexity:** O(log n + 100) (uses composite index)

---

## Caching Strategies

### Cache Structure

```
STRUCTURE: Cache
    store: Map<string, MetricsCacheEntry>
    maxSize: number (default 1000)
    defaultTTL: number (milliseconds, default 300000 = 5 minutes)

METHODS:
    get(key): MetricsCacheEntry | null
    set(key, data, ttl): void
    delete(key): void
    clear(): void
    cleanup(): void (remove expired entries)
END STRUCTURE
```

### Algorithm: Cache Get

```
ALGORITHM: cacheGet
INPUT: key (string)
OUTPUT: MetricsCacheEntry | null

BEGIN
    entry ← cache.store.get(key)

    IF entry IS NULL THEN
        RETURN null
    END IF

    // Check if expired
    IF entry.expiresAt < getCurrentTime() THEN
        cache.store.delete(key)
        RETURN null
    END IF

    // Increment hit count
    entry.hitCount ← entry.hitCount + 1

    RETURN entry
END

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)
```

### Algorithm: Cache Set

```
ALGORITHM: cacheSet
INPUT: key (string), data (any), ttl (number, optional)
OUTPUT: void

BEGIN
    // Check cache size limit
    IF cache.store.size >= cache.maxSize THEN
        evictLRU()
    END IF

    expiresAt ← getCurrentTime() + (ttl || cache.defaultTTL)

    entry ← {
        key: key,
        data: data,
        expiresAt: expiresAt,
        hitCount: 0
    }

    cache.store.set(key, entry)
END

TIME COMPLEXITY: O(1) amortized (O(n) worst case if eviction needed)
SPACE COMPLEXITY: O(1)
```

### Algorithm: Evict LRU (Least Recently Used)

```
ALGORITHM: evictLRU
INPUT: none
OUTPUT: void

BEGIN
    // Find entry with lowest hit count and oldest expiration
    minHitCount ← Infinity
    oldestExpiration ← Infinity
    evictKey ← null

    FOR EACH [key, entry] IN cache.store DO
        IF entry.hitCount < minHitCount OR
           (entry.hitCount == minHitCount AND entry.expiresAt < oldestExpiration) THEN
            minHitCount ← entry.hitCount
            oldestExpiration ← entry.expiresAt
            evictKey ← key
        END IF
    END FOR

    IF evictKey IS NOT NULL THEN
        cache.store.delete(evictKey)
        logger.debug('Evicted cache entry', { key: evictKey })
    END IF
END

TIME COMPLEXITY: O(n) where n = cache size
SPACE COMPLEXITY: O(1)
```

### Cache Keys

```
// Current metrics snapshot
Key: 'metrics:current'
TTL: 5 seconds
Data: MetricsSnapshot

// Active alerts
Key: 'alerts:active'
TTL: 30 seconds
Data: Array<Alert>

// Dashboard data
Key: 'dashboard:current'
TTL: 5 seconds
Data: DashboardData

// Historical metrics (parameterized)
Key: 'metrics:{category}:{start}:{end}:{window}'
TTL: 5 minutes
Data: Array<MetricsSnapshot>

// Aggregated metrics (parameterized)
Key: 'metrics:aggregated:{category}:{start}:{end}:{window}'
TTL: 5 minutes
Data: AggregatedMetrics

// Top errors
Key: 'errors:top:{hours}'
TTL: 1 minute
Data: Array<ErrorSummary>
```

### Algorithm: Generate Cache Key

```
ALGORITHM: generateCacheKey
INPUT: prefix (string), params (Map<string, any>)
OUTPUT: string

BEGIN
    keyParts ← [prefix]

    // Sort params by key for consistent cache keys
    sortedKeys ← params.keys().sort()

    FOR EACH key IN sortedKeys DO
        value ← params.get(key)

        // Convert dates to ISO strings
        IF value instanceof Date THEN
            value ← value.toISOString()
        END IF

        keyParts.push(key + ':' + value)
    END FOR

    cacheKey ← keyParts.join(':')

    RETURN cacheKey
END

TIME COMPLEXITY: O(k log k) where k = number of params (due to sort)
SPACE COMPLEXITY: O(k)
```

### Background Process: Cache Cleanup

```
ALGORITHM: scheduleCacheCleanup
INPUT: none
OUTPUT: void

BEGIN
    setInterval(() => {
        currentTime ← getCurrentTime()
        expiredCount ← 0

        FOR EACH [key, entry] IN cache.store DO
            IF entry.expiresAt < currentTime THEN
                cache.store.delete(key)
                expiredCount ← expiredCount + 1
            END IF
        END FOR

        IF expiredCount > 0 THEN
            logger.debug('Cleaned up expired cache entries', {
                count: expiredCount,
                remaining: cache.store.size
            })
        END IF
    }, 60000) // Run every minute
END

TIME COMPLEXITY: O(n) where n = cache size
SPACE COMPLEXITY: O(1)
```

---

## WebSocket Protocol

### Connection Flow

```
CLIENT                          SERVER
  │                               │
  ├──────── Connect ──────────────>│
  │         (with auth token)      │
  │                               │
  │<────── Authenticate ───────────┤
  │                               │
  │<──── Initial Dashboard Data ───┤
  │                               │
  ├──────── Subscribe ────────────>│
  │       { channels: [...] }      │
  │                               │
  │<────── Subscribed ─────────────┤
  │       { channels: [...] }      │
  │                               │
  │<──── Dashboard Updates ────────┤ (every 5s)
  │<──── Metrics Updates ──────────┤ (every 10s)
  │<──── Alert Triggered ──────────┤ (real-time)
  │                               │
  ├──────── Unsubscribe ──────────>│
  │       { channels: [...] }      │
  │                               │
  ├──────── Ping ─────────────────>│
  │<────── Pong ───────────────────┤
  │                               │
  ├──────── Disconnect ───────────>│
```

### Message Types

```
// 1. Subscribe
{
    type: 'subscribe',
    channels: ['dashboard', 'metrics', 'alerts']
}

// 2. Subscribed Confirmation
{
    type: 'subscribed',
    channels: ['dashboard', 'metrics', 'alerts']
}

// 3. Dashboard Update
{
    type: 'dashboard_update',
    data: {
        timestamp: '2025-10-12T10:30:00Z',
        overview: { ... },
        currentMetrics: { ... },
        recentAlerts: [ ... ],
        charts: { ... },
        topErrors: [ ... ]
    }
}

// 4. Metrics Update
{
    type: 'metrics_update',
    data: {
        timestamp: '2025-10-12T10:30:05Z',
        category: 'all',
        metrics: { ... },
        metadata: { ... }
    }
}

// 5. Alert Triggered
{
    type: 'alert_triggered',
    data: {
        id: 'uuid',
        name: 'High CPU Usage',
        severity: 'warning',
        message: 'CPU usage is above 90%',
        triggeredAt: '2025-10-12T10:30:10Z',
        metadata: { ... }
    }
}

// 6. Unsubscribe
{
    type: 'unsubscribe',
    channels: ['metrics']
}

// 7. Ping (heartbeat)
{
    type: 'ping'
}

// 8. Pong (response)
{
    type: 'pong'
}

// 9. Error
{
    type: 'error',
    message: 'Invalid message type'
}
```

### Client Subscription Management

```
STRUCTURE: ClientSubscription
    clientId: string
    socket: WebSocket
    channels: Set<string>
    lastSeen: Date
    authenticated: boolean
END STRUCTURE

GLOBAL STATE:
    clients: Map<string, ClientSubscription>
    channelSubscribers: Map<string, Set<string>> // channel -> clientIds

ALGORITHM: subscribeClientToChannel
INPUT: clientId (string), channel (string)
OUTPUT: void

BEGIN
    // Add client to channel subscribers
    IF NOT channelSubscribers.has(channel) THEN
        channelSubscribers.set(channel, new Set())
    END IF

    channelSubscribers.get(channel).add(clientId)

    // Add channel to client subscription
    client ← clients.get(clientId)
    IF client IS NOT NULL THEN
        client.channels.add(channel)
    END IF

    logger.debug('Client subscribed to channel', { clientId, channel })
END

ALGORITHM: unsubscribeClientFromChannel
INPUT: clientId (string), channel (string)
OUTPUT: void

BEGIN
    // Remove client from channel subscribers
    IF channelSubscribers.has(channel) THEN
        channelSubscribers.get(channel).delete(clientId)

        // Clean up empty channel
        IF channelSubscribers.get(channel).size == 0 THEN
            channelSubscribers.delete(channel)
        END IF
    END IF

    // Remove channel from client subscription
    client ← clients.get(clientId)
    IF client IS NOT NULL THEN
        client.channels.delete(channel)
    END IF

    logger.debug('Client unsubscribed from channel', { clientId, channel })
END

ALGORITHM: unsubscribeClientFromAllChannels
INPUT: clientId (string)
OUTPUT: void

BEGIN
    client ← clients.get(clientId)

    IF client IS NULL THEN
        RETURN
    END IF

    // Remove from all channels
    FOR EACH channel IN client.channels DO
        IF channelSubscribers.has(channel) THEN
            channelSubscribers.get(channel).delete(clientId)

            IF channelSubscribers.get(channel).size == 0 THEN
                channelSubscribers.delete(channel)
            END IF
        END IF
    END FOR

    client.channels.clear()

    logger.debug('Client unsubscribed from all channels', { clientId })
END

ALGORITHM: getChannelSubscribers
INPUT: channel (string)
OUTPUT: Set<string>

BEGIN
    IF NOT channelSubscribers.has(channel) THEN
        RETURN new Set()
    END IF

    RETURN channelSubscribers.get(channel)
END
```

### Heartbeat / Keep-Alive

```
ALGORITHM: clientHeartbeat
INPUT: none (runs in background)
OUTPUT: void

BEGIN
    setInterval(() => {
        currentTime ← getCurrentTime()
        deadClients ← []

        FOR EACH [clientId, client] IN clients DO
            timeSinceLastSeen ← currentTime - client.lastSeen

            // Check if client is stale (no activity for 60 seconds)
            IF timeSinceLastSeen > 60000 THEN
                logger.warn('Client connection stale', {
                    clientId,
                    timeSinceLastSeen
                })

                // Send ping to check if alive
                TRY
                    client.socket.send(JSON.stringify({ type: 'ping' }))
                CATCH error
                    // Connection dead
                    deadClients.push(clientId)
                END TRY
            END IF
        END FOR

        // Clean up dead connections
        FOR EACH clientId IN deadClients DO
            client ← clients.get(clientId)

            IF client IS NOT NULL THEN
                client.socket.close()
                clients.delete(clientId)
                unsubscribeClientFromAllChannels(clientId)

                logger.info('Cleaned up dead client connection', { clientId })
            END IF
        END FOR

    }, 30000) // Run every 30 seconds
END
```

---

## Complexity Analysis

### MetricsCollector

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| collectMetrics() | O(1) | O(1) | Fixed number of metrics |
| collectSystemMetrics() | O(c) | O(1) | c = CPU cores |
| collectOrchestratorMetrics() | O(1) | O(1) | Single-row queries |
| collectWorkerMetrics() | O(1) | O(1) | Aggregated queries |
| collectQueueMetrics() | O(1) | O(1) | Aggregated queries |
| collectValidationMetrics() | O(1) | O(1) | Aggregated queries |
| collectDatabaseMetrics() | O(1) | O(1) | Metadata queries |
| getMetrics() | O(n) | O(n) | n = snapshots in range |
| aggregateMetrics() | O(n log n) | O(n) | Sorting data points |
| storeMetrics() | O(m) | O(1) | m = individual metrics |
| cleanupOldMetrics() | O(d) | O(1) | d = rows deleted |

### AlertingService

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| evaluateAlerts() | O(a * c) | O(a) | a = alerts, c = conditions |
| evaluateCondition() | O(1) | O(1) | Simple comparison |
| meetsMinimumDuration() | O(h) | O(h) | h = historical snapshots |
| createAlert() | O(1) | O(1) | Object construction |
| sendAlert() | O(c) | O(c) | c = notification channels |
| sendToChannel() | O(1) | O(1) | External API call |
| acknowledgeAlert() | O(1) | O(1) | Single-row update |
| getActiveAlerts() | O(a) | O(a) | a = active alerts |
| getAlertHistory() | O(h) | O(h) | h = historical alerts |

### DashboardService

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| getDashboardData() | O(n) | O(n) | n = historical data points |
| calculateSystemStatus() | O(a) | O(1) | a = alerts |
| calculateHealthScore() | O(a) | O(1) | a = alerts |
| createTimeSeries() | O(n) | O(n) | n = snapshots |
| getTopErrors() | O(e log e) | O(e) | e = error logs |
| subscribeToUpdates() | O(1) | O(1) | Map insertion |
| broadcastDashboardUpdates() | O(s) | O(1) | s = subscribers |
| getHistoricalData() | O(n) | O(n) | n = data points |

### Cache Operations

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| get() | O(1) | O(1) | Hash map lookup |
| set() | O(1) amortized | O(1) | O(n) if eviction |
| delete() | O(1) | O(1) | Hash map deletion |
| clear() | O(n) | O(1) | n = cache entries |
| evictLRU() | O(n) | O(1) | Full scan for LRU |
| cleanup() | O(n) | O(1) | Scan all entries |

### WebSocket Operations

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| connect() | O(1) | O(1) | New connection |
| subscribe() | O(c) | O(c) | c = channels |
| unsubscribe() | O(c) | O(c) | c = channels |
| broadcastToChannel() | O(s) | O(1) | s = subscribers |
| disconnect() | O(c) | O(1) | c = client channels |
| heartbeat() | O(n) | O(1) | n = clients |

### Database Queries

| Query | Time Complexity | Space Complexity | Notes |
|-------|----------------|------------------|-------|
| INSERT metrics | O(log n) | O(1) | Index updates |
| SELECT metrics by range | O(log n + m) | O(m) | m = rows returned |
| SELECT aggregated | O(n log n) | O(b) | b = buckets |
| DELETE old metrics | O(d) | O(1) | d = rows deleted |
| INSERT alert | O(log n) | O(1) | Index updates |
| UPDATE alert | O(log n) | O(1) | Indexed lookup |
| SELECT active alerts | O(log n + 100) | O(1) | Limit 100 |

---

## Performance Optimizations

### 1. Batch Metric Collection

```
OPTIMIZATION: Collect all metrics in parallel using Promise.all()

BEFORE (Sequential):
    systemMetrics ← await collectSystemMetrics()      // 50ms
    orchestratorMetrics ← await collectOrchestratorMetrics() // 20ms
    workerMetrics ← await collectWorkerMetrics()      // 30ms
    ... (total: 200ms)

AFTER (Parallel):
    [systemMetrics, orchestratorMetrics, workerMetrics, ...] ←
        await Promise.all([
            collectSystemMetrics(),
            collectOrchestratorMetrics(),
            collectWorkerMetrics(),
            ...
        ]) // 50ms (max of all)

SPEEDUP: 4x faster (200ms → 50ms)
```

### 2. Cache Hot Paths

```
OPTIMIZATION: Cache frequently accessed data with short TTL

HOT PATHS:
    - Current metrics snapshot (5s TTL)
    - Active alerts (30s TTL)
    - Dashboard data (5s TTL)

CACHE HIT RATE: ~80% (reduces DB queries by 80%)
```

### 3. Aggregation in Database

```
OPTIMIZATION: Use PostgreSQL aggregation instead of app-level

BEFORE (App-level):
    rows ← SELECT all metrics // 1000 rows
    averages ← calculate in JavaScript // 100ms

AFTER (Database-level):
    result ← SELECT AVG(metric_value) GROUP BY bucket // 1 row, 5ms

SPEEDUP: 20x faster (100ms → 5ms)
```

### 4. Index Optimization

```
OPTIMIZATION: Composite indexes for common queries

CREATE INDEX idx_metrics_category_timestamp
    ON metrics_snapshots(category, timestamp DESC);

QUERY:
    SELECT * FROM metrics_snapshots
    WHERE category = 'system' AND timestamp >= ...

PERFORMANCE: Uses index scan instead of full table scan
SPEEDUP: 100x faster for large tables
```

### 5. Connection Pooling

```
OPTIMIZATION: Reuse database connections

CONFIGURATION:
    pool.min = 5
    pool.max = 20
    pool.idleTimeoutMillis = 30000

BENEFIT: Eliminates connection overhead (~50ms per query)
```

### 6. Metric Retention Policy

```
OPTIMIZATION: Automatically delete old metrics

RETENTION:
    - Raw snapshots: 7 days
    - Aggregated hourly: 30 days
    - Aggregated daily: 365 days

BENEFIT: Keeps database size manageable, queries fast
```

---

## Error Handling

### Graceful Degradation

```
ALGORITHM: collectMetricsWithFallback
INPUT: none
OUTPUT: MetricsSnapshot (possibly partial)

BEGIN
    snapshot ← {
        timestamp: getCurrentTime(),
        category: 'all',
        metrics: {},
        metadata: { errors: [] }
    }

    // Try to collect each category independently
    categories ← [
        'system',
        'orchestrator',
        'workers',
        'queue',
        'validation',
        'database'
    ]

    FOR EACH category IN categories DO
        TRY
            metrics ← await collectCategoryMetrics(category)
            Object.assign(snapshot.metrics, metrics)
        CATCH error
            logger.error('Failed to collect metrics', { category, error })
            snapshot.metadata.errors.push({
                category: category,
                error: error.message
            })
            // Continue with other categories
        END TRY
    END FOR

    RETURN snapshot
END
```

### Database Connection Failure

```
ALGORITHM: handleDatabaseError
INPUT: operation (string), error (Error)
OUTPUT: void

BEGIN
    logger.error('Database error', { operation, error })

    // Check if connection error
    IF isConnectionError(error) THEN
        logger.warn('Database connection lost, attempting reconnect')

        TRY
            await database.reconnect()
            logger.info('Database reconnected successfully')
        CATCH reconnectError
            logger.error('Failed to reconnect to database', { error: reconnectError })

            // Emit alert
            await alertingService.sendAlert({
                severity: 'critical',
                name: 'Database Connection Lost',
                message: 'Unable to reconnect to PostgreSQL database'
            })
        END TRY
    END IF
END
```

### WebSocket Error Recovery

```
ALGORITHM: handleWebSocketError
INPUT: clientId (string), error (Error)
OUTPUT: void

BEGIN
    logger.error('WebSocket error', { clientId, error })

    client ← clients.get(clientId)

    IF client IS NULL THEN
        RETURN
    END IF

    // Try to notify client of error
    TRY
        client.socket.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error'
        }))
    CATCH sendError
        // Connection is dead, clean up
        clients.delete(clientId)
        unsubscribeClientFromAllChannels(clientId)
        logger.info('Cleaned up failed WebSocket connection', { clientId })
    END TRY
END
```

---

## Monitoring the Monitor

### Self-Health Check

```
ALGORITHM: monitoringSystemSelfCheck
INPUT: none
OUTPUT: HealthStatus

BEGIN
    issues ← []
    healthy ← true

    // Check metrics collection
    lastMetricsTime ← cache.get('metrics:current')?.timestamp
    IF lastMetricsTime IS NULL OR (getCurrentTime() - lastMetricsTime) > 60000 THEN
        issues.push('Metrics collection not running')
        healthy ← false
    END IF

    // Check database connectivity
    TRY
        await database.query('SELECT 1')
    CATCH error
        issues.push('Database connection failed')
        healthy ← false
    END TRY

    // Check alert system
    IF NOT alertingService.isRunning() THEN
        issues.push('Alerting service not running')
        healthy ← false
    END IF

    // Check WebSocket server
    IF websocketServer.clientCount == 0 AND isProduction THEN
        issues.push('No WebSocket clients connected')
        // Not critical, just informational
    END IF

    RETURN {
        healthy: healthy,
        issues: issues,
        timestamp: getCurrentTime()
    }
END
```

---

## Summary

This pseudocode provides:

1. **Complete algorithmic specifications** for all Phase 5 components
2. **Line-by-line logic** ready for TypeScript implementation
3. **Database schemas and queries** with indexes
4. **Caching strategies** for performance optimization
5. **WebSocket protocol** with connection management
6. **Complexity analysis** for all major operations
7. **Error handling** and graceful degradation
8. **Real-time updates** via WebSocket broadcasting

All algorithms are designed to be:
- **Efficient**: O(1) or O(log n) for most operations
- **Scalable**: Handles large datasets with aggregation
- **Reliable**: Graceful error handling and fallbacks
- **Real-time**: WebSocket updates every 5-10 seconds

Ready for direct translation to TypeScript.
