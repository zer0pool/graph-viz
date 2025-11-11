 

 1. 목표 
 = API 개발
GET /graph/job/{job_id}/neighbors
GET /graph/table/{table_name}/neighbors


2. 설명 
목적:
특정 Job 또는 Table을 기준으로 인접 노드나 서브그래프 조회


3. 로직:

  입력 조건

  job_id 또는 table_name 으로 요청

  탐색 범위 결정

  level=1 → 바로 연결된 upstream/downstream

  level=N → N-hop까지 확장 조회

  Closure Table 이용 시

  SELECT descendant FROM closure WHERE ancestor = :job_id AND distance <= N

  결과 반환

  - 노드 리스트 + 엣지 리스트 ( Cytoscape graph 포맷)
  - 필요한 경우 시각화용 depth, direction 필드 포함


결과예시
{
  "base_table": "sales_daily",

  
  "nodes": [
    {"id": "job_a", "label": "Daily Import"},
    {"id": "job_b", "label": "Transform Table"},
    {"id": "job_c", "label": "Report Gen"}
  ],
  "edges": [
    {"source": "job_a", "target": "job_b", "trigger_table": "raw.dataset1"},
    {"source": "job_b", "target": "job_c", "trigger_table": "processed.dataset1"}
  ]
}

4. 기능 확인을 위한 테스트 코드 작성 