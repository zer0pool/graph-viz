from sqlalchemy import JSON, Column, DateTime, Integer, String, func
from sqlalchemy.ext.mutable import MutableDict

from .base import Base


class GraphNode(Base):
    """Unified node representation for jobs, tables, storage, etc."""

    __tablename__ = "graph_node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    node_type = Column(String(50), nullable=False)
    name = Column(String(500), nullable=False)
    properties = Column(MutableDict.as_mutable(JSON), nullable=True, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<GraphNode(id={self.id}, type={self.node_type}, name={self.name})>"

    # --- helpers ---------------------------------------------------------
    def _ensure_props(self) -> MutableDict:
        if self.properties is None:
            self.properties = {}
        return self.properties

    def _get_prop(self, key: str, default=None):
        return self._ensure_props().get(key, default)

    def _set_prop(self, key: str, value) -> None:
        self._ensure_props()[key] = value

    # --- job-centric convenience accessors -------------------------------
    @property
    def job_id(self) -> str | None:
        return self.name if self.node_type == "job" else None

    @property
    def display_name(self) -> str:
        return self._get_prop("display_name", self.name)

    @display_name.setter
    def display_name(self, value: str) -> None:
        self._set_prop("display_name", value)

    @property
    def labels(self):
        return self._get_prop("labels", {})

    @labels.setter
    def labels(self, value) -> None:
        self._set_prop("labels", value)

    @property
    def owner(self):
        return self._get_prop("owner")

    @owner.setter
    def owner(self, value) -> None:
        self._set_prop("owner", value)

    @property
    def write_mode(self):
        return self._get_prop("write_mode")

    @write_mode.setter
    def write_mode(self, value) -> None:
        self._set_prop("write_mode", value)

    @property
    def destination_types(self):
        return self._get_prop("destination_types", [])

    @destination_types.setter
    def destination_types(self, value) -> None:
        self._set_prop("destination_types", value)

    @property
    def destination_tables(self):
        return self._get_prop("destination_tables", [])

    @destination_tables.setter
    def destination_tables(self, value) -> None:
        self._set_prop("destination_tables", value)

    @property
    def trigger_tables(self):
        return self._get_prop("trigger_tables", [])

    @trigger_tables.setter
    def trigger_tables(self, value) -> None:
        self._set_prop("trigger_tables", value)

    @property
    def reference_tables(self):
        return self._get_prop("reference_tables", [])

    @reference_tables.setter
    def reference_tables(self, value) -> None:
        self._set_prop("reference_tables", value)

    @property
    def job_metadata(self):
        return self._get_prop("job_metadata", {})

    @job_metadata.setter
    def job_metadata(self, value) -> None:
        self._set_prop("job_metadata", value)

    # --- table-centric helpers ------------------------------------------
    @property
    def full_name(self) -> str:
        if self.node_type == "table":
            return self.name
        return self._get_prop("full_name", self.name)

    @full_name.setter
    def full_name(self, value: str) -> None:
        if self.node_type == "table":
            self.name = value
        self._set_prop("full_name", value)

    @property
    def project_name(self):
        return self._get_prop("project_name")

    @project_name.setter
    def project_name(self, value) -> None:
        self._set_prop("project_name", value)

    @property
    def dataset_name(self):
        return self._get_prop("dataset_name")

    @dataset_name.setter
    def dataset_name(self, value) -> None:
        self._set_prop("dataset_name", value)

    @property
    def table_name(self):
        return self._get_prop("table_name")

    @table_name.setter
    def table_name(self, value) -> None:
        self._set_prop("table_name", value)

    @property
    def storage_type(self):
        return self._get_prop("storage_type")

    @storage_type.setter
    def storage_type(self, value) -> None:
        self._set_prop("storage_type", value)

    @property
    def storage_path(self):
        return self._get_prop("storage_path")

    @storage_path.setter
    def storage_path(self, value) -> None:
        self._set_prop("storage_path", value)
