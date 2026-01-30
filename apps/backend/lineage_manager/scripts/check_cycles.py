import json
import sys


def check_cycles(file_path):
    with open(file_path, "r") as f:
        data = json.load(f)

    adj = {}

    # Build graph
    # Job -> Downstream Tables
    # Upstream Tables -> Job
    for item in data.get("items", []):
        job_id = f"job:{item['job_id']}"
        if job_id not in adj:
            adj[job_id] = []

        # Upstreams -> Job
        for upstream in item.get("upstreams", []):
            table_name = f"table:{upstream['name']}"
            if table_name not in adj:
                adj[table_name] = []
            adj[table_name].append(job_id)

        # Job -> Downstreams
        for downstream in item.get("downstreams", []):
            table_name = f"table:{downstream['name']}"
            if job_id not in adj:
                adj[job_id] = []
            adj[job_id].append(table_name)

    # DFS for cycle detection
    visited = set()
    stack = set()
    cycles = []

    def visit(node, path):
        if node in stack:
            # Cycle detected
            cycle_start_index = path.index(node)
            cycles.append(path[cycle_start_index:])
            return
        if node in visited:
            return

        visited.add(node)
        stack.add(node)
        path.append(node)

        for neighbor in adj.get(node, []):
            visit(neighbor, path)

        path.pop()
        stack.remove(node)

    for node in adj:
        if node not in visited:
            visit(node, [])

    if cycles:
        print(f"Cycles detected: {len(cycles)}")
        for cycle in cycles[:5]:  # Print first 5
            print(" -> ".join(cycle))
    else:
        print("No cycles detected.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 check_cycles.py <file_path>")
    else:
        check_cycles(sys.argv[1])
