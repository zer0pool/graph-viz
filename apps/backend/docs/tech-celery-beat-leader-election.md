# [Tech] Celery Beat Leader Election Pattern (Redis-based)

> **Document Metadata**
> - **Version**: 1.0.0
> - **Last Updated**: 2026-02-14
> - **Status**: Active Technical Guide


This document describes a production-ready pattern for running Celery Beat in a multi-replica Kubernetes environment without task duplication.

---

## Problem Statement

When deploying Celery Beat in Kubernetes with multiple replicas for high availability:
- **Challenge**: Beat schedules tasks at fixed intervals. Multiple Beat instances = duplicate task execution.
- **Requirement**: Only ONE Beat instance should be active at any time.
- **Constraint**: No separate deployment (all processes in same pod for simplicity).

---

## Solution: Redis-based Leader Election

Use Redis as a distributed lock to elect a single "leader" pod that runs Celery Beat.

### Architecture

```
┌─────────────────────────────────────┐
│  Pod Replica 1                      │
│  ┌──────────────────────────────┐  │
│  │ Application (FastAPI/Django) │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Celery Worker                │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Celery Beat (Leader) ✓       │  │  ← Holds Redis Lock
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Pod Replica 2                      │
│  ┌──────────────────────────────┐  │
│  │ Application (FastAPI/Django) │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Celery Worker                │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Celery Beat (Standby) ✗      │  │  ← Waiting for leadership
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Implementation

### 1. Leader Election Module

Create a reusable module for leader election logic.

```python
# core/leader_election.py
import redis
import socket
import logging
import time
from threading import Thread

logger = logging.getLogger(__name__)

class LeaderElection:
    """Redis-based leader election for distributed systems"""
    
    def __init__(self, redis_url: str, lock_key: str, ttl: int = 20, check_interval: int = 5):
        """
        Args:
            redis_url: Redis connection string
            lock_key: Unique key for this election (e.g., 'myapp:beat:leader')
            ttl: Lock expiration time in seconds (default: 20)
            check_interval: How often to check leadership in seconds (default: 5)
        """
        self.redis = redis.from_url(redis_url)
        self.lock_key = lock_key
        self.pod_name = socket.gethostname()
        self.ttl = ttl
        self.check_interval = check_interval
        self._is_leader = False
    
    def try_acquire_leadership(self) -> bool:
        """Try to become the leader"""
        try:
            # Try to set lock if not exists
            acquired = self.redis.set(
                self.lock_key, 
                self.pod_name, 
                nx=True,  # Only set if not exists
                ex=self.ttl
            )
            
            if acquired:
                logger.info(f"🎖️  [{self.pod_name}] Acquired leadership")
                self._is_leader = True
                return True
            
            # Check if we already hold the lock
            current_leader = self.redis.get(self.lock_key)
            if current_leader and current_leader.decode() == self.pod_name:
                # Renew our lock
                self.redis.expire(self.lock_key, self.ttl)
                return True
            
            # Someone else is leader
            if self._is_leader:
                logger.warning(f"⚠️  [{self.pod_name}] Lost leadership")
            self._is_leader = False
            return False
            
        except Exception as e:
            logger.error(f"Leadership check failed: {e}")
            self._is_leader = False
            return False
    
    def start_monitoring(self, on_become_leader, on_lose_leadership):
        """
        Start background monitoring thread
        
        Args:
            on_become_leader: Callback function when this pod becomes leader
            on_lose_leadership: Callback function when this pod loses leadership
        """
        def monitor():
            was_leader = False
            
            while True:
                is_leader_now = self.try_acquire_leadership()
                
                # Became leader
                if is_leader_now and not was_leader:
                    logger.info(f"🚀 [{self.pod_name}] Starting as leader")
                    on_become_leader()
                
                # Lost leadership
                elif not is_leader_now and was_leader:
                    logger.warning(f"🛑 [{self.pod_name}] Stopping as leader")
                    on_lose_leadership()
                
                was_leader = is_leader_now
                time.sleep(self.check_interval)
        
        thread = Thread(target=monitor, daemon=True, name="LeaderElection")
        thread.start()
        logger.info(f"[{self.pod_name}] Leader election monitoring started")
    
    @property
    def is_leader(self) -> bool:
        """Check if this instance is currently the leader"""
        return self._is_leader
```

### 2. Integration with FastAPI

```python
# main.py
from fastapi import FastAPI
from core.leader_election import LeaderElection
import subprocess
import signal
import os

app = FastAPI()

beat_process = None
leader_election = LeaderElection(
    redis_url=os.getenv("REDIS_URL"),
    lock_key="myapp:beat:leader",
    ttl=20,
    check_interval=5
)

def start_beat():
    """Start Celery Beat as subprocess"""
    global beat_process
    if beat_process is None:
        beat_process = subprocess.Popen([
            "celery", "-A", "app.celery_app", "beat", 
            "--loglevel=info"
        ])

def stop_beat():
    """Stop Celery Beat gracefully"""
    global beat_process
    if beat_process:
        beat_process.send_signal(signal.SIGTERM)
        beat_process.wait(timeout=10)
        beat_process = None

@app.on_event("startup")
async def startup():
    leader_election.start_monitoring(
        on_become_leader=start_beat,
        on_lose_leadership=stop_beat
    )

@app.on_event("shutdown")
async def shutdown():
    stop_beat()

@app.get("/health/beat")
async def beat_health():
    """Health check endpoint for monitoring"""
    return {
        "is_leader": leader_election.is_leader,
        "pod_name": leader_election.pod_name,
        "beat_running": beat_process is not None
    }
```

---

## Failover Behavior

| Event | Timeline | Action |
|:---|:---|:---|
| **Leader Pod starts** | T+0s | Acquires Redis lock, starts Beat |
| **Leader Pod crashes** | T+X | Lock remains in Redis (TTL counting down) |
| **Lock expires** | T+X+20s | Redis auto-deletes lock |
| **Standby Pod detects** | T+X+25s | Acquires lock, starts Beat (max 5s delay) |
| **New Leader active** | T+X+25s | System fully recovered |

**Maximum Failover Time**: TTL + Check Interval (e.g., 20s + 5s = 25s)

---

## Deployment Configuration

### Supervisor (Multi-Process in Single Container)

```ini
# supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0

[program:app]
command=uvicorn main:app --host 0.0.0.0 --port 8000
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0

[program:celery_worker]
command=celery -A app.celery_app worker --loglevel=info --concurrency=2
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
```

**Note**: Celery Beat is **NOT** in supervisord. It's managed by the Leader Election module.

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3  # Multiple replicas for HA
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379/0"
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
        readinessProbe:
          httpGet:
            path: /health/beat
            port: 8000
```

---

## Configuration Tuning

### Recommended Settings

| Environment | TTL | Check Interval | Max Failover Time | Use Case |
|:---|:---:|:---:|:---:|:---|
| **Development** | 30s | 10s | 40s | Low traffic, simplicity |
| **Production** | 20s | 5s | 25s | Balanced (recommended) |
| **High Frequency** | 10s | 3s | 13s | Tasks run every minute |

### Trade-offs

- **Lower TTL**: Faster failover, but more Redis requests
- **Higher TTL**: Less Redis load, but slower failover
- **Lower Check Interval**: Faster detection, more CPU usage

---

## Monitoring & Observability

### Prometheus Metrics

```python
from prometheus_client import Gauge

beat_leader_gauge = Gauge(
    'celery_beat_leader',
    'Whether this pod is the Beat leader',
    ['pod_name']
)

# Update in monitoring thread
if is_leader_now:
    beat_leader_gauge.labels(pod_name=self.pod_name).set(1)
else:
    beat_leader_gauge.labels(pod_name=self.pod_name).set(0)
```

### Grafana Dashboard Query

```promql
# Show which pod is currently the leader
celery_beat_leader{pod_name=~".*"} == 1
```

---

## Testing

### Local Testing (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  app1:
    build: .
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - redis
  
  app2:
    build: .
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - redis
```

**Test Scenario**:
1. Start both containers: `docker-compose up`
2. Check logs: One should show "Acquired leadership"
3. Kill leader: `docker-compose stop app1`
4. Wait 25s: `app2` should acquire leadership

---

## Alternatives Considered

| Approach | Pros | Cons | Verdict |
|:---|:---|:---|:---|
| **Separate Beat Deployment** | Simple, no code changes | Extra pod, resource waste | ❌ Not cost-effective |
| **Kubernetes Lease** | Native K8s, very robust | Requires RBAC, complex | ⚠️ Overkill for most cases |
| **Redis Lock (This)** | Simple, no K8s permissions | Depends on Redis | ✅ **Recommended** |
| **Database Lock** | Works without Redis | Slower, DB load | ⚠️ Only if no Redis |

---

## Troubleshooting

### Issue: Multiple Beats Running

**Symptom**: Tasks execute multiple times  
**Cause**: Lock key collision or Redis connection failure  
**Solution**: 
- Ensure unique `lock_key` per application
- Check Redis connectivity from all pods

### Issue: No Beat Running

**Symptom**: Scheduled tasks not executing  
**Cause**: All pods failing to acquire lock  
**Solution**:
- Check Redis: `redis-cli GET myapp:beat:leader`
- Manually delete lock: `redis-cli DEL myapp:beat:leader`
- Check pod logs for errors

### Issue: Slow Failover

**Symptom**: Tasks delayed after pod restart  
**Cause**: TTL or check interval too high  
**Solution**: Reduce TTL and check_interval (see Configuration Tuning)

---

## License

This pattern is framework-agnostic and can be used in any Python application using Celery Beat.
