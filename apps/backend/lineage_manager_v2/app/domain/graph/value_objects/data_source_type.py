from enum import Enum


class DataSourceType(str, Enum):
    BIGQUERY = "bigquery"
    S3 = "s3"
    GCS = "gcs"
    KAFKA = "kafka"
    JDBC = "jdbc"
    OTHER = "other"
