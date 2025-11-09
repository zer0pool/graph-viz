# src/graph_manager/repositories/graph_repository.py
from graph_manager.models.graph import GraphNode


class GraphRepository:
    def __init__(self):
        self.jobs = {
            "job_1": GraphNode(
                id="job_1",
                label="Daily Sales Loader",
                type="job",
                service_type="self-scheduling",
                status="success",  # ✅ allowed: success | failure | pending
                enabled=True,
            ),
            "job_2": GraphNode(
                id="job_2",
                label="Customer ETL",
                type="job",
                service_type="self-scheduling",
                status="pending",
                enabled=True,
            ),
            "job_3": GraphNode(
                id="job_3",
                label="Weekly Summary",
                type="job",
                service_type="self-scheduling",
                status="failure",
                enabled=False,
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
