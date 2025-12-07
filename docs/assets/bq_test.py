from google.cloud import bigquery

def get_table_info(full_name: str):
    """
    full_name format: project.dataset.table
    Example: bigquery-public-data.america_health_rankings.america_health_rankings
    """

    client = bigquery.Client()

    # 1) Pull table metadata
    table = client.get_table(full_name)

    print("\n=== BASIC ===")
    print("Full name:", table.full_table_id)
    print("Project:", table.project)
    print("Dataset:", table.dataset_id)
    print("Table:", table.table_id)
    print("Description:", table.description)
    print("Type:", table.table_type)  # TABLE / VIEW / MATERIALIZED_VIEW

    print("\n=== TIME / SIZE ===")
    print("Created:", table.created)
    print("Last Modified:", table.modified)
    print("Num Rows:", table.num_rows)
    print("Num Bytes:", table.num_bytes)
    print("Expiration:", table.expires)

    print("\n=== SCHEMA ===")
    for field in table.schema:
        print({
            "name": field.name,
            "type": field.field_type,
            "mode": field.mode,
            "description": field.description,
            "policy_tags": field.policy_tags.names if field.policy_tags else None
        })

    print("\n=== PARTITIONING ===")
    print("Time Partitioning:", table.time_partitioning)
    if table.time_partitioning:
        print("  Type:", table.time_partitioning.type_)
        print("  Field:", table.time_partitioning.field)
        print("  Expiration:", table.time_partitioning.expiration_ms)

    print("\n=== RANGE PARTITIONING ===")
    print("Range Partitioning:", table.range_partitioning)

    print("\n=== CLUSTERING ===")
    print("Clustering Fields:", table.clustering_fields)

    print("\n=== ENCRYPTION ===")
    if table.encryption_configuration:
        print("KMS Key Name:", table.encryption_configuration.kms_key_name)

    print("\n=== SNAPSHOT / BASE TABLES ===")
    print("Snapshot:", table.snapshot_definition)
    print("Base Table Reference:", table._properties.get("tableReference"))

    print("\n=== VIEW DEFINITIONS ===")
    print("View Query:", getattr(table, "view_query", None))
    print("Materialized View:", getattr(table, "materialized_view", None))

    print("\n=== LABELS ===")
    print("Labels:", table.labels)

    print("\n=== ETAG ===")
    print("ETag:", table.etag)

    print("\n=== FULL RAW PROPERTIES ===")
    print(table._properties)  # Debugging: full metadata payload


if __name__ == "__main__":
    # Target public dataset table
    target_table = "bigquery-public-data.america_health_rankings.america_health_rankings"

    print(f"Fetching table metadata for: {target_table}")
    get_table_info(target_table)
