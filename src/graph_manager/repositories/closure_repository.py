from sqlalchemy import insert, text

from graph_manager.models import GraphClosure
from graph_manager.repositories.base_repository import BaseRepository


class ClosureRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_closure")

    def add_direct(
        self,
        ancestor_id: int,
        descendant_id: int,
        ancestor_type: str,
        descendant_type: str,
    ):
        """직접 관계(depth=1) 추가"""
        self.db.execute(
            insert(GraphClosure)
            .values(
                ancestor_id=ancestor_id,
                descendant_id=descendant_id,
                ancestor_type=ancestor_type,
                descendant_type=descendant_type,
                depth=1,
            )
            .prefix_with("IGNORE")
        )

    def expand_closure(
        self,
        ancestor_id: int,
        descendant_id: int,
        ancestor_type: str,
        descendant_type: str,
    ):
        """closure 전이 확장"""
        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, ancestor_type, descendant_type, depth)
            SELECT c.ancestor_id, :v, c.ancestor_type, :descendant_type, c.depth + 1
            FROM graph_closure c WHERE c.descendant_id = :u
        """
            ),
            {"u": ancestor_id, "v": descendant_id, "descendant_type": descendant_type},
        )

        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, ancestor_type, descendant_type, depth)
            SELECT :u, c.descendant_id, :ancestor_type, c.descendant_type, c.depth + 1
            FROM graph_closure c WHERE c.ancestor_id = :v
        """
            ),
            {"u": ancestor_id, "v": descendant_id, "ancestor_type": ancestor_type},
        )
