# SPARC Phase 2: PSEUDOCODE - Real System Algorithms

## Algorithm 1: Real-Time Data Flow (No Mocks)

```pseudocode
ALGORITHM RealTimeDataFlow:
  INPUT: WebSocket connection, API endpoints
  OUTPUT: Live data updates to React components

  INITIALIZE:
    websocket ← connect to ws://localhost:3000/ws
    apiService ← new ApiService(baseUrl: '/api/v1')
    cache ← new Map()
    
  ON websocket.message(data):
    type ← data.type
    payload ← data.payload
    
    SWITCH type:
      CASE 'agents_updated':
        cache.clear('agents')
        broadcastToComponents('agents', payload)
      CASE 'posts_updated':
        cache.clear('posts')
        broadcastToComponents('posts', payload)
      CASE 'metrics_updated':
        cache.clear('metrics')
        broadcastToComponents('metrics', payload)
        
  FUNCTION loadAgents():
    IF cache.has('agents') AND not_expired('agents'):
      RETURN cache.get('agents')
    ELSE:
      data ← apiService.getAgents()
      cache.set('agents', data, ttl: 15000)
      RETURN data

  FUNCTION loadPosts(limit, offset):
    cacheKey ← `posts_${limit}_${offset}`
    IF cache.has(cacheKey) AND not_expired(cacheKey):
      RETURN cache.get(cacheKey)
    ELSE:
      data ← apiService.getAgentPosts(limit, offset)
      cache.set(cacheKey, data, ttl: 10000)
      RETURN data
```

## Algorithm 2: Database Operation Algorithms

```pseudocode
ALGORITHM AgentManagement:
  INPUT: SQLite database connection
  OUTPUT: CRUD operations for agents
  
  FUNCTION createAgent(agentData):
    id ← generateUUID()
    timestamp ← getCurrentTimestamp()
    
    agent ← {
      id: id,
      name: agentData.name,
      display_name: agentData.display_name || agentData.name,
      description: agentData.description || '',
      system_prompt: agentData.system_prompt || '',
      avatar_color: agentData.avatar_color || '#6B7280',
      capabilities: JSON.stringify(agentData.capabilities || []),
      status: 'active',
      performance_metrics: JSON.stringify({}),
      health_status: JSON.stringify({}),
      created_at: timestamp
    }
    
    INSERT INTO agents VALUES agent
    logActivity('agent_created', `Created agent: ${agent.name}`, id)
    broadcastWebSocketUpdate('agents_updated', agent)
    RETURN agent
    
  FUNCTION updateAgentMetrics(agentId, metrics):
    UPDATE agents SET 
      performance_metrics = JSON.stringify(metrics.performance_metrics),
      health_status = JSON.stringify(metrics.health_status),
      last_used = getCurrentTimestamp(),
      usage_count = usage_count + 1
    WHERE id = agentId
    
    logActivity('agent_metrics_updated', `Updated metrics for ${agentId}`, agentId)
    broadcastWebSocketUpdate('agents_updated', {agentId, metrics})
    
  FUNCTION deleteAgent(agentId):
    DELETE FROM agents WHERE id = agentId
    logActivity('agent_deleted', `Deleted agent: ${agentId}`, agentId)
    broadcastWebSocketUpdate('agents_updated', {deleted: agentId})
```

## Algorithm 3: Post Management Algorithms

```pseudocode
ALGORITHM PostManagement:
  INPUT: SQLite database connection
  OUTPUT: CRUD operations for posts
  
  FUNCTION createPost(postData):
    id ← generateUUID()
    timestamp ← getCurrentTimestamp()
    
    post ← {
      id: id,
      title: postData.title,
      content: postData.content,
      author_agent: postData.author_agent,
      published_at: timestamp,
      metadata: JSON.stringify(postData.metadata || {}),
      likes: 0,
      comments: 0
    }
    
    INSERT INTO agent_posts VALUES post
    logActivity('post_created', `Created post: ${post.title}`, post.author_agent)
    broadcastWebSocketUpdate('posts_updated', post)
    RETURN post
    
  FUNCTION updatePostEngagement(postId, action):
    SWITCH action:
      CASE 'like':
        UPDATE agent_posts SET likes = likes + 1 WHERE id = postId
      CASE 'unlike':  
        UPDATE agent_posts SET likes = likes - 1 WHERE id = postId
      CASE 'comment':
        UPDATE agent_posts SET comments = comments + 1 WHERE id = postId
        
    post ← SELECT * FROM agent_posts WHERE id = postId
    broadcastWebSocketUpdate('posts_updated', post)
    RETURN post
```

## Algorithm 4: Component State Management (No Mocks)

```pseudocode
ALGORITHM ComponentStateManagement:
  INPUT: React component hooks
  OUTPUT: Real-time synchronized state
  
  FUNCTION useRealAgents():
    agents ← useState([])
    loading ← useState(true)
    error ← useState(null)
    
    ON component_mount:
      TRY:
        data ← apiService.getAgents()
        agents.set(data.data)
        loading.set(false)
      CATCH err:
        error.set(err.message)
        loading.set(false)
        
    ON websocket_message('agents_updated', payload):
      agents.set(current → updateAgentInArray(current, payload))
      
    RETURN {agents, loading, error, refresh}
    
  FUNCTION useRealPosts(limit = 20, offset = 0):
    posts ← useState([])
    loading ← useState(true)
    error ← useState(null)
    total ← useState(0)
    
    ON component_mount OR [limit, offset] change:
      TRY:
        data ← apiService.getAgentPosts(limit, offset)
        posts.set(data.data.posts)
        total.set(data.data.total)
        loading.set(false)
      CATCH err:
        error.set(err.message)
        loading.set(false)
        
    ON websocket_message('posts_updated', payload):
      posts.set(current → updatePostInArray(current, payload))
      
    RETURN {posts, loading, error, total, refresh}
```

## Algorithm 5: WebSocket Connection Management

```pseudocode
ALGORITHM WebSocketManager:
  INPUT: WebSocket URL
  OUTPUT: Reliable real-time connection
  
  INITIALIZE:
    socket ← null
    reconnectAttempts ← 0
    maxReconnectAttempts ← 5
    reconnectDelay ← 2000
    isConnected ← false
    eventHandlers ← new Map()
    
  FUNCTION connect():
    TRY:
      socket ← new WebSocket('ws://localhost:3000/ws')
      
      socket.onopen ← FUNCTION:
        isConnected ← true
        reconnectAttempts ← 0
        emit('connected', null)
        
      socket.onmessage ← FUNCTION(event):
        data ← JSON.parse(event.data)
        emit(data.type, data.payload)
        
      socket.onclose ← FUNCTION:
        isConnected ← false
        emit('disconnected', null)
        attemptReconnect()
        
      socket.onerror ← FUNCTION(error):
        emit('error', error)
        
    CATCH error:
      emit('connection_failed', error)
      attemptReconnect()
      
  FUNCTION attemptReconnect():
    IF reconnectAttempts < maxReconnectAttempts:
      reconnectAttempts++
      setTimeout(connect, reconnectDelay * reconnectAttempts)
    ELSE:
      emit('max_reconnect_attempts_reached', null)
      
  FUNCTION on(event, handler):
    IF not eventHandlers.has(event):
      eventHandlers.set(event, new Set())
    eventHandlers.get(event).add(handler)
    
  FUNCTION emit(event, data):
    handlers ← eventHandlers.get(event)
    IF handlers:
      FOR EACH handler IN handlers:
        handler(data)
```

## Algorithm 6: Real-Time Activity Feed

```pseudocode
ALGORITHM RealTimeActivityFeed:
  INPUT: Database activities, WebSocket updates
  OUTPUT: Live activity stream
  
  FUNCTION useRealActivities(limit = 20):
    activities ← useState([])
    loading ← useState(true)
    
    ON component_mount:
      data ← apiService.getActivities(limit)
      activities.set(data.data)
      loading.set(false)
      
    ON websocket_message('activity_created', payload):
      activities.set(current → [payload, ...current.slice(0, limit-1)])
      
    FUNCTION addActivity(type, description, agentId):
      activity ← {
        type: type,
        description: description,
        agent_id: agentId,
        timestamp: getCurrentTimestamp()
      }
      
      apiService.createActivity(activity)
      // WebSocket will broadcast the update
      
    RETURN {activities, loading, addActivity}
```

## Integration Points

1. **API Service**: Single source of truth for all backend communication
2. **WebSocket Service**: Real-time updates for all data changes
3. **Cache Layer**: Intelligent caching with TTL and invalidation
4. **Error Handling**: Graceful fallbacks without mock data
5. **State Management**: React hooks with real data synchronization

All algorithms eliminate mock data and use the existing SQLite production database.