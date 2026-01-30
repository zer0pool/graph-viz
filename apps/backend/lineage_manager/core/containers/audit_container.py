"""
Audit Domain Container.

Provides audit logging services independent of other domains.
"""

from dependency_injector import containers, providers

from lineage_manager.services.audit_service import AuditService
from lineage_manager.services.command_execution_service import CommandExecutionService


class AuditContainer(containers.DeclarativeContainer):
    """Container for audit logging domain."""

    # Dependencies from other containers
    core = providers.DependenciesContainer()
    graph = providers.DependenciesContainer()

    # Audit Service (uses its own database session)
    audit_service = providers.Factory(
        AuditService,
        db=core.db,
    )

    # Command Execution Service (orchestrates graph commands + audit logging)
    command_execution_service = providers.Factory(
        CommandExecutionService,
        graph_uow=graph.graph_uow,
        command_service=graph.command_service,
        audit_service=audit_service,
    )
