# Industry Standard: Internal API Design Patterns

This document outlines how major cloud providers and industry leaders design and manage internal APIs for metadata collection, monitoring, and service-to-service communication.

## 1. AWS (Amazon Web Services)
AWS strictly separates the **Control Plane** from the **Data Plane**. For internal metadata retrieval, they use dedicated, isolated endpoints.

*   **Instance Metadata Service (IMDSv2)**:
    *   **Endpoint**: `http://169.254.169.254/latest/meta-data/`
    *   **Pattern**: Uses a non-routable link-local address. It is physically impossible to access this endpoint from outside the instance, providing absolute isolation for system-level metadata.
    *   **[Official Documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)**

## 2. Google Cloud (GCP)
Google follows SRE (Site Reliability Engineering) principles, exposing "Standard Signals" through specialized internal gateways.

*   **Service Metadata API**:
    *   **Pattern**: Dedicated endpoints for static metadata (zones, regions) separate from resource management APIs.
    *   **API Design Guide**: Google’s public design guide (used internally since 2014) mandates the use of namespacing to isolate administrative and internal-only resources from public-facing ones.
    *   **[Official API Design Guide](https://cloud.google.com/apis/design/resources)**

## 3. Cloudflare Analytics API
Cloudflare uses a Unified GraphQL API but organizes data into logical "Analytics Groups" to separate telemetry from configuration.

*   **GraphQL Analytics Architecture**:
    *   **Endpoint**: `/client/v4/graphql`
    *   **Pattern**: Instead of thousands of REST paths, they use a single endpoint where internal metadata discovery is handled via "Introspection" and dedicated nodes within the schema.
    *   **[Official Documentation](https://developers.cloudflare.com/analytics/graphql-api/)**

## 4. Kubernetes (Cloud-Native Standard)
The industry standard for microservices (MSA) separates business logic from operational telemetry.

*   **Operational Endpoints**:
    *   **Pattern**: Use of `/healthz` (liveness), `/readyz` (readiness), and `/metrics` (Prometheus) paths.
    *   **Best Practice**: These paths are never exposed to the public internet via Ingress. They are consumed only by the orchestrator (K8s) or internal monitoring systems.

---

## 💡 Rationale for `/internal` Paths in our MSA
Following these patterns, we implemented `/lineage-manager/api/v1/internal/stats` forSeveral reasons:

1.  **Isolation (Bulkhead Pattern)**: Failures or heavy load on public APIs do not affect internal telemetry collection.
2.  **Security (Access Control)**: Easier to apply strict firewall rules (WAF/Ingress) to any path containing `*/internal/*`.
3.  **Versioning**: Internal APIs can evolve independently of public contracts, allowing faster internal system optimizations.
4.  **Clarity**: Explicitly marks the endpoint as "System-to-System," reducing confusion for frontend developers or third-party integrators.
