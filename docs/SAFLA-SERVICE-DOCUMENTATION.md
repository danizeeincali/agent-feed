# SAFLA Service Documentation

**Self-Aware Feedback Loop Algorithm - Production Implementation**

## Overview

The SAFLA Service implements a complete self-learning system for ReasoningBank, enabling agents to learn from experience through pattern storage, semantic search, and confidence-based ranking.

### Key Features

- **Zero External Dependencies**: All computations local (no API calls)
- **High Performance**: <1ms embeddings, <3ms queries
- **Deterministic**: Same input always produces same output
- **Production Ready**: Thread-safe, memory efficient, comprehensive error handling

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  SAFLA SERVICE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌──────────────────┐        │
│  │ Embedding Gen   │  │ Pattern Storage  │        │
│  │ (SimHash 1024)  │  │ (SQLite DB)      │        │
│  └─────────────────┘  └──────────────────┘        │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────┐        │
│  │ Semantic Search │  │ Confidence Learn │        │
│  │ (Cosine Sim)    │  │ (SAFLA Update)   │        │
│  └─────────────────┘  └──────────────────┘        │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────┐        │
│  │ MMR Ranking     │  │ Analytics        │        │
│  │ (Diversity)     │  │ (Stats)          │        │
│  └─────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Installation

### Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/uuid": "^9.0.7"
  }
}
```

### Initialization

```typescript
import { SAFLAService } from './services/safla-service';

// Default location: /prod/.reasoningbank/memory.db
const service = new SAFLAService();

// Custom location
const customService = new SAFLAService('/path/to/database.db');

// Custom configuration
const configuredService = new SAFLAService('/path/to/database.db', {
  confidenceMin: 0.05,
  confidenceMax: 0.95,
  successBoost: 0.20,
  failurePenalty: -0.15,
  embeddingDimensions: 1024,
});
```

## Core Algorithms

### 1. SimHash Embedding Generation

**Purpose**: Convert text to 1024-dimensional vector for semantic comparison

**Algorithm**:
1. Normalize text (lowercase, trim, remove punctuation)
2. Tokenize into words and bigrams
3. Hash each token using SHA-256
4. Generate 1024 dimension values via hash combinations
5. Normalize to unit vector

**Performance**: <1ms per embedding

**Example**:
```typescript
const embedding = service.generateEmbedding('Prioritize sprint tasks');
// Returns: Float32Array(1024) with values normalized to unit length
```

**Properties**:
- **Deterministic**: Same text always produces same embedding
- **Normalized**: All embeddings are unit vectors (magnitude = 1.0)
- **Cached**: Frequently used embeddings cached for performance

### 2. Cosine Similarity

**Purpose**: Measure similarity between two embeddings

**Formula**:
```
similarity = dot_product(A, B) / (||A|| * ||B||)
```

Since embeddings are pre-normalized:
```
similarity = dot_product(A, B)
```

**Performance**: <0.1ms per comparison

**Range**: -1.0 (opposite) to 1.0 (identical)

**Example**:
```typescript
const emb1 = service.generateEmbedding('Prioritize tasks');
const emb2 = service.generateEmbedding('Prioritize features');
const similarity = service.cosineSimilarity(emb1, emb2);
// Returns: ~0.85 (high similarity)
```

### 3. Confidence Update (SAFLA Core)

**Purpose**: Adjust pattern confidence based on outcomes

**Algorithm**:
```typescript
if (outcome === 'success') {
  newConfidence = min(currentConfidence + 0.20, 0.95);
} else {
  newConfidence = max(currentConfidence - 0.15, 0.05);
}
```

**Bounds**:
- **Minimum**: 0.05 (5%) - prevents complete dismissal
- **Maximum**: 0.95 (95%) - prevents overconfidence
- **Initial**: 0.50 (50%) - neutral starting point

**Convergence Example**:
```
Day 1: 0.50 (created)
Day 2: 0.70 (1 success: 0.50 + 0.20)
Day 3: 0.90 (2 successes: 0.70 + 0.20)
Day 4: 0.95 (3 successes: 0.90 + 0.20, capped)
Day 5: 0.80 (1 failure: 0.95 - 0.15)
Day 6: 0.95 (1 success: 0.80 + 0.20)
```

### 4. Semantic Search with Composite Scoring

**Purpose**: Find most relevant patterns for a query

**Composite Score**:
```typescript
finalScore =
  similarity * 0.4 +          // 40%: How relevant
  confidence * 0.3 +          // 30%: How proven
  recencyScore * 0.2 +        // 20%: How recent
  usageScore * 0.1            // 10%: How popular
```

**Recency Score**:
```typescript
ageDays = (now - lastUsedAt) / (24 * 60 * 60 * 1000);
recencyScore = exp(-ageDays / 30);
// 1.0 (today) → 0.5 (30 days) → 0.1 (90 days)
```

**Usage Score**:
```typescript
usageScore = min(totalInvocations / 100, 1.0);
// 0.0 (0 uses) → 0.5 (50 uses) → 1.0 (100+ uses)
```

**Performance**: <3ms for 1000 patterns

### 5. MMR Ranking (Maximal Marginal Relevance)

**Purpose**: Balance relevance and diversity in results

**Algorithm**:
```typescript
for each unselected pattern:
  similarity_to_query = cosineSimilarity(pattern, query)

  max_similarity_to_selected = 0
  for each selected pattern:
    max_similarity_to_selected = max(
      max_similarity_to_selected,
      cosineSimilarity(pattern, selected)
    )

  diversity = 1 - max_similarity_to_selected

  mmr_score = lambda * similarity_to_query + (1 - lambda) * diversity

  final_score = mmr_score * confidence * (0.5 + 0.5 * recency)

select pattern with highest final_score
```

**Lambda Parameter**:
- **0.0**: Pure diversity (maximize difference from selected)
- **0.5**: Balanced (equal weight to relevance and diversity)
- **1.0**: Pure relevance (ignore diversity)
- **Default**: 0.7 (favor relevance slightly)

## API Reference

### Pattern Storage

#### `storePattern(input: PatternInput): Promise<Pattern>`

Store new pattern in database.

**Parameters**:
```typescript
interface PatternInput {
  content: string;              // Pattern description (required)
  namespace?: string;           // Default: 'global'
  agentId?: string;             // Which agent owns this
  skillId?: string;             // Associated skill
  category?: string;            // Pattern category
  tags?: string[];              // Searchable tags
  metadata?: Record<string, any>; // Custom data
  contextType?: string;         // Context classification
}
```

**Returns**: Stored pattern with generated ID and embedding

**Example**:
```typescript
const pattern = await service.storePattern({
  content: 'Prioritize sprint tasks using Fibonacci sequence',
  namespace: 'agent:personal-todos',
  agentId: 'personal-todos-agent',
  category: 'prioritization',
  tags: ['sprint', 'fibonacci'],
  metadata: { source: 'user-defined' },
});

console.log(pattern.id);          // UUID
console.log(pattern.confidence);  // 0.5 (initial)
console.log(pattern.embedding.length); // 1024
```

### Pattern Retrieval

#### `getPattern(patternId: string): Pattern | null`

Retrieve pattern by ID.

**Example**:
```typescript
const pattern = service.getPattern('pattern-uuid-here');
if (pattern) {
  console.log(pattern.content);
  console.log(pattern.confidence);
}
```

#### `queryPatterns(query: string, namespace?: string, limit?: number): Promise<Pattern[]>`

Query patterns by text similarity.

**Example**:
```typescript
const patterns = await service.queryPatterns(
  'task prioritization',
  'agent:personal-todos',
  10
);

patterns.forEach(p => {
  console.log(`${p.confidence.toFixed(2)}: ${p.content}`);
});
```

### Semantic Search

#### `semanticSearch(embedding: Float32Array, namespace?: string, limit?: number): Promise<ScoredPattern[]>`

Low-level semantic search with embeddings.

**Returns**: Patterns with similarity scores

**Example**:
```typescript
const embedding = service.generateEmbedding('sprint planning');
const results = await service.semanticSearch(embedding, 'agent:personal-todos', 5);

results.forEach(r => {
  console.log(`Score: ${r.finalScore.toFixed(4)}`);
  console.log(`  Similarity: ${r.similarity.toFixed(4)}`);
  console.log(`  Confidence: ${r.confidence.toFixed(3)}`);
  console.log(`  Recency: ${r.recencyScore.toFixed(3)}`);
  console.log(`  Content: ${r.content}`);
});
```

### Confidence Learning

#### `recordOutcome(patternId: string, outcome: 'success' | 'failure', context?: any): Promise<Pattern>`

Record pattern usage outcome and update confidence.

**Context Object**:
```typescript
{
  context?: string;           // What was happening
  userFeedback?: string;      // User's feedback
  executionTimeMs?: number;   // How long it took
  metadata?: Record<string, any>; // Additional data
}
```

**Example**:
```typescript
// Task completed successfully
const updated = await service.recordOutcome(patternId, 'success', {
  context: 'Sprint planning completed on time',
  executionTimeMs: 2500,
  metadata: { tasksProcessed: 15 },
});

console.log(`Confidence: ${updated.confidence}`); // Increased by 0.20
```

#### `updateConfidence(current: number, outcome: 'success' | 'failure'): number`

Calculate new confidence (utility method).

**Example**:
```typescript
const newConf = service.updateConfidence(0.5, 'success');
console.log(newConf); // 0.7
```

### MMR Ranking

#### `rankPatterns(patterns: Pattern[], query: string, lambda?: number): Promise<ScoredPattern[]>`

Rank patterns for relevance and diversity.

**Example**:
```typescript
const allPatterns = await service.queryPatterns('prioritization', 'agent:todos', 20);

// Rank with balanced diversity
const ranked = await service.rankPatterns(allPatterns, 'feature prioritization', 0.7);

ranked.forEach((p, i) => {
  console.log(`${i + 1}. ${p.content.substring(0, 50)}...`);
  console.log(`   Score: ${p.finalScore.toFixed(4)}`);
});
```

### Analytics

#### `getPatternOutcomes(patternId: string, limit?: number): PatternOutcome[]`

Get outcome history for pattern.

**Example**:
```typescript
const outcomes = service.getPatternOutcomes(patternId, 50);

outcomes.forEach(o => {
  console.log(`${o.timestamp}: ${o.outcome}`);
  console.log(`  Confidence: ${o.confidenceBefore} → ${o.confidenceAfter}`);
  console.log(`  Delta: ${o.confidenceDelta > 0 ? '+' : ''}${o.confidenceDelta}`);
});
```

#### `getNamespaceStats(namespace: string): NamespaceStats`

Get learning statistics for namespace.

**Example**:
```typescript
const stats = service.getNamespaceStats('agent:personal-todos');

console.log(`Total Patterns: ${stats.totalPatterns}`);
console.log(`Avg Confidence: ${stats.avgConfidence.toFixed(3)}`);
console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
console.log(`Total Outcomes: ${stats.totalSuccesses + stats.totalFailures}`);
```

## Usage Patterns

### Basic Learning Workflow

```typescript
import { SAFLAService } from './services/safla-service';

const service = new SAFLAService();

// 1. Store a pattern
const pattern = await service.storePattern({
  content: 'Use Fibonacci for feature prioritization',
  namespace: 'agent:personal-todos',
  category: 'prioritization',
});

// 2. Use the pattern and record outcome
await service.recordOutcome(pattern.id, 'success', {
  context: 'Sprint planning Q4',
  executionTimeMs: 1200,
});

// 3. Query for similar patterns
const similar = await service.queryPatterns(
  'sprint prioritization',
  'agent:personal-todos',
  5
);

// 4. Use highest confidence pattern
const best = similar[0];
console.log(`Using pattern (${best.confidence.toFixed(2)}): ${best.content}`);
```

### Cross-Agent Pattern Sharing

```typescript
// Agent A learns something valuable
const metaPattern = await service.storePattern({
  content: 'Always include TodoWrite for user transparency',
  namespace: 'agent:meta',
  agentId: 'meta-agent',
  category: 'tool-selection',
});

// Record multiple successes
for (let i = 0; i < 5; i++) {
  await service.recordOutcome(metaPattern.id, 'success');
}

// Pattern now has high confidence (0.95)
const meta = service.getPattern(metaPattern.id);

// Share to other agents by creating copies
const sharedPattern = await service.storePattern({
  content: meta!.content,
  namespace: 'agent:personal-todos',
  agentId: 'personal-todos-agent',
  category: meta!.category,
  metadata: {
    sharedFrom: metaPattern.id,
    originalConfidence: meta!.confidence,
  },
});

// Set initial confidence (reduced for safety)
await service.recordOutcome(sharedPattern.id, 'success');
await service.recordOutcome(sharedPattern.id, 'success');
// Now personal-todos has the pattern with confidence 0.9
```

### Skill Enhancement with Learning

```typescript
// Load skill and augment with learned patterns
async function loadSkillWithLearning(skillId: string, agentId: string, context: string) {
  // 1. Load base skill (existing logic)
  const baseSkill = await loadSkill(skillId);

  // 2. Query learned patterns
  const learnedPatterns = await service.queryPatterns(
    context,
    `agent:${agentId}`,
    5
  );

  // 3. Filter by confidence
  const highConfidencePatterns = learnedPatterns.filter(
    p => p.confidence >= 0.7
  );

  // 4. Combine skill with learned patterns
  return {
    ...baseSkill,
    learnedGuidance: highConfidencePatterns.map(p => p.content),
    learningEnabled: true,
  };
}

// Use in agent execution
const enhancedSkill = await loadSkillWithLearning(
  'task-management',
  'personal-todos-agent',
  'Prioritize sprint tasks for Q4'
);

console.log('Base skill instructions:', enhancedSkill.instructions);
console.log('Learned guidance:', enhancedSkill.learnedGuidance);
```

## Performance Optimization

### Embedding Cache

The service automatically caches embeddings for frequently used text:

```typescript
// First call: generates embedding (~0.8ms)
const emb1 = service.generateEmbedding('common query');

// Second call: retrieves from cache (~0.001ms)
const emb2 = service.generateEmbedding('common query');

// Clear cache if needed
service.clearCache();
```

### Database Optimization

The database is configured for optimal performance:

```sql
-- Write-Ahead Logging for concurrent access
PRAGMA journal_mode = WAL;

-- Balance safety and speed
PRAGMA synchronous = NORMAL;

-- 64MB cache
PRAGMA cache_size = -64000;

-- Keep temp tables in memory
PRAGMA temp_store = MEMORY;
```

### Query Performance Tips

1. **Use specific namespaces**: Reduces search space
   ```typescript
   // Good: Fast
   await service.queryPatterns(query, 'agent:specific', 10);

   // Slow: Searches all namespaces
   await service.queryPatterns(query, undefined, 10);
   ```

2. **Set reasonable limits**: Default is 10, max is 50
   ```typescript
   // Good: Fast
   await service.queryPatterns(query, namespace, 10);

   // Slower: More results to process
   await service.queryPatterns(query, namespace, 50);
   ```

3. **Use confidence thresholds**: Filter low-quality patterns
   ```typescript
   const results = await service.semanticSearch(embedding, namespace, 20);
   const highQuality = results.filter(r => r.confidence >= 0.7);
   ```

## Error Handling

### Common Errors

```typescript
try {
  const pattern = await service.storePattern({
    content: 'Test pattern',
  });

  await service.recordOutcome(pattern.id, 'success');

} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Pattern does not exist');
  } else if (error.message.includes('dimensions must match')) {
    console.error('Embedding dimension mismatch');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Safe Cleanup

```typescript
const service = new SAFLAService();

try {
  // Use service
  await service.storePattern({ content: 'test' });
} finally {
  // Always close database
  service.close();
}
```

## Testing

### Unit Tests

Run comprehensive unit tests:

```bash
npm test tests/unit/safla-service.test.ts
```

### Validation Script

Run performance validation:

```bash
npx ts-node api-server/scripts/test-safla.ts
```

Expected output:
```
TEST 1: Embedding Generation Performance
  Average embedding time: 0.752ms
  Target: <1ms - PASS ✓

TEST 2: Cosine Similarity Performance
  Average time: 0.045ms
  Target: <0.1ms - PASS ✓

TEST 5: Semantic Search Performance
  Average search time: 2.341ms
  Target: <3ms - PASS ✓
```

## Configuration Reference

```typescript
export interface SAFLAConfig {
  // Confidence bounds
  confidenceMin: number;        // Default: 0.05
  confidenceMax: number;        // Default: 0.95
  confidenceInitial: number;    // Default: 0.50

  // Confidence adjustments
  successBoost: number;         // Default: 0.20
  failurePenalty: number;       // Default: -0.15

  // Scoring weights
  similarityWeight: number;     // Default: 0.4
  confidenceWeight: number;     // Default: 0.3
  recencyWeight: number;        // Default: 0.2
  usageWeight: number;          // Default: 0.1

  // Query settings
  defaultLimit: number;         // Default: 10
  maxLimit: number;             // Default: 50
  minConfidenceThreshold: number; // Default: 0.2
  similarityThreshold: number;  // Default: 0.6

  // Embedding settings
  embeddingDimensions: number;  // Default: 1024
}
```

## Database Schema

```sql
-- Patterns: Core learning storage
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'global',
  agent_id TEXT,
  skill_id TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,                      -- JSON array
  embedding BLOB NOT NULL,        -- 1024-dim Float32Array
  confidence REAL NOT NULL DEFAULT 0.5,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_invocations INTEGER DEFAULT 0,
  context_type TEXT,
  metadata TEXT,                  -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Outcomes: Learning history
CREATE TABLE pattern_outcomes (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  outcome TEXT NOT NULL,          -- 'success' or 'failure'
  context TEXT,
  user_feedback TEXT,
  confidence_before REAL NOT NULL,
  confidence_after REAL NOT NULL,
  confidence_delta REAL NOT NULL,
  execution_time_ms INTEGER,
  metadata TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);
```

## Best Practices

1. **Namespace Organization**
   - Use `global` for universally applicable patterns
   - Use `agent:{id}` for agent-specific patterns
   - Use `skill:{id}` for skill-specific patterns

2. **Confidence Thresholds**
   - Use ≥0.7 for production recommendations
   - Use ≥0.5 for suggestions
   - Use ≥0.3 for exploratory learning

3. **Pattern Content**
   - Be specific: "Use Fibonacci (P1=1, P2=2, P3=3)" not "Prioritize"
   - Include context: "For features" vs "For bugs"
   - Keep concise: <200 characters ideal

4. **Outcome Recording**
   - Record outcomes immediately after use
   - Include execution context
   - Be honest about failures (they improve learning)

5. **Performance**
   - Generate embeddings once, reuse for multiple searches
   - Use appropriate limits (10-20 is usually enough)
   - Clear cache periodically if memory constrained

## Integration Examples

See Phase 4 Architecture document for:
- Skills Service integration
- Learning middleware
- Agent execution hooks
- Cross-agent pattern sharing
- Pre-trained pattern libraries

## License

Internal use only - AVI Agent Skills System

---

**Document Version**: 1.0
**Date**: October 18, 2025
**Author**: Code Implementation Agent
