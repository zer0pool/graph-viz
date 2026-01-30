from lineage_manager.core.container import GraphContainer
from lineage_manager.core.config import get_settings
from dependency_injector.wiring import Provide, inject
import json


@inject
def test_jobs(svc=Provide[GraphContainer.job.job_service]):
    result = svc.list_jobs(limit=5)
    print(json.dumps(result))


if __name__ == "__main__":
    container = GraphContainer()
    container.wire(modules=[__name__])
    test_jobs()
