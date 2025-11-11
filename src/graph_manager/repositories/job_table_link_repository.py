import logging

from sqlalchemy import insert, select, text

from graph_manager.models import GraphJobTableLink
from graph_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class JobTableLinkRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_job_table_link")

    def link_job_table(self, job_id: int, table_id: int, io_type: str):
        """Create a job-table link entry"""
        logger.debug(
            f"Creating job-table link: job_id={job_id}, table_id={table_id}, io_type={io_type}"
        )

        self.db.execute(
            insert(GraphJobTableLink)
            .values(
                job_id=job_id,
                table_id=table_id,
                io_type=io_type,
            )
            .prefix_with("IGNORE")
        )
        logger.debug(f"Job-table link created successfully")

    def get_jobs_by_table_and_io_type(self, table_id: int, io_type: str):
        """Get all jobs linked to a table with specific IO type"""
        from graph_manager.models import GraphJobNode

        query = (
            select(GraphJobNode)
            .join(GraphJobTableLink, GraphJobNode.id == GraphJobTableLink.job_id)
            .where(
                GraphJobTableLink.table_id == table_id,
                GraphJobTableLink.io_type == io_type,
            )
            .distinct()
        )
        return self.db.execute(query).scalars().all()

    def get_tables_by_job_and_io_type(self, job_id: int, io_type: str):
        """Get all tables linked to a job with specific IO type"""
        from graph_manager.models import GraphTableNode

        query = (
            select(GraphTableNode)
            .join(GraphJobTableLink, GraphTableNode.id == GraphJobTableLink.table_id)
            .where(
                GraphJobTableLink.job_id == job_id,
                GraphJobTableLink.io_type == io_type,
            )
            .distinct()
        )
        return self.db.execute(query).scalars().all()

    def get_related_tables_through_jobs(self, table_id: int):
        """Get tables that are related through shared jobs"""
        from sqlalchemy.orm import aliased

        from graph_manager.models import GraphTableNode

        # Create aliases for the join table
        link1 = aliased(GraphJobTableLink, name="l1")
        link2 = aliased(GraphJobTableLink, name="l2")

        query = (
            select(GraphTableNode)
            .join(link1, GraphTableNode.id == link1.table_id)
            .join(link2, link1.job_id == link2.job_id)
            .where(link2.table_id == table_id, GraphTableNode.id != table_id)
            .distinct()
        )
        return self.db.execute(query).scalars().all()

    # def clear_all(self):
    #     """Clear all job-table links"""
    #     logger.info("Clearing all job-table links")
    #     self.db.execute(text(f"DELETE FROM {self.table_name}"))
    #     logger.debug("All job-table links cleared")
