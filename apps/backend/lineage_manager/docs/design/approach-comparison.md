# 설계 방식 비교: Generated Column vs 테이블 분리

## 개요
Project/User 검색 기능 구현을 위한 두 가지 접근 방식 비교

---

## 1. 접근 방식 요약

### 방식 A: Generated Column (최소 변경)
- `graph_node` 테이블 유지
- `owner_id`, `project_id` Generated Column 추가
- 인덱스 생성

### 방식 B: 테이블 분리 (정규화)
- `graph_node`: 순수 그래프 정보만
- `job_metadata`: Job 메타데이터 분리
- `table_metadata`: Table 메타데이터 분리

---

## 2. 상세 비교

| 항목 | Generated Column | 테이블 분리 |
|------|------------------|------------|
| **구현 복잡도** | ⭐ 낮음 | ⭐⭐⭐ 높음 |
| **마이그레이션** | ALTER TABLE만 | 테이블 생성 + 데이터 이동 |
| **코드 변경** | 최소 (Repository만) | 대규모 (Model/Repo/Service) |
| **검색 성능** | ⭐⭐⭐ 우수 | ⭐⭐⭐⭐ 매우 우수 |
| **확장성** | ⭐⭐ 보통 | ⭐⭐⭐⭐ 매우 우수 |
| **데이터 일관성** | ⭐⭐ 보통 | ⭐⭐⭐⭐ 매우 우수 |
| **유지보수성** | ⭐⭐ 보통 | ⭐⭐⭐⭐ 우수 |
| **롤백 용이성** | ⭐⭐⭐⭐ 매우 쉬움 | ⭐⭐ 어려움 |
| **개발 기간** | 1-2주 | 3-4주 |

---

## 3. 검색 성능 비교

### 3.1 Generated Column 방식

```sql
-- Project 검색
SELECT * FROM graph_node
WHERE node_type = 'job'
  AND project_id = 'self-scheduling'
LIMIT 20;
```

**실행 계획**:
```
→ Index Scan on idx_graph_node_type_project
→ Filter: project_id = 'self-scheduling'
```

**예상 성능**: ~10ms (10,000개 Job 기준)

### 3.2 테이블 분리 방식

```sql
-- Project 검색
SELECT n.*, jm.*
FROM graph_node n
JOIN job_metadata jm ON n.id = jm.node_id
WHERE jm.project_id = 'self-scheduling'
LIMIT 20;
```

**실행 계획**:
```
→ Index Scan on idx_job_metadata_project
→ Nested Loop Join with graph_node (PK lookup)
```

**예상 성능**: ~8ms (10,000개 Job 기준)

**결론**: 성능 차이 미미 (인덱스 최적화 시)

---

## 4. 확장성 비교

### 4.1 새 필드 추가 시나리오

**요구사항**: Job에 `team` 필드 추가

#### Generated Column 방식
```sql
-- 1. JSON 경로 확인 필요
-- properties.labels.team 또는 properties.team?

-- 2. Generated Column 추가
ALTER TABLE graph_node
ADD COLUMN team_id VARCHAR(100)
  AS (JSON_UNQUOTE(JSON_EXTRACT(properties, '$.labels.team'))) STORED;

-- 3. 인덱스 추가
CREATE INDEX idx_graph_node_team ON graph_node(team_id);
```

**문제점**:
- JSON 경로 변경 시 Generated Column도 수정 필요
- 컬럼 수 증가 → 테이블 비대화

#### 테이블 분리 방식
```sql
-- 1. 컬럼 추가
ALTER TABLE job_metadata
ADD COLUMN team_id VARCHAR(100);

-- 2. 인덱스 추가
CREATE INDEX idx_job_metadata_team ON job_metadata(team_id);
```

**장점**:
- 명확한 스키마
- JSON 경로 독립적
- 타입 안정성

---

## 5. 데이터 일관성 비교

### 5.1 NULL 값 처리

#### Generated Column 방식
```sql
-- owner가 없는 Job
properties = {"type": "SELF-TYPE"}
→ owner_id = NULL (검색 불가)

-- 기본값 설정 불가
-- Generated Column은 계산식만 가능
```

#### 테이블 분리 방식
```sql
-- owner가 없는 Job
INSERT INTO job_metadata (node_id, owner_id, ...)
VALUES (101, 'system', ...);  -- 기본값 설정 가능

-- 또는 제약조건
ALTER TABLE job_metadata
MODIFY owner_id VARCHAR(100) NOT NULL DEFAULT 'system';
```

### 5.2 외래키 제약조건

#### Generated Column 방식
- 불가능 (Generated Column은 FK 불가)

#### 테이블 분리 방식
```sql
-- PROJECT 테이블과 연동
ALTER TABLE job_metadata
ADD CONSTRAINT fk_job_project 
FOREIGN KEY (project_id) REFERENCES project(project_id);

-- 데이터 무결성 보장
```

---

## 6. 코드 변경 범위

### 6.1 Generated Column 방식

**변경 필요**:
- ✅ Repository: 검색 메서드 추가
- ✅ Service: 최소 변경
- ✅ API: 새 엔드포인트 추가

**변경 불필요**:
- ✅ Model: 변경 없음
- ✅ 기존 API: 영향 없음

### 6.2 테이블 분리 방식

**변경 필요**:
- ⚠️ Model: JobMetadata, TableMetadata 추가
- ⚠️ Repository: 대폭 수정 (JOIN 로직)
- ⚠️ Service: 메타데이터 처리 로직 분리
- ⚠️ API: 응답 구조 변경 가능

**영향 범위**:
- 모든 Job 조회 로직
- 모든 Job 등록/수정 로직

---

## 7. 마이그레이션 복잡도

### 7.1 Generated Column 방식

```sql
-- 1단계: 컬럼 추가 (1분)
ALTER TABLE graph_node
ADD COLUMN owner_id VARCHAR(100) AS (...) STORED,
ADD COLUMN project_id VARCHAR(100) AS (...) STORED;

-- 2단계: 인덱스 생성 (5분)
CREATE INDEX idx_graph_node_owner ON graph_node(owner_id);
CREATE INDEX idx_graph_node_project ON graph_node(project_id);

-- 완료!
```

**다운타임**: 거의 없음 (온라인 DDL 가능)

### 7.2 테이블 분리 방식

```sql
-- 1단계: 테이블 생성 (1분)
CREATE TABLE job_metadata (...);
CREATE TABLE table_metadata (...);

-- 2단계: 데이터 마이그레이션 (10-30분, 데이터 양에 따라)
INSERT INTO job_metadata SELECT ... FROM graph_node WHERE node_type = 'job';
INSERT INTO table_metadata SELECT ... FROM graph_node WHERE node_type = 'table';

-- 3단계: 검증 (수동)
-- 4단계: 코드 배포
-- 5단계: properties 제거 (선택)
```

**다운타임**: 
- 옵션 1: 유지보수 시간 필요 (30분-1시간)
- 옵션 2: Blue-Green 배포 (다운타임 없음, 복잡도 증가)

---

## 8. 유지보수성

### 8.1 스키마 이해도

#### Generated Column 방식
```sql
DESCRIBE graph_node;
```
```
+-------------+--------------+
| Field       | Type         |
+-------------+--------------+
| id          | bigint       |
| node_type   | varchar(50)  |
| name        | varchar(500) |
| properties  | json         |  ← 실제 데이터
| owner_id    | varchar(100) |  ← Generated (가상)
| project_id  | varchar(100) |  ← Generated (가상)
| created_at  | datetime     |
| updated_at  | datetime     |
+-------------+--------------+
```

**문제점**:
- `owner_id`가 실제 컬럼인지 Generated인지 구분 어려움
- JSON 구조 파악 필요

#### 테이블 분리 방식
```sql
DESCRIBE job_metadata;
```
```
+------------------+--------------+
| Field            | Type         |
+------------------+--------------+
| node_id          | bigint       |  ← FK
| project_id       | varchar(100) |  ← 실제 데이터
| owner_id         | varchar(100) |  ← 실제 데이터
| status           | varchar(50)  |
| enabled          | boolean      |
| ...              | ...          |
+------------------+--------------+
```

**장점**:
- 명확한 스키마
- 타입 정보 명시
- 문서화 용이

---

## 9. 권장 사항

### 9.1 Generated Column 방식을 선택하는 경우

**적합한 상황**:
- ✅ 빠른 구현이 필요한 경우
- ✅ 검색 필드가 2-3개로 제한적인 경우
- ✅ 기존 시스템 안정성 우선
- ✅ 개발 리소스 부족

**주의사항**:
- JSON 경로 표준화 필수
- 향후 테이블 분리 마이그레이션 계획 수립

### 9.2 테이블 분리 방식을 선택하는 경우

**적합한 상황**:
- ✅ 장기적 확장성 중요
- ✅ 검색 필드가 많거나 계속 증가 예상
- ✅ 데이터 일관성 중요 (외래키 필요)
- ✅ 충분한 개발 기간 확보

**주의사항**:
- 철저한 마이그레이션 계획
- 단계적 배포 전략
- 롤백 계획 필수

---

## 10. 하이브리드 접근 (권장)

### 10.1 단계별 전환

**Phase 1: Generated Column (1-2주)**
- 빠른 기능 구현
- 사용자 피드백 수집
- 검색 패턴 분석

**Phase 2: 데이터 수집 (2-4주)**
- 검색 빈도 모니터링
- 성능 메트릭 수집
- 추가 필요 필드 파악

**Phase 3: 테이블 분리 (4-6주)**
- 검증된 요구사항 기반
- 안정적인 마이그레이션
- 점진적 전환

### 10.2 장점

✅ **리스크 최소화**
- Phase 1에서 기능 검증
- 사용자 피드백 반영

✅ **비용 최적화**
- 불필요한 과도한 설계 방지
- 실제 필요에 따른 투자

✅ **학습 기회**
- 실제 사용 패턴 파악
- 최적화 포인트 발견

---

## 11. 의사결정 체크리스트

### 즉시 결정 필요
- [ ] 구현 우선순위: 속도 vs 품질
- [ ] 예상 검색 필드 수: 2-3개 vs 5개 이상
- [ ] 개발 기간: 1-2주 vs 3-4주
- [ ] 마이그레이션 다운타임 허용 여부

### 기술적 확인
- [ ] MySQL 버전 (5.7+ for Generated Column)
- [ ] 현재 데이터 규모
- [ ] 예상 트래픽

### 조직적 확인
- [ ] 개발 리소스 가용성
- [ ] 운영팀 협조 가능 여부
- [ ] 사용자 영향도

---

## 12. 최종 권장안

### 상황별 권장

| 상황 | 권장 방식 | 이유 |
|------|----------|------|
| **빠른 MVP 필요** | Generated Column | 구현 속도 |
| **장기 프로젝트** | 테이블 분리 | 확장성 |
| **불확실한 요구사항** | 하이브리드 | 리스크 관리 |
| **레거시 시스템** | Generated Column | 안정성 |
| **신규 시스템** | 테이블 분리 | 설계 품질 |

### 일반적 권장
**하이브리드 접근 (Generated Column → 테이블 분리)**
- Phase 1으로 빠르게 기능 제공
- 검증 후 Phase 2로 안정적 전환
- 리스크와 품질의 균형
