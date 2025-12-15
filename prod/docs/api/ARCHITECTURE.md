# API Architecture Overview

## System Architecture

The Distributed Posting Intelligence API is built on a microservices architecture designed for scalability, resilience, and high performance. This document outlines the core architectural principles, components, and design decisions.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web Apps  │  Mobile Apps  │  Third-party  │  CLI Tools  │  SDKs/Libraries │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Authentication  │  Rate Limiting  │  Load Balancing  │  Request Routing   │
│  CORS Handling   │  SSL Termination │  Monitoring     │  Circuit Breaking  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Microservices Layer                                │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ Posting         │ Agent           │ Feed            │ Content                 │
│ Intelligence    │ Coordination    │ Intelligence    │ Management              │
│ Service         │ Service         │ Service         │ Service                 │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ • Content       │ • Task          │ • Analytics     │ • Templates             │
│   Composition   │   Orchestration │   Engine        │ • Quality Rules         │
│ • Quality       │ • Agent         │ • Optimization  │ • Pattern Analysis      │
│   Analysis      │   Management    │   Engine        │ • Metadata Storage      │
│ • AI Models     │ • Coordination  │ • Health        │                         │
│   Integration   │   Logic         │   Monitoring    │                         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Infrastructure Layer                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ Data Storage    │ Message Queue   │ Cache Layer     │ External Services       │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ • PostgreSQL    │ • Redis Queue   │ • Redis Cache   │ • OpenAI GPT            │
│ • MongoDB       │ • Apache Kafka  │ • Memcached     │ • Claude AI             │
│ • Time Series   │ • RabbitMQ      │ • CDN           │ • Social Media APIs     │
│   Database      │                 │                 │ • Analytics Providers   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘
```

## 🔧 Core Components

### 1. API Gateway

**Technology**: Kong / AWS API Gateway / Nginx
**Responsibilities**:
- Request routing and load balancing
- Authentication and authorization
- Rate limiting and throttling
- SSL termination
- Request/response transformation
- Monitoring and logging
- Circuit breaking and retry logic

**Configuration Example**:
```yaml
# Kong configuration
services:
  - name: posting-intelligence
    url: http://posting-service:8080
    routes:
      - name: posts-route
        paths: ["/api/posts"]
        strip_path: false
        
plugins:
  - name: rate-limiting
    config:
      minute: 1000
      hour: 10000
      
  - name: key-auth
    config:
      key_names: ["X-API-Key"]
      
  - name: cors
    config:
      origins: ["*"]
      methods: ["GET", "POST", "PUT", "DELETE"]
```

### 2. Posting Intelligence Service

**Technology**: Node.js/Express, Python/FastAPI
**Port**: 8080
**Database**: PostgreSQL, MongoDB

**Core Modules**:
```typescript
interface PostingIntelligenceService {
  // Content composition endpoints
  composeContent(request: ComposeRequest): Promise<ComposedContent>;
  
  // Quality analysis
  analyzeQuality(content: string, platform: Platform): Promise<QualityAnalysis>;
  
  // Template management
  getTemplates(filters: TemplateFilters): Promise<Template[]>;
  createTemplate(template: TemplateCreate): Promise<Template>;
}
```

**AI Integration**:
```typescript
class AIContentGenerator {
  private models: {
    gpt4: OpenAIClient;
    claude: ClaudeClient;
    internal: InternalModelClient;
  };
  
  async generateContent(params: GenerationParams): Promise<GeneratedContent> {
    const model = this.selectModel(params);
    const result = await model.complete(params);
    return this.postProcess(result, params);
  }
  
  private selectModel(params: GenerationParams): AIModel {
    // Model selection logic based on content type, quality requirements, etc.
    if (params.requiresHighCreativity) return this.models.gpt4;
    if (params.requiresFastResponse) return this.models.internal;
    return this.models.claude;
  }
}
```

### 3. Agent Coordination Service

**Technology**: Python/FastAPI, Go
**Port**: 8081
**Database**: PostgreSQL, Redis

**Agent Architecture**:
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from asyncio import Queue

class Agent(ABC):
    def __init__(self, agent_id: str, capabilities: List[str]):
        self.agent_id = agent_id
        self.capabilities = capabilities
        self.task_queue = Queue()
        self.status = "idle"
    
    @abstractmethod
    async def execute_task(self, task: Task) -> TaskResult:
        pass
    
    async def process_queue(self):
        while True:
            task = await self.task_queue.get()
            try:
                self.status = "busy"
                result = await self.execute_task(task)
                await self.report_result(result)
            finally:
                self.status = "idle"

class ResearcherAgent(Agent):
    async def execute_task(self, task: Task) -> TaskResult:
        if task.type == "competitor_analysis":
            return await self.analyze_competitors(task.parameters)
        elif task.type == "trend_research":
            return await self.research_trends(task.parameters)
        
class CoordinationEngine:
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.task_graph = TaskGraph()
    
    async def coordinate_task(self, main_task: MainTask) -> TaskCoordinationResult:
        # Break down main task into subtasks
        subtasks = self.decompose_task(main_task)
        
        # Create execution plan
        execution_plan = self.create_execution_plan(subtasks)
        
        # Execute with coordination
        return await self.execute_plan(execution_plan)
```

**Task Orchestration**:
```python
class TaskOrchestrator:
    def __init__(self):
        self.dependency_graph = DependencyGraph()
        self.executor_pool = ExecutorPool()
    
    async def execute_parallel_tasks(self, tasks: List[Task]) -> List[TaskResult]:
        # Group independent tasks
        parallel_groups = self.group_by_dependencies(tasks)
        results = []
        
        for group in parallel_groups:
            # Execute group in parallel
            group_results = await asyncio.gather(
                *[self.execute_single_task(task) for task in group]
            )
            results.extend(group_results)
            
        return results
```

### 4. Feed Intelligence Service

**Technology**: Python/FastAPI, Apache Kafka
**Port**: 8082
**Database**: InfluxDB (time series), PostgreSQL

**Analytics Engine**:
```python
class AnalyticsEngine:
    def __init__(self):
        self.time_series_db = InfluxDBClient()
        self.analytics_processor = AnalyticsProcessor()
        self.ml_predictor = MLPredictor()
    
    async def generate_analytics(self, params: AnalyticsParams) -> AnalyticsResult:
        # Fetch raw data
        raw_data = await self.fetch_analytics_data(params)
        
        # Process and aggregate
        processed_data = self.analytics_processor.process(raw_data)
        
        # Generate insights
        insights = await self.ml_predictor.generate_insights(processed_data)
        
        return AnalyticsResult(
            metrics=processed_data.metrics,
            trends=insights.trends,
            predictions=insights.predictions,
            recommendations=insights.recommendations
        )

class OptimizationEngine:
    def __init__(self):
        self.ml_model = OptimizationMLModel()
        self.rule_engine = OptimizationRuleEngine()
    
    async def optimize_feed(self, request: OptimizationRequest) -> OptimizationResult:
        # Analyze current performance
        current_performance = await self.analyze_current_performance(request)
        
        # Generate optimization strategies
        strategies = await self.generate_strategies(current_performance, request.goals)
        
        # Rank and prioritize
        prioritized_strategies = self.prioritize_strategies(strategies)
        
        return OptimizationResult(
            recommendations=prioritized_strategies,
            predicted_improvements=self.predict_improvements(prioritized_strategies),
            implementation_plan=self.create_implementation_plan(prioritized_strategies)
        )
```

### 5. Content Management Service

**Technology**: Node.js/Express, TypeScript
**Port**: 8083
**Database**: PostgreSQL, MongoDB

**Template Engine**:
```typescript
class TemplateEngine {
  private templateRepo: TemplateRepository;
  private variableResolver: VariableResolver;
  
  async processTemplate(templateId: string, variables: Record<string, any>): Promise<string> {
    const template = await this.templateRepo.findById(templateId);
    
    // Validate variables
    await this.validateVariables(template.variables, variables);
    
    // Resolve template
    const resolved = this.variableResolver.resolve(template.content, variables);
    
    // Post-process (formatting, validation, etc.)
    return this.postProcess(resolved, template.metadata);
  }
  
  private async validateVariables(
    templateVars: TemplateVariable[], 
    provided: Record<string, any>
  ): Promise<void> {
    for (const templateVar of templateVars) {
      if (templateVar.required && !(templateVar.name in provided)) {
        throw new ValidationError(`Required variable '${templateVar.name}' not provided`);
      }
      
      if (templateVar.name in provided) {
        await this.validateVariableValue(templateVar, provided[templateVar.name]);
      }
    }
  }
}

class QualityRuleEngine {
  private rules: Map<string, QualityRule> = new Map();
  
  async evaluateContent(content: string, context: EvaluationContext): Promise<QualityScore> {
    const applicableRules = this.getApplicableRules(context);
    const ruleResults: RuleResult[] = [];
    
    for (const rule of applicableRules) {
      const result = await this.evaluateRule(rule, content, context);
      ruleResults.push(result);
    }
    
    return this.calculateOverallScore(ruleResults);
  }
  
  private async evaluateRule(
    rule: QualityRule, 
    content: string, 
    context: EvaluationContext
  ): Promise<RuleResult> {
    const evaluator = this.getRuleEvaluator(rule.type);
    const score = await evaluator.evaluate(content, rule.criteria, context);
    
    return {
      ruleId: rule.id,
      score: score,
      weight: rule.weight,
      passed: score >= rule.thresholds.pass_score,
      suggestions: score < rule.thresholds.pass_score 
        ? await evaluator.getSuggestions(content, rule.criteria)
        : []
    };
  }
}
```

## 🗄️ Data Architecture

### Database Selection Strategy

```typescript
interface DatabaseStrategy {
  // Relational data (users, templates, rules)
  postgresql: {
    tables: ['users', 'api_keys', 'templates', 'quality_rules', 'agent_configs'];
    features: ['ACID compliance', 'complex queries', 'referential integrity'];
  };
  
  // Document data (content, analytics results)
  mongodb: {
    collections: ['generated_content', 'analytics_results', 'task_results'];
    features: ['flexible schema', 'horizontal scaling', 'rich queries'];
  };
  
  // Time series data (metrics, performance data)
  influxdb: {
    measurements: ['api_metrics', 'agent_performance', 'feed_analytics'];
    features: ['time-based queries', 'data retention', 'aggregations'];
  };
  
  // Caching and sessions
  redis: {
    usage: ['rate limiting', 'caching', 'session storage', 'message queuing'];
    features: ['sub-millisecond latency', 'pub/sub', 'data structures'];
  };
}
```

### Data Models

**PostgreSQL Schema**:
```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  restrictions JSONB,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Templates
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  platforms VARCHAR(50)[] NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  usage_stats JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality Rules
CREATE TABLE quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  criteria JSONB NOT NULL,
  weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  platforms VARCHAR(50)[] DEFAULT ARRAY['all'],
  content_types VARCHAR(50)[] DEFAULT ARRAY['all'],
  active BOOLEAN NOT NULL DEFAULT true,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Configurations
CREATE TABLE agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  capabilities TEXT[] NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_templates_category ON content_templates(category);
CREATE INDEX idx_templates_platforms ON content_templates USING GIN(platforms);
CREATE INDEX idx_templates_tags ON content_templates USING GIN(tags);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_quality_rules_type ON quality_rules(rule_type);
CREATE INDEX idx_agent_configs_type ON agent_configs(agent_type);
```

**MongoDB Collections**:
```typescript
// Generated Content Collection
interface GeneratedContent {
  _id: ObjectId;
  request_id: string;
  user_id: string;
  content_type: 'original' | 'enhance' | 'template_based' | 'ai_generated';
  platform: Platform;
  input_content?: string;
  generated_content: string;
  alternatives: Array<{
    content: string;
    score: number;
    focus: string;
  }>;
  quality_score: number;
  metadata: {
    character_count: number;
    word_count: number;
    hashtags: string[];
    estimated_reach: number;
    processing_time_ms: number;
    model_version: string;
  };
  created_at: Date;
}

// Task Results Collection
interface TaskResult {
  _id: ObjectId;
  task_id: string;
  user_id: string;
  main_task: string;
  strategy: 'parallel' | 'sequential' | 'adaptive' | 'hybrid';
  subtasks: Array<{
    id: string;
    description: string;
    agent_type: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    result?: any;
    started_at?: Date;
    completed_at?: Date;
  }>;
  overall_status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed';
  results: any;
  performance_metrics: {
    total_time_ms: number;
    agent_time_breakdown: Record<string, number>;
    resource_usage: any;
  };
  created_at: Date;
  updated_at: Date;
}

// Analytics Results Collection
interface AnalyticsResult {
  _id: ObjectId;
  user_id: string;
  time_range: {
    start: Date;
    end: Date;
    granularity: 'hourly' | 'daily' | 'weekly';
  };
  platforms: Platform[];
  metrics: {
    engagement: any;
    reach: any;
    performance: any;
  };
  trends: Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    change_percentage: number;
    significance: 'high' | 'medium' | 'low';
  }>;
  generated_at: Date;
}
```

**InfluxDB Schema**:
```typescript
// API Metrics
interface APIMetrics {
  time: Date;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  user_id: string;
  api_key_id: string;
  rate_limit_remaining: number;
}

// Agent Performance
interface AgentPerformance {
  time: Date;
  agent_id: string;
  agent_type: string;
  task_type: string;
  execution_time_ms: number;
  quality_score: number;
  success: boolean;
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
  };
}

// Feed Analytics
interface FeedAnalytics {
  time: Date;
  user_id: string;
  platform: string;
  post_id: string;
  engagement_metrics: {
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
  };
  reach_metrics: {
    impressions: number;
    unique_reach: number;
  };
}
```

## 🔄 Message Queue Architecture

### Event-Driven Communication

```typescript
// Event Types
type SystemEvent = 
  | TaskCreatedEvent
  | TaskCompletedEvent
  | ContentGeneratedEvent
  | QualityAnalyzedEvent
  | AnalyticsUpdatedEvent;

interface TaskCreatedEvent {
  type: 'task.created';
  task_id: string;
  user_id: string;
  task_details: any;
  timestamp: Date;
}

interface TaskCompletedEvent {
  type: 'task.completed';
  task_id: string;
  user_id: string;
  results: any;
  performance_metrics: any;
  timestamp: Date;
}

// Event Bus Implementation
class EventBus {
  private queues: Map<string, Queue> = new Map();
  
  async publish(event: SystemEvent): Promise<void> {
    const routingKey = this.getRoutingKey(event);
    const queue = this.queues.get(routingKey);
    
    if (queue) {
      await queue.add(event, {
        priority: this.getPriority(event),
        delay: this.getDelay(event),
        attempts: 3,
        backoff: 'exponential'
      });
    }
  }
  
  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    const queue = this.getOrCreateQueue(eventType);
    
    queue.process(async (job) => {
      try {
        await handler(job.data);
      } catch (error) {
        console.error(`Event processing failed: ${error.message}`);
        throw error; // Let queue handle retry
      }
    });
  }
}
```

### Queue Configuration

```yaml
# Redis Queue Configuration
queues:
  high_priority:
    concurrency: 10
    priority_range: [90, 100]
    max_retries: 5
    
  normal_priority:
    concurrency: 5
    priority_range: [50, 89]
    max_retries: 3
    
  low_priority:
    concurrency: 2
    priority_range: [1, 49]
    max_retries: 1

# Kafka Topics
topics:
  content_events:
    partitions: 6
    replication_factor: 3
    retention_hours: 168  # 7 days
    
  analytics_events:
    partitions: 12
    replication_factor: 3
    retention_hours: 720  # 30 days
    
  system_events:
    partitions: 3
    replication_factor: 3
    retention_hours: 8760  # 1 year
```

## 🔐 Security Architecture

### Authentication Flow

```typescript
class AuthenticationService {
  async authenticateRequest(request: Request): Promise<AuthContext> {
    const apiKey = request.headers['x-api-key'];
    const bearerToken = request.headers['authorization']?.replace('Bearer ', '');
    
    if (apiKey) {
      return await this.authenticateApiKey(apiKey);
    } else if (bearerToken) {
      return await this.authenticateJWT(bearerToken);
    }
    
    throw new UnauthorizedError('Authentication required');
  }
  
  private async authenticateApiKey(keyString: string): Promise<AuthContext> {
    const keyHash = this.hashApiKey(keyString);
    const apiKey = await this.apiKeyRepo.findByHash(keyHash);
    
    if (!apiKey || apiKey.expired) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    // Update last used timestamp
    await this.apiKeyRepo.updateLastUsed(apiKey.id);
    
    return {
      user_id: apiKey.user_id,
      scopes: apiKey.scopes,
      rate_limits: this.getRateLimits(apiKey.user.plan),
      restrictions: apiKey.restrictions
    };
  }
}
```

### Rate Limiting Implementation

```typescript
class RateLimiter {
  private redis: RedisClient;
  
  async checkRateLimit(
    key: string, 
    limits: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    
    // Sliding window rate limiting
    const windowKeys = Object.entries(limits).map(([window, limit]) => {
      const windowSize = this.parseWindow(window);
      const windowStart = now - windowSize;
      const redisKey = `rate_limit:${key}:${window}`;
      
      // Remove old entries
      pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
      
      // Count current entries
      pipeline.zcard(redisKey);
      
      // Add current request
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      
      // Set expiry
      pipeline.expire(redisKey, Math.ceil(windowSize / 1000));
      
      return { window, limit, redisKey };
    });
    
    const results = await pipeline.exec();
    
    // Check if any limit is exceeded
    for (let i = 0; i < windowKeys.length; i++) {
      const { window, limit } = windowKeys[i];
      const count = results[i * 4 + 1][1] as number; // zcard result
      
      if (count > limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetTime: now + this.parseWindow(window),
          retryAfter: Math.ceil(this.parseWindow(window) / 1000)
        };
      }
    }
    
    return {
      allowed: true,
      limit: limits['1h'] || 1000,
      remaining: limits['1h'] - (results[1][1] as number),
      resetTime: now + 3600000 // 1 hour
    };
  }
}
```

## 📊 Monitoring and Observability

### Metrics Collection

```typescript
class MetricsCollector {
  private influxDB: InfluxDBClient;
  private prometheus: PrometheusRegistry;
  
  // HTTP request metrics
  recordHTTPRequest(req: Request, res: Response, duration: number): void {
    const point = new Point('http_requests')
      .tag('method', req.method)
      .tag('endpoint', this.normalizeEndpoint(req.path))
      .tag('status_code', res.statusCode.toString())
      .intField('response_time_ms', duration)
      .timestamp(new Date());
      
    this.influxDB.writePoint(point);
    
    // Prometheus metrics
    this.prometheus.getMetric('http_request_duration_seconds')
      .labels(req.method, req.path, res.statusCode.toString())
      .observe(duration / 1000);
  }
  
  // Agent performance metrics
  recordAgentExecution(
    agentId: string, 
    taskType: string, 
    duration: number, 
    success: boolean
  ): void {
    const point = new Point('agent_executions')
      .tag('agent_id', agentId)
      .tag('task_type', taskType)
      .tag('success', success.toString())
      .intField('execution_time_ms', duration)
      .timestamp(new Date());
      
    this.influxDB.writePoint(point);
  }
  
  // Content quality metrics
  recordContentQuality(platform: string, qualityScore: number): void {
    const point = new Point('content_quality')
      .tag('platform', platform)
      .floatField('quality_score', qualityScore)
      .timestamp(new Date());
      
    this.influxDB.writePoint(point);
  }
}
```

### Distributed Tracing

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

class TracingService {
  private tracer = trace.getTracer('posting-intelligence-api', '1.0.0');
  
  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string>
  ): Promise<T> {
    const span = this.tracer.startSpan(operationName, { attributes });
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), operation);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

// Usage in service methods
class PostingIntelligenceService {
  async composeContent(request: ComposeRequest): Promise<ComposedContent> {
    return await this.tracing.traceOperation(
      'compose_content',
      async () => {
        // Content composition logic
        const aiResult = await this.aiGenerator.generate(request);
        const qualityScore = await this.qualityAnalyzer.analyze(aiResult);
        
        return {
          content: aiResult.content,
          quality_score: qualityScore,
          metadata: aiResult.metadata
        };
      },
      {
        'content.type': request.content_type,
        'content.platform': request.platform,
        'user.id': request.user_id
      }
    );
  }
}
```

## 🚀 Deployment Architecture

### Container Orchestration

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: posting-intelligence-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: posting-intelligence
  template:
    metadata:
      labels:
        app: posting-intelligence
    spec:
      containers:
      - name: posting-intelligence
        image: agentfeed/posting-intelligence:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: posting-intelligence-service
spec:
  selector:
    app: posting-intelligence
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### Infrastructure as Code

```hcl
# Terraform configuration
resource "aws_ecs_cluster" "main" {
  name = "posting-intelligence-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "posting_intelligence" {
  name            = "posting-intelligence"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.posting_intelligence.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.posting_intelligence.arn
    container_name   = "posting-intelligence"
    container_port   = 8080
  }
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }
}

resource "aws_ecs_task_definition" "posting_intelligence" {
  family                   = "posting-intelligence"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  
  container_definitions = jsonencode([
    {
      name  = "posting-intelligence"
      image = "agentfeed/posting-intelligence:latest"
      
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.database_url.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/posting-intelligence"
          awslogs-region        = "us-east-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}
```

## 🔧 Performance Optimization

### Caching Strategy

```typescript
class CachingService {
  private redis: RedisClient;
  private localCache: LRUCache;
  
  async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
    // L1: Local cache (fastest)
    let value = this.localCache.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // L2: Redis cache (fast)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      value = JSON.parse(redisValue);
      this.localCache.set(key, value);
      return value;
    }
    
    // L3: Fallback (database/computation)
    if (fallback) {
      value = await fallback();
      if (value !== null) {
        await this.set(key, value, 300); // 5 minute TTL
      }
    }
    
    return value;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Set in both caches
    this.localCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Cache usage patterns
class PostingIntelligenceService {
  async getTemplates(filters: TemplateFilters): Promise<Template[]> {
    const cacheKey = `templates:${this.hashFilters(filters)}`;
    
    return await this.cache.get(cacheKey, async () => {
      return await this.templateRepo.findByFilters(filters);
    });
  }
}
```

### Database Optimization

```sql
-- Query optimization examples

-- Efficient template search with full-text search
CREATE INDEX idx_templates_content_search 
  ON content_templates 
  USING gin(to_tsvector('english', name || ' ' || description || ' ' || content));

-- Partial index for active templates only
CREATE INDEX idx_templates_active 
  ON content_templates (category, created_at DESC) 
  WHERE status = 'active';

-- Composite index for common query patterns
CREATE INDEX idx_quality_rules_lookup 
  ON quality_rules (rule_type, active) 
  WHERE active = true;

-- Optimized query with proper index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM content_templates 
WHERE category = 'tech' 
  AND status = 'active' 
  AND 'twitter' = ANY(platforms)
ORDER BY created_at DESC 
LIMIT 20;
```

This architecture provides a solid foundation for scalable, maintainable, and high-performance API operations while maintaining security, observability, and reliability standards.