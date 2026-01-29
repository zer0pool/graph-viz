---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [agents.md]
tags: [git, workflow, branching]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.0
Status: Shipped
Title: Git Branching & Workflow Guide

Summary:
Defines the standard branching strategy and naming conventions for the project. Includes step-by-step commands for branch creation, development, and pull request submission.

---

## 1. Branch Naming Convention

All feature and bugfix branches must follow the numbering convention based on the latest remote branch index.

**Format**: `[Number].[ShortDescription]`
- **Next Available Number**: `80` (Based on highest remote branch `79.audit_api`)
- **Example**: `80.feature-auth-refactor` or `81.bugfix-cors-fix`

---

## 2. Development Workflow Commands

### Step 1: Create a New Branch
Always start from the latest `develop` (or main) branch.
```bash
# Update local main
git checkout develop
git pull origin develop

# Create and switch to new branch
git checkout -b 80.your-task-name
```

### Step 2: Committing Changes
Use descriptive commit messages.
```bash
# Add changes
git add .

# Commit with a meaningful message
git commit -m "feat: implement logic for x feature"
```

### Step 3: Pushing to Remote
Push your branch to the central repository.
```bash
# Push branch to origin
git push origin 80.your-task-name
```

### Step 4: Creating a Pull Request (PR)
You can create a PR via the GitHub Web UI or using the GitHub CLI (`gh`).

**Using GitHub CLI**:
```bash
# Create PR to the base branch (e.g., develop)
gh pr create --title "80. your task name" --body "Description of changes"
```

**Manual (Web UI)**:
1. Navigate to the project page on GitHub.
2. Click **"Compare & pull request"** for your pushed branch.
3. Ensure the title follows the `Number. Description` format.

---

## 3. Best Practices
- **Atomic Commits**: Commit small, logical units of work.
- **Sync Frequently**: Pull the base branch into your feature branch regularly to avoid large merge conflicts.
- **PR Title**: Always include the branch number in the PR title for easy tracking.
