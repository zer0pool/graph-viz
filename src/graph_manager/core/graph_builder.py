# app/core/graph_builder.py
import random
import string
from typing import Literal

# -----------------------------------------------------
# 유틸 함수: 랜덤 job_id / table_name 생성
# -----------------------------------------------------
def random_job_id() -> str:
    suffix = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f"job_{suffix}"

def random_table_name(prefix="table") -> str:
    suffix = ''.join(random.choices(string.ascii_lowercase, k=3))
    return f"{prefix}_{suffix}"


# -----------------------------------------------------
# 그래프 구성 클래스
# -----------------------------------------------------
class GraphBuilder:
    """
    그래프를 구성하는 샘플 데이터 생성기
    (small / medium / large 그래프 생성)
    """

    def __init__(self, size: Literal["small", "medium", "large"] = "medium"):
        self.size = size
        self.nodes = []
        self.edges = []

        if size == "small":
            self.job_count = 10
        elif size == "large":
            self.job_count = 50
        else:
            self.job_count = 30

    # ------------------------------------------
    # 메인 함수: 그래프 생성
    # ------------------------------------------
    def build(self):
        # 1️⃣ Job 노드 생성
        jobs = [self._create_job(i) for i in range(self.job_count)]

        # 2️⃣ Job 간 의존 관계 생성 (DAG)
        for idx, job in enumerate(jobs):
            # 일부 job 은 upstream 을 랜덤 연결
            upstream_candidates = jobs[:idx]
            if upstream_candidates and random.random() > 0.4:
                upstream = random.choice(upstream_candidates)
                self._connect_jobs(upstream, job)

        # 3️⃣ Table 노드 + Edge 연결
        for job in jobs:
            self._connect_tables(job)

        return {"nodes": self.nodes, "edges": self.edges}

    # ------------------------------------------
    # 내부 함수
    # ------------------------------------------
    def _create_job(self, index: int):
        job_id = f"job_{index:03d}"
        label = f"Job {index:03d}"
        node = {
            "id": job_id,
            "type": "job",
            "label": label,
            "run_status": random.choice(["RUNNING", "STOPPED"]),
        }
        self.nodes.append(node)
        return node

    def _connect_jobs(self, upstream, downstream):
        """Job → Job 관계 (데이터 처리 순서)"""
        self.edges.append({
            "source": upstream["id"],
            "target": downstream["id"],
            "relation": "depends_on",
        })

    def _connect_tables(self, job):
        """Job 과 Table 간 관계"""
        ref_count = random.randint(1, 3)
        dest_count = 1

        reference_tables = [random_table_name("ref") for _ in range(ref_count)]
        destination_tables = [random_table_name("dest") for _ in range(dest_count)]

        # reference → job
        for table in reference_tables:
            self._add_table_node(table)
            self.edges.append({
                "source": f"table_{table}",
                "target": job["id"],
                "relation": "reads"
            })

        # job → destination
        for table in destination_tables:
            self._add_table_node(table)
            self.edges.append({
                "source": job["id"],
                "target": f"table_{table}",
                "relation": "writes"
            })

        # Job에 부가 정보 저장 (패널용)
        job["reference_tables"] = reference_tables
        job["destination_table"] = destination_tables[0]
        job["trigger_tables"] = random.sample(destination_tables, 1)

    def _add_table_node(self, name: str):
        """중복 방지: table 노드 등록"""
        node_id = f"table_{name}"
        if not any(n["id"] == node_id for n in self.nodes):
            self.nodes.append({
                "id": node_id,
                "type": "table",
                "label": name,
                "trigger_active": random.choice([True, False])
            })


# -----------------------------------------------------
# 외부 사용 진입점
# -----------------------------------------------------
def generate_sample_graph(size: Literal["small", "medium", "large"] = "medium"):
    builder = GraphBuilder(size=size)
    return builder.build()
