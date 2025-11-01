# app/core/subgraph_extractor.py
from typing import Dict, List, Any

def extract_subgraph(graph: Dict[str, List[Dict[str, Any]]], job_id: str, depth: int = 1):
    """
    전체 그래프에서 특정 job_id를 중심으로 서브그래프 추출
    - depth: 탐색 깊이 (1 = 직접 연결만, 2 = 2단계까지 확장)
    """
    all_nodes = {n["id"]: n for n in graph["nodes"]}
    all_edges = graph["edges"]

    visited = set()
    frontier = {job_id}
    sub_nodes = {}
    sub_edges = []

    for _ in range(depth):
        next_frontier = set()
        for edge in all_edges:
            # source → target 탐색 (양방향 확장)
            if edge["source"] in frontier or edge["target"] in frontier:
                src = edge["source"]
                tgt = edge["target"]
                sub_edges.append(edge)

                if src in all_nodes:
                    sub_nodes[src] = all_nodes[src]
                if tgt in all_nodes:
                    sub_nodes[tgt] = all_nodes[tgt]

                # 다음 단계 탐색 후보에 추가
                next_frontier.update([src, tgt])
        visited |= frontier
        frontier = next_frontier - visited

    return {"nodes": list(sub_nodes.values()), "edges": sub_edges}
