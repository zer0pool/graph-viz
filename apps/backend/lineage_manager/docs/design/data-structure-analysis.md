# 현재 데이터 구조 분석 보고서

## 목적
Project/User 검색 기능 구현을 위한 현재 데이터 구조 상세 분석

---

## 1. 데이터 흐름 분석

### 1.1 Job 등록 프로세스

```
Job Manager API
    ↓ (SchedulingLineage)
GraphCommandService._extract_job_properties()
    ↓ (properties dict)
JobRepository.get_or_create()
    ↓
GraphNode.properties (JSON)
```

### 1.2 SchedulingLineage 구조

```python
class SchedulingLineage(BaseModel):
    job_id: str
    type: str
    name: str
    status: str
    schedule: Optional[SchedulingLineageSchedule]
    upstreams: List[SchedulingLineageDependency]
    downstreams: List[SchedulingLineageDependency]
    governance: Dict[str, Any]
    metadata: Dict[str, Any]  # ← owner, labels 여기에 포함
```

### 1.3 metadata 필드 예상 구조

```json
{
  "owner": "user_a",
  "labels": {
    "project": "self-scheduling",
    "team": "data-platform",
    "environment": "production"
  },
  "is_active": true,
  "created_by": "admin",
  "updated_at": "2026-01-27T10:00:00Z"
}
```

---

## 2. 현재 저장 구조

### 2.1 graph_node.properties 저장 내용

`GraphCommandService._extract_job_properties()` 메서드 분석 결과:

```python
job_props = {
    "type": lineage.type,                    # "SELF-TYPE"
    "status": lineage.status,                # "RUNNING"
    "scheduling_type": lineage.type,         # "SELF-TYPE"
    "governance": lineage.governance,        # {}
    "owner": meta.get("owner"),              # "user_a" ← 직접 필드
    "labels": meta.get("labels", {}),        # {"project": "..."} ← 중첩 필드
    "is_active": meta.get("is_active", True),
    # ... metadata의 다른 필드들도 병합
    "schedule": {...},
    "upstreams": [...],
    "downstreams": [...]
}
```

### 2.2 실제 DB 저장 예시

```sql
SELECT id, node_type, name, properties 
FROM graph_node 
WHERE node_type = 'job' 
LIMIT 1;
```

예상 결과:
```json
{
  "id": 101,
  "node_type": "job",
  "name": "daily_sales_aggregation",
  "properties": {
    "type": "SELF-TYPE",
    "status": "RUNNING",
    "owner": "user_a",
    "labels": {
      "project": "self-scheduling",
      "team": "data-platform"
    },
    "schedule": {
      "cron_expression": "@daily"
    }
  }
}
```

---

## 3. Generated Column 적용 가능성

### 3.1 JSON 경로 확인

#### Owner 추출
```sql
JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner'))
```
- **경로**: `properties.owner`
- **타입**: VARCHAR
- **예시**: "user_a"

#### Project 추출
```sql
JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project'))
```
- **경로**: `properties.labels.project`
- **타입**: VARCHAR
- **예시**: "self-scheduling"

### 3.2 NULL 처리

```sql
-- owner가 없는 경우
properties = {"type": "SELF-TYPE", "labels": {...}}
→ owner_id = NULL

-- labels가 없는 경우
properties = {"type": "SELF-TYPE", "owner": "user_a"}
→ project_id = NULL

-- labels.project가 없는 경우
properties = {"owner": "user_a", "labels": {"team": "data"}}
→ project_id = NULL
```

---

## 4. 검증 필요 사항

### 4.1 데이터 일관성 확인

실제 운영 데이터에서 확인 필요:

```sql
-- 1. owner 필드 존재 비율
SELECT 
  COUNT(*) as total_jobs,
  SUM(CASE WHEN JSON_EXTRACT(properties, '$.owner') IS NOT NULL THEN 1 ELSE 0 END) as has_owner,
  SUM(CASE WHEN JSON_EXTRACT(properties, '$.labels.project') IS NOT NULL THEN 1 ELSE 0 END) as has_project
FROM graph_node
WHERE node_type = 'job';

-- 2. owner 값 분포
SELECT 
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.owner')) as owner_id,
  COUNT(*) as job_count
FROM graph_node
WHERE node_type = 'job'
  AND JSON_EXTRACT(properties, '$.owner') IS NOT NULL
GROUP BY owner_id
ORDER BY job_count DESC
LIMIT 10;

-- 3. project 값 분포
SELECT 
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.project')) as project_id,
  COUNT(*) as job_count
FROM graph_node
WHERE node_type = 'job'
  AND JSON_EXTRACT(properties, '$.labels.project') IS NOT NULL
GROUP BY project_id
ORDER BY job_count DESC
LIMIT 10;
```

### 4.2 Job Manager API 응답 확인

실제 API 응답에서 metadata 구조 확인:

```bash
# Job Manager API 호출 예시
curl -X GET "http://job-manager/api/v1/jobs?limit=1" | jq '.result[0].metadata'
```

예상 응답:
```json
{
  "owner": "user_a",
  "labels": {
    "project": "self-scheduling",
    "team": "data-platform"
  },
  "is_active": true
}
```

---

## 5. 잠재적 이슈

### 5.1 데이터 품질 이슈

**문제**: owner 또는 project 필드가 없는 Job이 있을 수 있음

**영향**:
- Generated Column 값이 NULL
- 검색 결과에서 제외됨

**해결 방안**:
1. **단기**: NULL 값 허용, 검색 시 제외
2. **중기**: Job 등록 시 필수 필드 검증 추가
3. **장기**: 기존 데이터 정제 (owner/project 기본값 설정)

### 5.2 JSON 경로 변경 리스크

**문제**: Job Manager API 응답 구조가 변경될 수 있음

**영향**:
- Generated Column이 잘못된 값 추출
- 검색 기능 오작동

**해결 방안**:
1. **API 버전 관리**: Job Manager API 버전 명시
2. **스키마 검증**: API 응답 스키마 검증 로직 추가
3. **모니터링**: NULL 값 비율 모니터링

### 5.3 성능 이슈

**문제**: Generated Column 계산 비용

**영향**:
- INSERT/UPDATE 시 약간의 오버헤드
- 저장 공간 증가 (STORED 방식)

**해결 방안**:
- STORED 방식 사용 (읽기 성능 우선)
- 인덱스 크기 모니터링
- 필요 시 VIRTUAL 방식으로 변경 고려

---

## 6. 권장 사항

### 6.1 구현 전 필수 확인

1. **데이터 샘플 확인**
   ```sql
   SELECT properties 
   FROM graph_node 
   WHERE node_type = 'job' 
   LIMIT 10;
   ```

2. **MySQL 버전 확인**
   ```sql
   SELECT VERSION();
   ```
   - 필수: 5.7.6 이상

3. **Job Manager API 테스트**
   - 실제 API 응답 구조 확인
   - metadata 필드 존재 여부 확인

### 6.2 마이그레이션 전략

1. **개발 환경 테스트**
   - Generated Column 생성
   - 기존 데이터 값 확인
   - 인덱스 성능 측정

2. **스테이징 환경 검증**
   - 실제 데이터로 테스트
   - NULL 값 비율 확인
   - 검색 성능 측정

3. **운영 환경 배포**
   - 점진적 롤아웃
   - 모니터링 강화
   - 롤백 계획 준비

---

## 7. 다음 단계

### 즉시 수행
- [ ] 실제 DB에서 properties 샘플 데이터 확인
- [ ] Job Manager API 응답 구조 문서 확인
- [ ] MySQL 버전 확인

### 구현 준비
- [ ] Generated Column 테스트 스크립트 작성
- [ ] 데이터 품질 검증 쿼리 작성
- [ ] 성능 테스트 계획 수립

---

## 부록: 참고 코드 위치

### 관련 파일
- `services/graph_command_service.py:513-543` - `_extract_job_properties()`
- `models/scheduling_lineage.py` - `SchedulingLineage` 모델
- `models/graph_node.py` - `GraphNode` 모델
- `repositories/job_repository.py` - Job 조회 로직

### 핵심 로직
```python
# services/graph_command_service.py:521-522
"owner": meta.get("owner"),
"labels": meta.get("labels", {}),
```

이 코드가 `SchedulingLineage.metadata`에서 owner와 labels를 추출하여 `graph_node.properties`에 저장합니다.
