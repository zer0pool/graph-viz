from dependency_injector import containers, providers
from src.app.repositories.graph_repository import GraphRepository
from src.app.services.graph_service import GraphService

class Container(containers.DeclarativeContainer):
    # Configuration
    config = providers.Configuration()

    # Repositories
    graph_repository = providers.Singleton(
        GraphRepository
    )

    # Services
    graph_service = providers.Singleton(
        GraphService,
        repository=graph_repository
    )