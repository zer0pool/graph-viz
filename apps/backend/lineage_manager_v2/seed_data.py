import asyncio
from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.models import Project, UserAccount, GraphNode, JobNode, GraphEdge
from sqlalchemy import delete, select
import sys

async def seed():
    print("Starting seeding process...")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Clean up existing data to start fresh
            print("Cleaning up old data...")
            await session.execute(delete(JobNode))
            await session.execute(delete(GraphNode))
            await session.execute(delete(Project))
            await session.execute(delete(UserAccount))
            await session.commit()
            print("Clean-up done.")

            # 2. Add Demo Project
            project = Project(
                project_id="demo-proj",
                display_name="Demo Project",
                description="Project for testing lineage v2"
            )
            session.add(project)

            # 3. Add Demo User (SSO profile mock)
            user = UserAccount(
                user_id="user-001",
                sub="sub-001",
                login_id="admin_user",
                email="admin@example.com",
                name="Admin User",
                department="Platform Engineering",
                roles=["admin", "editor"],
                status="active"
            )
            session.add(user)
            await session.flush() # Ensure project and user are pushed
            print("Project and User added.")

            # 4. Add a Job Node to the Graph
            node = GraphNode(
                node_type="job",
                name="demo-ingestion-job"
            )
            session.add(node)
            await session.flush() # Get node.id
            print(f"GraphNode created with ID: {node.id}")

            # 5. Add Job Metadata
            job = JobNode(
                node_id=node.id,
                job_id="demo-proj-ingestion",
                project_id="demo-proj",
                owners=["user-001"],
                properties={
                    "type": "Spark",
                    "schedule": "0 * * * *",
                    "priority": "high"
                }
            )
            session.add(job)
            
            # 6. Add a Table Node
            table_node = GraphNode(
                node_type="table",
                name="raw.events_stream"
            )
            session.add(table_node)
            await session.flush()

            # 7. Add Lineage Edge
            edge = GraphEdge(
                source_node_id=node.id,
                target_node_id=table_node.id,
                edge_type="produces",
                properties={"mode": "append"}
            )
            session.add(edge)
            
            await session.commit()
            print("Job, Table nodes and Lineage Edge committed.")
            
            print("Seeding completed successfully.")

        except Exception as e:
            print(f"Error during seeding: {e}")
            await session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(seed())
