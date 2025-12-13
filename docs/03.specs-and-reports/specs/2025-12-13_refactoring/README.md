# Backend Refactoring 2025-12-13

Created: 2025-12-13  
Author: Lineage Manager Team  
Status: Draft

---

## 📋 Document Structure

This folder contains all documentation for the 2025-12-13 backend refactoring initiative.

### Reading Order

1. **`1.overview.md`** - Overall goals and current problems
2. **`2.multi-container-architecture.md`** - Multi-Container architecture design
3. **`3.service-refactoring.md`** - Service Layer refactoring (GraphService split)
4. **`4.connection-optimization.md`** - Read/Write connection optimization
5. **`5.implementation-plan.md`** - Integrated implementation plan and checklist

---

## 🎯 Refactoring Goals

### Problems to Solve

1. **GraphService God Object** (1,653 lines, 38 methods)
2. **Single Container Complexity** (all services mixed in GraphContainer)
3. **Business Logic in Repositories**
4. **Single DB Connection Pool Inefficiency**

### Three Major Improvements

```
┌─────────────────────────────────────────────────────┐
│  1. Multi-Container Architecture (18 hours)         │
│     - Separate containers by domain                 │
│     - Core, Graph, Job, User, BigQuery              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  2. Service Layer Refactoring (25 hours)            │
│     - Split GraphService (Query/Command/Sync)       │
│     - Methods under 100 lines                       │
│     - Clean up repositories                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  3. Connection Optimization (8 hours)               │
│     - Separate Read/Write connections               │
│     - Read Replica support                          │
│     - Optimize connection pools                     │
└─────────────────────────────────────────────────────┘

Total Estimated Time: 51 hours (6-7 days)
```

---

## 📊 Current State vs Target

| Item | Before | After | Improvement |
|------|--------|-------|-------------|
| **Container Count** | 1 (GraphContainer) | 5 (Core, Graph, Job, User, BigQuery) | Domain separation |
| **GraphService Size** | 1,653 lines | ~400 lines × 3 services | 75% reduction |
| **Longest Method** | 139 lines | <100 lines | 28% reduction |
| **Repository Business Logic** | 2 methods | 0 methods | 100% removal |
| **DB Connection Pools** | 1 (10 connections) | 2 (Write: 10, Read: 20) | Performance boost |

---

## 🚀 Implementation Timeline

### Week 1: Foundation (3 days)
```
Day 1-2: Multi-Container Architecture
  ├─ CoreContainer (Database, Config, Auth)
  ├─ JobContainer (JobManagerAdapter, JobService)
  ├─ UserContainer (UserService)
  ├─ BigQueryContainer (BigQueryService)
  └─ GraphContainer (Graph services)

Day 3: Connection Optimization
  ├─ Separate Read/Write engines
  ├─ Separate Read/Write UoW
  └─ Update containers
```

### Week 2: Service Refactoring (5 days)
```
Day 4-5: GraphQueryService
  ├─ Create GraphTraversalHelper
  ├─ Move query methods
  └─ Consolidate BFS logic

Day 6-7: GraphCommandService
  ├─ Move mutation methods
  └─ Split methods (<100 lines)

Day 8-9: GraphSyncService
  ├─ Move sync methods
  └─ Split helper methods
```

### Week 3: Polish (2 days)
```
Day 10: Repository Cleanup
  ├─ Remove TableRepository.get_table_dag()
  └─ Move business logic to services

Day 11-12: Testing & Documentation
  ├─ Integration tests
  ├─ API validation
  └─ Write completion report
```

---

## 📁 File Structure

```
docs/03.specs-and-reports/specs/2025-12-13_refactoring/
├─ README.md (this file)
├─ 1.overview.md (Overall overview)
├─ 2.multi-container-architecture.md (Container design)
├─ 3.service-refactoring.md (Service split)
├─ 4.connection-optimization.md (DB optimization)
└─ 5.implementation-plan.md (Implementation plan)
```

---

## 🎯 Success Criteria

### Code Metrics
- [ ] All service files under 500 lines
- [ ] All methods under 100 lines
- [ ] Zero business logic in repositories
- [ ] 5 containers (separated by domain)

### Performance
- [ ] Read query latency improved by 40%
- [ ] Connection pool exhaustion reduced by 90%
- [ ] Read replica utilization at 70%

### Quality
- [ ] Server runs successfully
- [ ] All API endpoints work correctly
- [ ] Unit tests written
- [ ] Integration tests written

---

## 📚 References

- **Existing Docs**: `docs/00.guides/agents.md`
- **Previous Refactoring**: `docs/03.specs-and-reports/reports/2025-12-13-service-layer-refactoring-completion.md`
- **Dependency Injector**: https://python-dependency-injector.ets-labs.org/

---

**Last Updated**: 2025-12-13  
**Owner**: @darkwing
