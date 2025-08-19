# Volume Mounting Strategy
## Claude Code + AgentLink Development Environment

### Overview

The volume mounting strategy is designed to provide optimal development experience with hot reload capabilities while ensuring data persistence and security. The strategy differs between development and production environments to balance performance, security, and functionality.

### Development Environment Volumes

#### Hot Reload Volumes (Read-Only)
```yaml
# Source code hot reload
- ../src:/app/src:ro
- ../frontend/src:/app/frontend/src:ro
- ../package.json:/app/package.json:ro
- ../frontend/package.json:/app/frontend/package.json:ro
```

**Purpose**: Enable instant code changes without container rebuild
**Security**: Read-only to prevent accidental modification
**Performance**: Direct file system access for fast reload

#### Development Tools (Read/Write)
```yaml
# Version control and documentation
- ../.git:/app/.git:ro
- ../docs:/app/docs:rw
- ../tests:/app/tests:rw
```

**Purpose**: Git integration and test development
**Security**: Selective read/write access
**Workflow**: Seamless version control integration

#### Persistent Data Volumes
```yaml
# Database persistence
postgres_data:
  driver: local
  
# Claude configuration
claude_config:
  driver: local
  
# Application logs
logs:
  driver: local
  
# Agent memory store
memory:
  driver: local
```

### Production Environment Volumes

#### Bind Mount Strategy
```yaml
postgres_data_prod:
  driver: local
  driver_opts:
    type: none
    o: bind
    device: /opt/agentfeed/data/postgres

claude_config_prod:
  driver: local
  driver_opts:
    type: none
    o: bind
    device: /opt/agentfeed/config/claude

logs_prod:
  driver: local
  driver_opts:
    type: none
    o: bind
    device: /opt/agentfeed/logs

memory_prod:
  driver: local
  driver_opts:
    type: none
    o: bind
    device: /opt/agentfeed/memory

backup_data:
  driver: local
  driver_opts:
    type: none
    o: bind
    device: /opt/agentfeed/backups
```

**Benefits**:
- Direct host filesystem access
- Easy backup and monitoring
- Better performance for large datasets
- Simplified maintenance procedures

### Volume Organization

#### Directory Structure
```
/opt/agentfeed/                    # Production root
├── data/
│   └── postgres/                  # Database files
├── config/
│   └── claude/                    # Claude Code configuration
├── logs/                          # Application logs
├── memory/                        # Agent memory store
└── backups/                       # System backups
```

#### Development Structure
```
project-root/
├── .claude/                       # Claude configuration (mounted)
├── memory/                        # Agent memory (mounted)
├── logs/                         # Application logs (mounted)
├── src/                          # Source code (hot reload)
├── frontend/src/                 # Frontend source (hot reload)
├── docs/                         # Documentation (rw access)
└── tests/                        # Test files (rw access)
```

### Security Considerations

#### File Permissions
```bash
# Production permissions
chown -R appuser:appuser /opt/agentfeed/
chmod 755 /opt/agentfeed/
chmod 700 /opt/agentfeed/data/postgres/
chmod 755 /opt/agentfeed/config/
chmod 755 /opt/agentfeed/logs/
chmod 755 /opt/agentfeed/memory/
chmod 755 /opt/agentfeed/backups/
```

#### Access Control
- **Database files**: 700 (postgres user only)
- **Configuration**: 755 (readable, appuser writable)
- **Logs**: 755 (readable, appuser writable)
- **Memory**: 755 (readable, appuser writable)
- **Backups**: 755 (readable, appuser writable)

### Performance Optimization

#### Volume Types by Use Case

| Volume Type | Use Case | Performance | Persistence | Security |
|-------------|----------|-------------|-------------|----------|
| Bind Mount | Production data | Excellent | Host-level | Host-dependent |
| Named Volume | Development data | Good | Docker-managed | Container-level |
| tmpfs | Temporary data | Excellent | None | Memory-only |
| Memory Mount | Cache/temp | Excellent | None | Memory-only |

#### Optimized Configurations

##### High-Performance Development
```yaml
# Use tmpfs for temporary data
tmpfs:
  - /tmp:noexec,nosuid,size=100m
  - /app/cache:noexec,nosuid,size=200m

# Memory cache for faster access
volumes:
  - type: tmpfs
    target: /app/cache
    tmpfs:
      size: 200M
```

##### Production Reliability
```yaml
# Bind mounts for critical data
volumes:
  - type: bind
    source: /opt/agentfeed/data/postgres
    target: /var/lib/postgresql/data
    consistency: consistent
  
  - type: bind
    source: /opt/agentfeed/config/claude
    target: /app/.claude
    consistency: cached
```

### Backup Strategy

#### Automated Volume Backups
```bash
# Database backup
docker run --rm \
  -v agentfeed_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz -C /data .

# Configuration backup
docker run --rm \
  -v agentfeed_claude_config:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/claude_config_$(date +%Y%m%d).tar.gz -C /data .
```

#### Recovery Procedures
```bash
# Restore database
docker run --rm \
  -v agentfeed_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres_20231201.tar.gz -C /data

# Restore configuration
docker run --rm \
  -v agentfeed_claude_config:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/claude_config_20231201.tar.gz -C /data
```

### Volume Migration

#### Development to Production
```bash
# Export development data
docker run --rm \
  -v agentfeed_dev_postgres_data:/source \
  -v $(pwd)/migration:/target \
  alpine cp -r /source/. /target/

# Import to production
sudo cp -r migration/* /opt/agentfeed/data/postgres/
sudo chown -R postgres:postgres /opt/agentfeed/data/postgres/
```

#### Cross-Platform Compatibility
```yaml
# Windows compatibility
volumes:
  - type: bind
    source: ${PWD}/data
    target: /app/data
    consistency: delegated

# macOS compatibility  
volumes:
  - type: bind
    source: ${PWD}/data
    target: /app/data
    consistency: cached
```

### Monitoring and Maintenance

#### Volume Health Checks
```bash
# Check volume usage
docker system df -v

# Inspect volume details
docker volume inspect agentfeed_postgres_data

# Monitor volume performance
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.BlockIO}}"
```

#### Cleanup Procedures
```bash
# Remove unused volumes
docker volume prune -f

# Selective volume removal
docker volume rm agentfeed_logs

# Clean development volumes
make clean
```

### Troubleshooting

#### Common Issues

##### Permission Denied
```bash
# Fix ownership
sudo chown -R appuser:appuser /opt/agentfeed/

# Fix permissions
sudo chmod -R 755 /opt/agentfeed/
sudo chmod 700 /opt/agentfeed/data/postgres/
```

##### Volume Not Mounting
```bash
# Verify volume exists
docker volume ls | grep agentfeed

# Check mount points
docker inspect agentfeed-dev | grep -A 10 "Mounts"

# Recreate volume
docker volume rm agentfeed_postgres_data
docker volume create agentfeed_postgres_data
```

##### Performance Issues
```bash
# Check disk space
df -h /opt/agentfeed/

# Monitor I/O
iostat -x 1

# Optimize volume driver
# Use local-persist for better performance
docker plugin install --grant-all-permissions \
  rexray/local-persist:latest
```

### Best Practices

#### Development
1. Use named volumes for data persistence
2. Use bind mounts for source code hot reload
3. Use tmpfs for temporary/cache data
4. Regular volume cleanup
5. Backup before major changes

#### Production
1. Use bind mounts for critical data
2. Implement regular backup schedules
3. Monitor volume space usage
4. Use dedicated storage for database
5. Implement volume encryption for sensitive data

#### Security
1. Minimal file permissions
2. Non-root container execution
3. Read-only mounts where possible
4. Regular security audits
5. Encrypted storage for production

This volume mounting strategy ensures optimal development experience while maintaining production-grade security and reliability.