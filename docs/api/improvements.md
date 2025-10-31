# API Improvements and Future Enhancements

## 추가 제안 엔드포인트

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