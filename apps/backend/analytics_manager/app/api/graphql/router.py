"""
GraphQL router — wires the Strawberry schema to FastAPI with DI context.
Kept separate from main.py so adding/removing use cases only touches this file.
"""

from fastapi import Depends
from strawberry.fastapi import GraphQLRouter

from app.api.graphql.request_cache import RequestCache
from app.api.graphql.resolvers import schema
from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.application.usecase.job_explorer.job_ranking import JobRankingUseCase
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase
from app.application.usecase.table_explorer.get_table_list import GetTableListUseCase
from app.application.usecase.table_explorer.get_table_ranking import GetTableRankingUseCase
from app.controller.factory.usecase import (
    get_job_ranking_usecase,
    get_metrics_usecase,
    get_search_jobs_usecase,
    get_table_list_usecase,
    get_table_ranking_usecase,
)


async def get_graphql_context(
    metrics_uc: GetMetricsUseCase = Depends(get_metrics_usecase),
    jobs_uc: SearchJobsUseCase = Depends(get_search_jobs_usecase),
    ranking_uc: JobRankingUseCase = Depends(get_job_ranking_usecase),
    table_list_uc: GetTableListUseCase = Depends(get_table_list_usecase),
    table_ranking_uc: GetTableRankingUseCase = Depends(get_table_ranking_usecase),
) -> dict:
    return {
        "metrics_uc": metrics_uc,
        "jobs_uc": jobs_uc,
        "ranking_uc": ranking_uc,
        "table_list_uc": table_list_uc,
        "table_ranking_uc": table_ranking_uc,
        "cache": RequestCache(),  # fresh per request — memoizes repeated use-case calls
    }


graphql_router = GraphQLRouter(
    schema,
    graphql_ide="apollo-sandbox",
    context_getter=get_graphql_context,
)
