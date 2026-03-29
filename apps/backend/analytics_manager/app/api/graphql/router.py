"""
GraphQL router — wires the Strawberry schema to FastAPI with DI context.
Kept separate from main.py so adding/removing use cases only touches this file.
"""

from fastapi import Depends
from strawberry.fastapi import GraphQLRouter

from app.api.graphql.resolvers import schema
from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.application.usecase.job_explorer.job_ranking import JobRankingUseCase
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase
from app.controller.factory.usecase import (get_job_ranking_usecase,
                                            get_metrics_usecase,
                                            get_search_jobs_usecase)


async def get_graphql_context(
    metrics_uc: GetMetricsUseCase = Depends(get_metrics_usecase),
    jobs_uc: SearchJobsUseCase = Depends(get_search_jobs_usecase),
    ranking_uc: JobRankingUseCase = Depends(get_job_ranking_usecase),
) -> dict:
    return {"metrics_uc": metrics_uc, "jobs_uc": jobs_uc, "ranking_uc": ranking_uc}


graphql_router = GraphQLRouter(
    schema,
    graphql_ide="apollo-sandbox",
    context_getter=get_graphql_context,
)
