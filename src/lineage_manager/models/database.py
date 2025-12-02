# from sqlalchemy import (
#     JSON,
#     Boolean,
#     Column,
#     DateTime,
#     Integer,
#     String,
#     UniqueConstraint,
#     func,
# )
# from sqlalchemy.orm import declarative_base

# Base = declarative_base()


# # ============================================================
# # 1️⃣ Job Node - 그래프 내 작업 노드
# # ============================================================
# class GraphJobNode(Base):
#     """
#     그래프 내 Job 노드 (작업 메타데이터)
#     예: BigQuery SQL 실행, ETL Task 등
#     """

#     __tablename__ = "graph_job_node"

#     id = Column(Integer, primary_key=True, autoincrement=True)
#     job_id = Column(
#         String(255), nullable=False, unique=True
#     )  # Unique identifier for the job
#     name = Column(String(255), nullable=True)  # Representative name, can be anything

#     owner = Column(String(100), nullable=True)

#     # Additional fields from legacy GraphNode
#     labels = Column(JSON, nullable=True)

#     # Job Manager specific fields
#     write_mode = Column(String(20), nullable=True)
#     destination_type = Column(String(20), nullable=True)
#     destination_table = Column(String(500), nullable=True)

#     trigger_tables = Column(JSON, nullable=True)  # List of trigger tables
#     reference_tables = Column(JSON, nullable=True)  # List of reference tables

#     # Additional metadata as JSON
#     job_metadata = Column(JSON, nullable=True)

#     created_at = Column(DateTime, default=func.now())
#     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

#     def __repr__(self):
#         return f"<GraphJobNode(id={self.id}, job_id={self.job_id}, name={self.name})>"


# # ============================================================
# # 2️⃣ Table Node - 그래프 내 데이터 객체 노드
# # ============================================================
# class GraphTableNode(Base):
#     """
#     그래프 내 Table 노드 (데이터 객체)
#     예: BigQuery 테이블, 뷰 등
#     """

#     __tablename__ = "graph_table_node"

#     id = Column(Integer, primary_key=True, autoincrement=True)
#     full_name = Column(
#         String(255), nullable=False, unique=True
#     )  # ex: project.dataset.table
#     project_name = Column(String(100), nullable=True)
#     dataset_name = Column(String(100), nullable=True)
#     table_name = Column(String(100), nullable=True)

#     # Additional fields from legacy GraphNode for table nodes
#     labels = Column(JSON, nullable=True)  # Labels for table node (JSON format)

#     # Table/Storage specific fields
#     storage_type = Column(String(50), nullable=True)  # "s3", "database", etc.
#     storage_path = Column(String(500), nullable=True)

#     created_at = Column(DateTime, default=func.now())
#     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

#     def __repr__(self):
#         return f"<GraphTableNode(id={self.id}, name={self.full_name})>"


# # ============================================================
# # 3️⃣ Job-Table Link - 입출력 관계 (Edge Source)
# # ============================================================
# class GraphJobTableLink(Base):
#     """
#     Job ↔ Table 간의 입출력 관계를 나타내는 링크 테이블
#     """

#     __tablename__ = "graph_job_table_link"

#     id = Column(Integer, primary_key=True, autoincrement=True)

#     job_id = Column(
#         Integer, nullable=False
#     )  # Integer job_id for performance (references GraphJobNode.id)
#     table_id = Column(
#         Integer, nullable=False
#     )  # Integer table_id for performance (references GraphTableNode.id)

#     # 'input' 또는 'output'
#     io_type = Column(String(10), nullable=False)

#     created_at = Column(DateTime, default=func.now())
#     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

#     __table_args__ = (
#         UniqueConstraint("job_id", "table_id", "io_type", name="uq_job_table_io"),
#     )

#     def __repr__(self):
#         return (
#             f"<GraphJobTableLink(job_id={self.job_id}, "
#             f"table_id={self.table_id}, io_type={self.io_type})>"
#         )


# # ============================================================
# # 4️⃣ Graph Edge - 노드 간의 직접적인 관계
# # ============================================================
# class GraphEdge(Base):
#     """
#     그래프 내 노드 간의 직접적인 관계 (Edge)
#     Job-to-Job, Table-to-Table 등 다양한 관계 표현
#     """

#     __tablename__ = "graph_edge"

#     id = Column(Integer, primary_key=True, autoincrement=True)

#     # Edge의 시작과 끝 노드 ID (Integer-based for performance)
#     source_node_id = Column(Integer, nullable=False)
#     target_node_id = Column(Integer, nullable=False)

#     # 소스 노드 타입 ('job' 또는 'table')
#     source_node_type = Column(String(10), nullable=False)

#     # 타겟 노드 타입 ('job' 또는 'table')
#     target_node_type = Column(String(10), nullable=False)

#     # 관계 타입 ('dependency', 'data_flow', 'triggers' 등)
#     edge_type = Column(String(50), nullable=False)

#     # 관계에 대한 레이블 정보
#     labels = Column(JSON, nullable=True)

#     # 활성화 여부
#     is_trigger_on = Column(Boolean, default=True)

#     # Readability fields for human-readable identification
#     source_job_id = Column(String(255), nullable=True)  # Human-readable job ID
#     source_table_name = Column(String(255), nullable=True)  # Human-readable table name
#     target_job_id = Column(String(255), nullable=True)  # Human-readable job ID
#     target_table_name = Column(String(255), nullable=True)  # Human-readable table name

#     created_at = Column(DateTime, default=func.now())
#     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

#     __table_args__ = (
#         UniqueConstraint(
#             "source_node_id", "target_node_id", "edge_type", name="uq_edge_relation"
#         ),
#     )

#     def __repr__(self):
#         return (
#             f"<GraphEdge(source={self.source_node_type}:{self.source_node_id}, "
#             f"target={self.target_node_type}:{self.target_node_id}, type={self.edge_type})>"
#         )


# # ============================================================
# # 5️⃣ Graph Closure Table - 전이적 관계를 위한 클로저 테이블
# # ============================================================
# class GraphClosure(Base):
#     """
#     그래프의 전이적 관계를 효율적으로 조회하기 위한 클로저 테이블
#     ancestor와 descendant 간의 모든 경로 관계 저장
#     """

#     __tablename__ = "graph_closure"

#     id = Column(Integer, primary_key=True, autoincrement=True)

#     # 조상 노드 ID (Integer-based for performance)
#     ancestor_id = Column(Integer, nullable=False)

#     # 자손 노드 ID (Integer-based for performance)
#     descendant_id = Column(Integer, nullable=False)

#     # 조상 노드 타입
#     ancestor_type = Column(String(10), nullable=False)

#     # 자손 노드 타입
#     descendant_type = Column(String(10), nullable=False)

#     # 깊이 (조상으로부터의 거리)
#     depth = Column(Integer, nullable=False, default=0)

#     # 경로 정보 (선택적: 경로 추적을 위한 메타데이터)
#     path_info = Column(JSON, nullable=True)

#     created_at = Column(DateTime, default=func.now())
#     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

#     __table_args__ = (
#         UniqueConstraint(
#             "ancestor_id", "descendant_id", "depth", name="uq_closure_path"
#         ),
#     )

#     def __repr__(self):
#         return (
#             f"<GraphClosure(ancestor={self.ancestor_type}:{self.ancestor_id}, "
#             f"descendant={self.descendant_type}:{self.descendant_id}, depth={self.depth})>"
#         )


# # # ============================================================
# # # Legacy Models (기존 호환성 유지)
# # # ============================================================
# # class GraphNode(Base):
# #     """
# #     레거시 호환성을 위한 통합 노드 모델
# #     새로운 구조에서는 GraphJobNode와 GraphTableNode를 사용 권장
# #     """

# #     __tablename__ = "graph_node"

# #     id = Column(String(50), primary_key=True)
# #     labels = Column(JSON, nullable=False)  # Labels for node (JSON format)
# #     node_type = Column(String(20), nullable=False, default="job")  # "job" or "table"
# #     status = Column(String(20), nullable=False, default="pending")
# #     enabled = Column(String(10), nullable=False, default="true")
# #     trigger_enabled = Column(String(10), nullable=False, default="true")

# #     # Job Manager specific fields (for job nodes)
# #     owner = Column(String(100), nullable=True)
# #     write_mode = Column(String(20), nullable=True)
# #     destination_type = Column(String(20), nullable=True)
# #     destination_table = Column(String(500), nullable=True)
# #     trigger_tables = Column(JSON, nullable=True)  # List of trigger tables
# #     reference_tables = Column(JSON, nullable=True)  # List of reference tables

# #     # Table/Storage specific fields (for table nodes)
# #     storage_type = Column(String(50), nullable=True)  # "s3", "database", etc.
# #     storage_path = Column(String(500), nullable=True)

# #     # Additional metadata as JSON
# #     node_metadata = Column(JSON, nullable=True)
# #     created_at = Column(DateTime, default=func.now())
# #     updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
