 // 02 Graph Service Refactoring
 1. Graph Service Refactoring

- Split by responsibility: (Graph Build / Sync) and (Graph Query)
- Split current class into two

(Graph Query) uses read-only operations; introduce Redis cache for performance.
- Provide Docker command to spin up a test Redis instance.
- Add Redis env vars to .env

2. When (Graph Build / Sync) modifies graph, refresh Redis values accordingly.

3. Consider an API to read values from Redis for comparison/debugging
   Check consistency between DB and Redis, scan and compare for mismatches.

Note: This initiative splits GraphService into GraphBuildService and GraphQueryService.

Examples of further service splits as responsibilities grow:

All services share the same repository set but separate business logic levels.
This aligns to DDD: a single Aggregate Root (Graph), with multiple Application
Services focused on separate use cases.

Core 2-way separation (GraphService + GraphQueryService) is the baseline.

Possible expansions:
- GraphBuilderService (operations/init)
- GraphLineageService (analysis/lineage)
- GraphImpactService (impact)
- GraphValidationService (consistency)
- GraphVisualizationService, GraphStatsService (view/stats)

Layout
├─ services/
│   ├─ GraphService (write)
│   ├─ GraphQueryService (read)
│   ├─ GraphLineageService
│   ├─ GraphImpactService
│   ├─ GraphValidationService
│   └─ GraphBuilderService

Examples
① GraphBuilderService

Used for graph initialization and DB rebuild.

class GraphBuilderService:
    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    def rebuild_from_metadata(self, jobs: list[JobRegister]):
        """Rebuild entire graph from job/table metadata"""
        self.graph_service.register_jobs(jobs)

② GraphLineageService

Dedicated to lineage API (by table_name or job_name)

class GraphLineageService:
    def __init__(self, query_svc: GraphQueryService):
        self.query_svc = query_svc

    def get_table_lineage(self, table_name: str):
        dag = self.query_svc.get_table_dag_simple(table_name)
        return self._to_lineage_format(dag)

    def _to_lineage_format(self, dag):
        return {
            "table": dag["base_table"],
            "upstream": [n for n in dag["nodes"] if n["data"]["type"] == "table"],
            "downstream": [n for n in dag["nodes"] if n["data"]["type"] == "job"],
        }

③ GraphImpactService

Impact analysis for data changes (governance)

class GraphImpactService:
    def __init__(self, query_svc: GraphQueryService):
        self.query_svc = query_svc

    def get_downstream_jobs(self, table_name: str, depth: int = 2):
        dag = self.query_svc.get_table_dag_simple(table_name, direction="downstream", depth=depth)
        return [n for n in dag["nodes"] if n["data"]["type"] == "job"]

④ GraphValidationService

For graph integrity checks (periodic or pre-deploy validation)

class GraphValidationService:
    def __init__(self, db):
        self.db = db

    def check_cycle(self):
        """Cycle if (ancestor==descendant, depth>0) in closure table"""
        return self.db.execute(text(
            """
            SELECT ancestor_job_id, descendant_job_id
            FROM graph_closure
            WHERE ancestor_job_id=descendant_job_id AND depth>0
            """
        )).fetchall()

⑤ GraphVisualizationService

View-only formatter — unify client formats (Cytoscape, D3.js)

class GraphVisualizationService:
    def to_cytoscape(self, nodes, edges):
        return {
            "elements": {
                "nodes": [{"data": n["data"]} for n in nodes],
                "edges": [{"data": e["data"]} for e in edges]
            }
        }

