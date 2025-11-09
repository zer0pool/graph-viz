 // 02_Graph Servic 리팩토링.txt
 1. Graph Servic 리팩토링 

- (Graph Build / Sync) ,  (Graph Query) 기준으로 구분
- 지금 클래스를 둘로 나눈다. 

(Graph Query)는 Read 만을 사용하는데 속도 개선을 위하여 레디스 캐시 사용 하도록 수정. 
- redis 테스트 인스턴스는 docker 명령어로 셋업 해라. 
- redis 환경변수는 .env 에 추가해라

2. (Graph Build / Sync) 로 인하여 그래프 변경이 생기면 redis 의 값도 갱신.


3. redis 의 값을 조회 하는 API 를 만들면 어떩가?
db 의 값과 redis 의 값이 일치 하는지 혹시 불일치 하는 값이 있는지 디버깅을 위해  스캔, 비교 해보는 기능이 있으면 좋겠다. 



아래 내용은 이후 단계에서 진행 할 것이다 미리 알아 두면 좋다. 
이번 개발은 GraphService -> GraphBuildService, GraphQueryService 두개로 분리 하는 것이다. 

예시)  아래는 그래프 관련 작업이 많아 짐에 따라 분리 가능한 서비스들 예시이다. 

모든 서비스는 같은 Repository 세트를 공유하면서,다른 수준의 비즈니스 로직만 분리합니다.

이건 DDD에서 말하는 “하나의 Aggregate Root (Graph)” 를
여러 Application Service가 다른 UseCase 단위로 해석해서 쓰는 구조와 같아요.

지금 구조(GraphService + GraphQueryService)는 “핵심 서비스 2분할”로 이미 정석.

확장할 때는 목적 단위로 분리하는 게 좋습니다:

운영·초기화 → GraphBuilderService

분석·라인리지 → GraphLineageService

영향도 → GraphImpactService

정합성 → GraphValidationService

시각화/통계 → GraphVisualizationService, GraphStatsService

├─ services/
│   ├─ GraphService (write)
│   ├─ GraphQueryService (read)
│   ├─ GraphLineageService
│   ├─ GraphImpactService
│   ├─ GraphValidationService
│   └─ GraphBuilderService


🧱 구체적인 예시
① GraphBuilderService

그래프 초기화나 DB 리빌드에 사용.

class GraphBuilderService:
    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    def rebuild_from_metadata(self, jobs: list[JobRegister]):
        """모든 job/table 메타데이터를 읽어 그래프 완전 재구성"""
        self.graph_service.register_jobs(jobs)


→ FastAPI CLI, Airflow DAG 초기화, 주기적 리빌드 등에 재사용.

② GraphLineageService

Lineage API만 담당 (table_name or job_name 기준).

class GraphLineageService:
    def __init__(self, query_svc: GraphQueryService):
        self.query_svc = query_svc

    def get_table_lineage(self, table_name: str):
        dag = self.query_svc.get_table_dag_simple(table_name)
        return self._to_lineage_format(dag)

    def _to_lineage_format(self, dag):
        """UI 친화적인 데이터 포맷으로 변환"""
        return {
            "table": dag["base_table"],
            "upstream": [n for n in dag["nodes"] if n["data"]["type"] == "table" and ...],
            "downstream": ...
        }

③ GraphImpactService

데이터 변경 영향도 분석 (데이터 거버넌스용).

class GraphImpactService:
    def __init__(self, query_svc: GraphQueryService):
        self.query_svc = query_svc

    def get_downstream_jobs(self, table_name: str, depth: int = 2):
        dag = self.query_svc.get_table_dag_simple(table_name, direction="downstream", depth=depth)
        return [n for n in dag["nodes"] if n["data"]["type"] == "job"]

④ GraphValidationService

그래프 무결성 체크용 (정기점검, 배포전 검증)

class GraphValidationService:
    def __init__(self, db):
        self.db = db

    def check_cycle(self):
        """closure 테이블에 (ancestor==descendant, depth>0) 있으면 cycle"""
        return self.db.execute(text("""
            SELECT ancestor_job_id, descendant_job_id
            FROM graph_closure
            WHERE ancestor_job_id=descendant_job_id AND depth>0
        """)).fetchall()

⑤ GraphVisualizationService

뷰(렌더링) 전용 포맷터 — Cytoscape, D3.js 등 프론트 포맷 통일.

class GraphVisualizationService:
    def to_cytoscape(self, nodes, edges):
        return {
            "elements": {
                "nodes": [{"data": n["data"]} for n in nodes],
                "edges": [{"data": e["data"]} for e in edges]
            }
        }