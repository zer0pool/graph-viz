# src/graph_manager/repositories/graph_repository.py
from graph_manager.models.graph import GraphNode

class GraphRepository:
    def __init__(self):
        self.jobs = {
            "job_1": GraphNode(
                id="job_1",
                label="Daily Sales Loader",
                type="job",
                status="success",      # ✅ allowed: success | failure | pending
                enabled=True
            ),
            "job_2": GraphNode(
                id="job_2",
                label="Customer ETL",
                type="job",
                status="pending",
                enabled=True
            ),
            "job_3": GraphNode(
                id="job_3",
                label="Weekly Summary",
                type="job",
                status="failure",
                enabled=False
            ),
        }

    def load_graph(self, size: str = "small"):
        nodes = list(self.jobs.values())
        edges = [
            {"source": "job_1", "target": "job_2"},
            {"source": "job_2", "target": "job_3"},
        ]
        return {"nodes": [n.dict() for n in nodes], "edges": edges}

    def get_job(self, job_id: str):
        return self.jobs.get(job_id)
