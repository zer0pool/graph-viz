# API 개선 사항 검토 및 최종안

## 1. API 구조 변경사항

### 1.1 Base URL 변경
- 변경 전: `/api/graph/*`
- 변경 후: `/api/graph-manager/*`
- 변경 이유: 기능의 범위와 목적을 더 명확히 표현

### 1.2 엔드포인트 체계화

#### 영향도 분석 API 개선
| 구분 | 변경 전 | 변경 후 | 비고 |
|------|---------|---------|------|
| 영향도 조회 | `/api/graph/job/{job_id}/impact` | `/api/graph-manager/job/{job_id}/impact?depth=3` | depth 파라미터 추가 |
| 테이블 의존성 | `/api/graph/table/{table_name}/dependencies` | `/api/graph-manager/table/{table_name}/dependencies` | 컬럼 단위 분석 명확화 |
| 병목 분석 | `/api/graph/bottlenecks` | `/api/graph-manager/bottlenecks?threshold=0.8` | 임계값 파라미터 추가 |

### 영향도 분석
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/job/{job_id}/impact` | 작업의 영향도 점수 및 중요도 분석 |
| GET | `/api/graph/job/{job_id}/critical-path` | 해당 작업이 포함된 크리티컬 패스 조회 |
| GET | `/api/graph/bottlenecks` | 병목 지점이 되는 작업들 조회 |

### 테이블 의존성 상세 분석
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/table/{table_name}/dependencies` | 테이블의 컬럼 레벨 의존성 조회 |
| GET | `/api/graph/table/{table_name}/impact` | 테이블 변경 시 영향받는 범위 분석 |

### 그래프 분석
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/subgraph` | 조건에 맞는 서브그래프 추출 |
| GET | `/api/graph/job/{job_id}/execution-history` | 작업 실행 이력 및 패턴 분석 |
| GET | `/api/graph/changes` | 그래프 구조 변경 이력 조회 |
| GET | `/api/graph/metrics` | 그래프 전체 메트릭스 |

### 배치 처리
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/graph/jobs/batch-status` | 여러 작업 상태 일괄 업데이트 |
| POST | `/api/graph/jobs/batch-analyze` | 선택된 여러 작업의 관계 분석 |

### 모니터링 및 알림
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/graph/alerts/configure` | 영향도 기반 알림 설정 |
| GET | `/api/graph/alerts/status` | 현재 알림 상태 조회 |

### 시각화
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/view/timeline` | 타임라인 뷰용 데이터 |
| GET | `/api/graph/view/hierarchy` | 계층 구조 뷰용 데이터 |
| GET | `/api/graph/view/dependency-matrix` | 의존성 매트릭스 데이터 |

## 메타데이터 개선 제안

### 노드(작업) 메타데이터
- 평균 실행 시간
- 실패율
- 리소스 사용량
- 마지막 성공/실패 시각
- 담당자/팀 정보
- 중요도 레벨

### 엣지(의존성) 메타데이터
- 의존성 유형 (데이터/API/트리거 등)
- SLA 요구사항
- 데이터 전송량
- 실패 시 영향도



## 상세 API 명세 및 사용 시나리오

### 1️⃣ 영향도 분석 (Impact & Dependency)
Method	Endpoint	Description	Example
GET	/api/graph-manager/job/{job_id}/impact	특정 Job의 downstream 영향도 조회 (테이블/Job 기준 depth별)	/api/graph-manager/job/JOB_1234/impact?depth=3
GET	/api/graph-manager/job/{job_id}/critical-path	주어진 Job이 포함된 크리티컬 경로 조회	/api/graph-manager/job/JOB_1234/critical-path
GET	/api/graph-manager/bottlenecks	전체 DAG 내 병목 Job 탐지	/api/graph-manager/bottlenecks?threshold=0.8
GET	/api/graph-manager/table/{table_name}/dependencies	특정 테이블의 컬럼 단위 의존성 분석	/api/graph-manager/table/dwh.sales/dependencies
GET	/api/graph-manager/table/{table_name}/impact	테이블 변경 시 영향을 받는 Job 범위 조회	/api/graph-manager/table/dwh.sales/impact

#### 사용 시나리오
1. 작업 영향도 분석
   - 운영자는 Job 또는 Table 삭제 시 downstream 영향도와 의존 관계를 탐색
   - 특정 depth까지의 영향도만 확인 가능
   - 테이블 단위, Job 단위 분석 지원

2. SLA 관리
   - critical-path API로 SLA 지연 위험 구간을 파악
   - 작업 처리 시간이 긴 경로 식별
   - SLA 위반 가능성이 높은 구간 사전 감지

3. 병목 구간 분석
   - bottlenecks API로 평균 실행 지연이 높은 노드 식별
   - threshold 설정으로 모니터링 임계치 조정
   - 실시간 병목 현상 감지 및 알림

#### 응답 형식
```json
{
    "impact": {
        "score": 0.85,
        "affectedJobs": [
            {
                "id": "JOB_1234",
                "name": "일일 매출 집계",
                "delayProbability": 0.75
            }
        ],
        "affectedTables": [
            {
                "name": "dwh.sales",
                "impact": "high",
                "dependencies": ["column1", "column2"]
            }
        ]
    }
}
```

### 2️⃣ 그래프 분석 및 변경 이력
Method	Endpoint	Description	Example
GET	/api/graph-manager/subgraph	조건에 맞는 서브그래프 추출 (예: 특정 Owner, Project 기준)	/api/graph-manager/subgraph?owner=data_team
GET	/api/graph-manager/job/{job_id}/execution-history	특정 Job의 실행 이력과 패턴 조회	/api/graph-manager/job/JOB_1234/execution-history?limit=10
GET	/api/graph-manager/changes	그래프 구조 변경 이력 조회	/api/graph-manager/changes?from=2025-10-01&to=2025-11-01
GET	/api/graph-manager/metrics	그래프 전반의 메트릭(노드 수, 평균 degree, 밀도 등) 조회	/api/graph-manager/metrics

#### 사용 시나리오
1. 변경 이력 추적
   - 특정 기간의 DAG 구조 변화(diff) 추적
   - Job 추가/삭제/수정 이력 조회
   - 테이블 스키마 변경 이력 확인

2. 그래프 메트릭스 모니터링
   - 전체 DAG 상태 모니터링
   - 노드 수, 평균 degree, 그래프 밀도 등 지표 추적
   - 시계열 기반 추세 분석

3. 서브그래프 분석
   - 특정 조건(owner, project)에 맞는 서브그래프 추출
   - 독립적인 컴포넌트 식별
   - 순환 의존성 검출

#### 응답 형식
```json
{
    "changes": {
        "period": {
            "from": "2025-10-01",
            "to": "2025-11-01"
        },
        "summary": {
            "addedNodes": 5,
            "removedNodes": 2,
            "modifiedEdges": 8
        },
        "details": {
            "addedJobs": ["JOB_A", "JOB_B"],
            "removedTables": ["old_table"],
            "modifiedDependencies": [
                {
                    "source": "JOB_A",
                    "target": "JOB_C",
                    "changeType": "added"
                }
            ]
        }
    }
}
```

### 3️⃣ 상태 일괄 업데이트 및 분석
Method	Endpoint	Description	Example
POST	/api/graph-manager/jobs/batch-status	여러 Job 상태를 일괄 변경 (Active/Inactive)	POST body: {"jobs": ["JOB_1","JOB_2"], "status": "inactive"}

#### 사용 시나리오
1. 일괄 상태 관리
   - 여러 Job의 상태를 한 번에 변경
   - Active/Inactive 전환
   - 실행 우선순위 일괄 조정

2. 배치 분석
   - 선택된 여러 Job의 관계 분석
   - 공통 의존성 파악
   - 그룹 단위 영향도 평가

#### 응답 형식
```json
{
    "batchUpdate": {
        "requestedJobs": ["JOB_1", "JOB_2", "JOB_3"],
        "results": {
            "success": ["JOB_1", "JOB_2"],
            "failed": ["JOB_3"],
            "reason": {
                "JOB_3": "의존성이 있는 Job이 실행 중"
            }
        },
        "metrics": {
            "totalRequested": 3,
            "successCount": 2,
            "failureCount": 1
        }
    }
}
```

## API 버전 관리
- API 버전은 URL에 명시: `/api/v1/graph-manager/*`
- 하위 호환성 보장
- 주요 변경사항 발생 시 새 버전 릴리스

## 에러 처리
```json
{
    "error": {
        "code": "DEPENDENCY_ERROR",
        "message": "의존성이 있는 Job이 실행 중입니다",
        "details": {
            "jobId": "JOB_3",
            "dependentJobs": ["JOB_4", "JOB_5"]
        }
    }
}
```

## 보안
1. 인증
   - API Key 기반 인증
   - JWT 토큰 지원
   - OAuth2.0 통합 가능

2. 권한
   - Job 단위 접근 제어
   - 읽기/쓰기 권한 분리
   - 팀/프로젝트 기반 권한 관리

## 성능 최적화
1. 캐싱
   - Redis 기반 결과 캐싱
   - 자주 조회되는 서브그래프 캐싱
   - 메모리 캐시와 디스크 캐시 계층화

2. 비동기 처리
   - 대규모 그래프 분석은 비동기로 처리
   - 웹훅으로 처리 완료 알림
   - 진행률 모니터링 API 제공
POST	/api/graph-manager/jobs/batch-analyze	여러 Job 간 관계 및 영향도 일괄 분석	POST body: {"jobs": ["JOB_1","JOB_2","JOB_3"], "depth": 2}

사용 시나리오:

장애 대응 시 관련 Job들을 일괄 비활성화한다.

대규모 변경 전 전체 영향도를 한 번에 분석한다.

4️⃣ 모니터링 및 알림 설정
Method	Endpoint	Description	Example
POST	/api/graph-manager/alerts/configure	특정 영향도 이벤트 기반 알림 설정	POST body: {"type": "impact","threshold": 3,"channel": "slack"}
GET	/api/graph-manager/alerts/status	현재 알림 설정 상태 조회	/api/graph-manager/alerts/status

사용 시나리오:

특정 Job 영향도가 일정 threshold를 초과하면 Slack 알림을 받는다.

알림 설정을 자동화된 SLA 경고체계와 연동한다.

5️⃣ 시각화 데이터 제공
Method	Endpoint	Description	Example
GET	/api/graph-manager/view/timeline	Job 실행 이력의 타임라인 뷰 데이터	/api/graph-manager/view/timeline?job_id=JOB_1234
GET	/api/graph-manager/view/hierarchy	계층적 구조(Owner/Project/Job Level) 뷰 데이터	/api/graph-manager/view/hierarchy?root=JOB_1
GET	/api/graph-manager/view/dependency-matrix	의존성 매트릭스 (테이블↔Job 간 매핑)	/api/graph-manager/view/dependency-matrix

사용 시나리오:

UI는 이 API를 사용해 그래프 패널을 렌더링한다.

hierarchy API는 그래프 레이아웃 구조를 빠르게 가져올 때 유용하다.

dependency-matrix는 클러스터 분석 기반 시각화에 사용된다.

6️⃣ 사용자 정의 그래프 저장 및 재조회 (추가)
Method	Endpoint	Description	Example
POST	/api/graph-manager/custom/save	현재 그래프 구조(JSON) 저장	POST body: { "name": "My DAG", "structure": {...} }
GET	/api/graph-manager/custom/list	사용자 저장 그래프 목록 조회	/api/graph-manager/custom/list?user_id=42
GET	/api/graph-manager/custom/{graph_id}	저장된 그래프 복원 (최신 데이터 동기화)	/api/graph-manager/custom/15
DELETE	/api/graph-manager/custom/{graph_id}	저장된 그래프 삭제	/api/graph-manager/custom/15

사용 시나리오:

운영자가 “현재 DAG 상태”를 저장하여 이후 동일 구조를 재조회한다.

복원 시 내부 노드 메타데이터는 최신값으로 자동 갱신된다.

7️⃣ Graph Manager + Job Manager 통합 Swagger 설계 고려사항
항목	내용
Swagger 통합 경로	/api/docs 내에서 graph-manager와 job-manager 스키마를 그룹으로 표시
공통 Tag 구조	Graph Manager, Job Manager, Alerts, Monitoring, Impact Analysis
Versioning 전략	/api/graph-manager/v1/... 형식 도입 가능
Schema 공통화	JobSummary, ImpactDetail, GraphNode, GraphEdge, GraphMetric 모델 공유
Auth 관리	공통 JWT Token Header (Authorization: Bearer) 사용
✅ 예시 Swagger 구조 (Tag별 분류)
tags:
  - name: Graph Manager
    description: 그래프 의존성 및 영향도 관리 API
  - name: Job Manager
    description: 개별 작업 등록, 실행, 상태 관리
  - name: Alerts & Monitoring
    description: SLA 및 영향도 기반 알림 관리

 