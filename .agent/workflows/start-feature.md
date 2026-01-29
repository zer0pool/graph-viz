---
description: Start a new feature development
---

This workflow guides you through the process of starting a new feature, ensuring all required steps (spec, implementation, report) are followed.

1. **Research & Plan**: Research the requirements and create a technical specification in `docs/specs/<feature-name>.md`.
2. **Implementation**:
    - Use AI to implement changes in small, logical chunks.
    - Follow the guidelines in `docs/00.guides/agents.md`.
    - Run linting and formatting:
    // turbo
    ```bash
    make format && make lint
    ```
3. **Verification**: Verify the changes with automated tests:
    // turbo
    ```bash
    make test
    ```
4. **Completion Report**: Document the changes and verification results in `docs/reports/<date>-<feature-name>-completion.md`.
