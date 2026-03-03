import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.graph.service import GraphService


@pytest.mark.asyncio
async def test_create_nodes_and_lineage(session: AsyncSession):
    service = GraphService(session)

    # 1. Create Nodes
    job_node = await service.get_or_create_node("JOB", "proj.ds.processing_job")
    table_src = await service.get_or_create_node("TABLE", "proj.ds.source_table")
    table_dst = await service.get_or_create_node("TABLE", "proj.ds.dest_table")

    assert job_node.id is not None
    assert table_src.id is not None

    # 2. Setup Lineage: Source -> Job -> Dest
    await service.add_dependency(table_src.id, job_node.id)
    await service.add_dependency(job_node.id, table_dst.id)

    # 3. Verify Downstream from Source
    # Source -> Job
    lineage_src = await service.get_lineage(table_src.id, depth=1)
    # Expect: src itself + job (downstream)
    # nodes should contain at least src and job
    node_names = {n.name for n in lineage_src.nodes}
    assert "proj.ds.source_table" in node_names
    assert "proj.ds.processing_job" in node_names

    # 4. Verify Upstream from Dest
    # Job -> Dest
    lineage_dst = await service.get_lineage(
        table_dst.id, depth=1
    )  # Need to implement upstream fully or check direction
    # Current service implementation:
    # get_lineage calls get_neighbors(upstream) AND get_neighbors(downstream)
    # So for Dest, upstream should be Job.

    node_names_dst = {n.name for n in lineage_dst.nodes}
    assert "proj.ds.dest_table" in node_names_dst
    assert "proj.ds.processing_job" in node_names_dst
