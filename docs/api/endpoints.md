# API Endpoints

## Graph Management

### Initialize and Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/graph/init` | 전체 작업 목록을 불러와 그래프 노드 및 엣지를 초기화 |
| POST | `/api/graph/sync` | 외부 Job Manager 또는 DB와 동기화 — 새로운 job/ref 테이블 반영 |
| POST | `/api/graph/rebuild/edges` | job 테이블 기반으로 edge 관계만 재구성 |
| POST | `/api/graph/rebuild/closure` | Closure Table (조상-자손 관계) 를 재생성 |
| DELETE | `/api/graph/reset` | 그래프 데이터 전체 초기화 (노드·엣지·클로저 삭제) |

### Graph Traversal
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/job/{job_id}/downstream` | 특정 job으로부터 모든 하위(DAG downstream) 노드 조회 |
| GET | `/api/graph/job/{job_id}/upstream` | 특정 job의 모든 상위(DAG upstream) 노드 조회 |
| GET | `/api/graph/job/{job_id}/neighbors` | 특정 job과 직접 연결된 인접 노드(양방향) 조회 |
| GET | `/api/graph/table/{table_name}/downstream` | 특정 테이블을 읽는 후손 job 목록 조회 |
| GET | `/api/graph/table/{table_name}/upstream` | 특정 테이블을 생성한 조상 job 목록 조회 |
| GET | `/api/graph/table/{table_name}/ancestors` | 해당 테이블로부터 올라가는 최상위 조상 테이블들 조회 |
| GET | `/api/graph/path` | 두 job 또는 테이블 간의 의존 경로 및 거리 조회 |

### Job Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/graph/job/update` | Job Manager에서 job 변경 이벤트 수신 시, 그래프 반영 |
| POST | `/api/graph/job/delete` | job 삭제 시 관련 edge 및 closure 정리 |
| GET | `/api/graph/status` | 그래프 현재 상태(노드 수, 엣지 수, 마지막 업데이트 시각 등) |