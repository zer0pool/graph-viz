import json
import random

# =============================================================================
# 1. Real Public Datasets (Partitioned into 5 Groups)
# =============================================================================
ALL_REAL_TABLES = [
    # Group 1 (Inputs for Layer 1)
    "bigquery-public-data.austin_bikeshare.bikeshare_stations",
    "bigquery-public-data.austin_bikeshare.bikeshare_trips",
    "bigquery-public-data.bitcoin_blockchain.blocks",
    "bigquery-public-data.bitcoin_blockchain.transactions",
    "bigquery-public-data.hacker_news.stories",
    "bigquery-public-data.hacker_news.comments",
    "bigquery-public-data.hacker_news.full",
    "bigquery-public-data.hacker_news.full_201510",
    "bigquery-public-data.github_repos.commits",
    "bigquery-public-data.github_repos.files",
    
    # Group 2 (Outputs of L1, Inputs for L2)
    "bigquery-public-data.github_repos.languages",
    "bigquery-public-data.github_repos.licenses",
    "bigquery-public-data.census_bureau_acs.censustract_2018_5yr",
    "bigquery-public-data.census_bureau_acs.zip_codes_2018_5yr",
    "bigquery-public-data.census_bureau_acs.state_2018_5yr",
    "bigquery-public-data.census_bureau_acs.county_2018_5yr",
    "bigquery-public-data.census_bureau_acs.blockgroup_2018_5yr",
    "bigquery-public-data.census_bureau_acs.places_2018_5yr",
    "bigquery-public-data.census_bureau_acs.zcta_2018_5yr",
    "bigquery-public-data.census_bureau_acs.congressional_district_2018_5yr",

    # Group 3 (Outputs of L2, Inputs for L3)
    "bigquery-public-data.census_bureau_acs.school_district_unified_2018_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_elementary_2018_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_secondary_2018_5yr",
    "bigquery-public-data.census_bureau_acs.censustract_2017_5yr",
    "bigquery-public-data.census_bureau_acs.zip_codes_2017_5yr",
    "bigquery-public-data.census_bureau_acs.state_2017_5yr",
    "bigquery-public-data.census_bureau_acs.county_2017_5yr",
    "bigquery-public-data.census_bureau_acs.blockgroup_2017_5yr",
    "bigquery-public-data.census_bureau_acs.places_2017_5yr",
    "bigquery-public-data.census_bureau_acs.zcta_2017_5yr",

    # Group 4 (Outputs of L3, Inputs for L4)
    "bigquery-public-data.census_bureau_acs.congressional_district_2017_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_unified_2017_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_elementary_2017_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_secondary_2017_5yr",
    "bigquery-public-data.census_bureau_acs.censustract_2016_5yr",
    "bigquery-public-data.census_bureau_acs.zip_codes_2016_5yr",
    "bigquery-public-data.census_bureau_acs.state_2016_5yr",
    "bigquery-public-data.census_bureau_acs.county_2016_5yr",
    "bigquery-public-data.census_bureau_acs.blockgroup_2016_5yr",
    "bigquery-public-data.census_bureau_acs.places_2016_5yr",

    # Group 5 (Outputs of L4, Inputs for L5)
    "bigquery-public-data.census_bureau_acs.zcta_2016_5yr",
    "bigquery-public-data.census_bureau_acs.congressional_district_2016_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_unified_2016_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_elementary_2016_5yr",
    "bigquery-public-data.census_bureau_acs.school_district_secondary_2016_5yr",
    "bigquery-public-data.baseball.games_post_wide",
    "bigquery-public-data.baseball.games_wide",
    "bigquery-public-data.baseball.schedules",
    "bigquery-public-data.chicago_taxi_trips.taxi_trips",
    "bigquery-public-data.covid19_open_data.covid19_open_data"
]

# Split into 5 distinct sets
TABLE_GROUPS = {
    1: ALL_REAL_TABLES[0:10],
    2: ALL_REAL_TABLES[10:20],
    3: ALL_REAL_TABLES[20:30],
    4: ALL_REAL_TABLES[30:40],
    5: ALL_REAL_TABLES[40:50]
}

# =============================================================================
# 2. Comparison Logic (Self vs Request)
# =============================================================================
# We need 1000 items for Self-Type and 1000 items for Request-Type.
# Total 2000 items.

TOTAL_JOBS_PER_TYPE = 1000

# Distribution of job counts per layer:
# L1 count should be 2x L5 count. Linear decrease.
# Weights: 8, 7, 6, 5, 4 (Sum=30)
# 1000 / 30 = 33.33
COUNTS = {
    1: int(33.333 * 8), # ~266
    2: int(33.333 * 7), # ~233
    3: int(33.333 * 6), # ~200
    4: int(33.333 * 5), # ~166
    5: int(33.333 * 4), # ~133
}
# Adjust to sum exactly to 1000
current_sum = sum(COUNTS.values())
if current_sum < 1000:
    COUNTS[1] += (1000 - current_sum)

def get_storage(name: str) -> str:
    if name.startswith("s3://"): return "s3"
    if name.startswith("gs://"): return "gcs"
    return "bigquery"

def format_dependency(name, is_upstream=True):
    storage = get_storage(name)
    dep = {
        "type": "table",
        "name": name,
        "storage": storage
    }
    if is_upstream:
        dep["dependency_type"] = "SOFT" if storage != "bigquery" else "HARD"
    else:
        dep["write_mode"] = "OVERWRITE" if storage != "bigquery" else "APPEND"
    return dep

def generate_jobs_for_type(type_name):
    # type_name: "SELF" or "REQUEST"
    jobs = []
    
    # Layer 1 -> Writes to Group 2
    for layer in range(1, 6):
        count = COUNTS[layer]
        input_group = TABLE_GROUPS[layer]
        # Valid output group: next layer's tables, OR if layer 5, maybe just same group or terminal?
        # "1 -> 2 ... 5 -> ?" 
        # Let's assume Layer 5 jobs write to "Output" tables which might just be Group 5 tables again or generated ones.
        # But to keep graphs clean, let's say Layer 5 writes to Group 5 (or derived from it).
        # Actually prompt says: "5단계로 갈수록..."
        # Let's assume:
        # Job L1: reads Group 1, writes Group 2
        # ...
        # Job L4: reads Group 4, writes Group 5
        # Job L5: reads Group 5, writes (some terminal output, maybe randomly generated based on Group 5 names)
        
        output_group = TABLE_GROUPS[layer + 1] if layer < 5 else TABLE_GROUPS[5] 
        
        for i in range(count):
            job_id = f"{type_name}_L{layer}_JOB_{i:03d}"
            
            # ---------------------------
            # UPSTREAMS
            # ---------------------------
            # "1단계 테이블 여러개에서 파일을 읽는다"
            # Randomly pick 1-3 inputs from current input_group
            num_inputs = random.randint(1, 3)
            # 20% of Layer 1 sources should be S3
            # "20% 의 1단계 테이블은 S3 에서 파일을 읽어오는" -> Means 20% of the *Inputs*? Or 20% of Jobs read from S3?
            # Let's make it simple: For Layer 1 jobs, each input has 20% chance of being S3.
            
            upstreams = []
            for _ in range(num_inputs):
                base_table = random.choice(input_group)
                
                is_s3_input = False
                if layer == 1 and random.random() < 0.2:
                    is_s3_input = True
                
                if is_s3_input:
                    # Convert to fake S3 path
                    # s3://public-data-source/austin_bikeshare/stations
                    # But user asked for S3.
                    up_name = f"s3://amazon-public-data/{base_table.replace('.', '/')}"
                else:
                    up_name = base_table
                
                upstreams.append(format_dependency(up_name, is_upstream=True))

            # NEW REQUIREMENT: "3단계 -- 4단계로 만드는 작업은 50% 가 10개의 작업에서 데이터를 읽어오도록 만들어라."
            # This refers to Layer 4 Jobs (which connect L3 -> L4).
            # So if layer == 4, 50% of them should start with 10 inputs from Previous Layer (L3 outputs = Group 4? No wait).
            # Logic above: Layer N Job reads from Input Group N.
            # Layer 1 reads Group 1. ... Layer 4 reads Group 4.
            # So for Layer 4, input_group is TABLE_GROUPS[4].
            if layer == 4 and random.random() < 0.5:
                 # Override upstreams to have 10 inputs
                 upstreams = []
                 for _ in range(10):
                     base_table = random.choice(input_group)
                     upstreams.append(format_dependency(base_table, is_upstream=True))

            # ---------------------------
            # DOWNSTREAMS
            # ---------------------------
            # "2단계 테이블 1개에 쓴다"
            # Pick 1 output from output_group.
            # "4, 5 단계 부터는 5% 의 Job 은 gcs 에 , 나머지 5% 는 s3 에 파일을 쓰는 것으로 만들어라."
            
            is_gcs_out = False
            is_s3_out = False
            
            if layer >= 4:
                r = random.random()
                if r < 0.05:
                    is_gcs_out = True
                elif r < 0.10:
                    is_s3_out = True
            
            base_out_table = random.choice(output_group)
            # To avoid all jobs overwriting exactly the same table name without variety, 
            # maybe append job_id to output table name? 
            # "demo.analytics.L1_OUT_023" style.
            # But user wants REAL table names.
            # If I write to "bigquery-public-data....", it implies I am modifying public data? No, it's dummy.
            # Let's use the real table name as is. High fan-in is fine.
            
            if is_gcs_out:
                out_name = f"gs://gcp-public-data-landsat/output/{job_id}/{base_out_table.split('.')[-1]}"
            elif is_s3_out:
                out_name = f"s3://amazon-public-data/output/{job_id}/{base_out_table.split('.')[-1]}"
            else:
                out_name = base_out_table
                
            downstreams = [format_dependency(out_name, is_upstream=False)]

            # Metadata
            # NEW: Diversified owners and projects
            owners = ["generated_script", "admin@google.com", "data-engineer@google.com", "bi-analyst@google.com"]
            projects = ["default-project", "ecommerce-analytics", "infrastructure-monitoring", "customer-growth"]
            
            selected_owner = random.choice(owners)
            selected_project = random.choice(projects)

            labels = {
                "layer": str(layer),
                "type": type_name,
                "env": random.choice(["prod", "dev", "test"]),
                "team": random.choice(["data", "bi", "ml", "platform"]),
                "project": selected_project # Also add to labels for safety
            }

            jobs.append({
                "job_id": job_id,
                "type": type_name, # "SELF" or "REQUEST"
                "name": job_id,
                "status": "RUNNING",
                "upstreams": upstreams,
                "downstreams": downstreams,
                "schedule": {
                    "cron_expression": "@daily",
                    "start_date": "2025-01-01",
                    "end_date": "2025-12-31"
                },
                "governance": {"include_pii": random.choice([True, False])},
                "metadata": {
                    "owner": selected_owner,
                    "project": selected_project,
                    "labels": labels,
                    "lifecycle_status": "DEPLOYED"
                }
            })
            
    return jobs

# Generate
result_data = generate_jobs_for_type("SELF-TYPE") + generate_jobs_for_type("REQUEST-TYPE")

# Wrap in structure
final_json = {
    "generated_at": "2025-01-20T12:00:00Z",
    "total_count": len(result_data),
    "items": result_data
}

with open("dummy_lineage.json", "w") as f:
    json.dump(final_json, f, indent=2)

print(f"Generated {len(result_data)} jobs in dummy_lineage.json")
