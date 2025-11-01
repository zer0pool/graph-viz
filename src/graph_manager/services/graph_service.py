from graph_manager.repositories.graph_repository import GraphRepository

class GraphService:
    def __init__(self, repo: GraphRepository):
        self.repo = repo

    def get_graph(self, size: str):
        return self.repo.load_graph(size)

    def get_job(self, job_id: str):
        return self.repo.get_job(job_id)

    def toggle_job_enabled(self, job_id: str):
        job = self.repo.get_job(job_id)
        if not job:
            return None
        job.enabled = not job.enabled
        job.status = "active" if job.enabled else "disabled"
        return job

    def toggle_trigger(self, job_id: str):
        job = self.repo.get_job(job_id)
        if not job:
            return None
        job.trigger_enabled = not job.trigger_enabled
        return job
