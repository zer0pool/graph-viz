Title: Search Autocomplete API

Summary
- Adds a backend suggestion endpoint for jobs and tables.

Endpoint
- `GET /api/v1/search/suggest?q=...&limit=10`

Response
```
{
  "query": "sal",
  "jobs": [{"job_id": "job_sales", "name": "Daily Sales"}],
  "tables": [{"full_name": "mart.sales_daily"}]
}
```

Implementation
- Router: `src/graph_manager/api/v1/endpoints/search.py`
- Service: `GraphQueryService.search_suggestions`
- Repositories: `JobRepository.search`, `TableRepository.search`

