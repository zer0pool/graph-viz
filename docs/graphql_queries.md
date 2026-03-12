# JobRuns GraphQL Query Examples

`analytics_manager` 서비스의 GraphQL 인터페이스를 통해 Job 실행 기록(JobRuns) 및 관련 정보를 조회하는 예시 쿼리들입니다.

## 1. 최근 실행 기록 (JobRuns) 전체 조회
최근 30일간의 모든 Job 실행 기록과 필터링을 위한 Facet 정보를 가져옵니다.

```graphql
query GetRecentJobRuns {
  recentJobRuns(limit: 20, offset: 0) {
    items {
      jobId
      dagId
      projectId
      type
      owners
      issuer
      startTime
      period
      date
    }
    totalCount
    facets {
      owners
      projects
      types
      issuers
      statuses
    }
  }
}
```

## 2. 특정 날짜 이후 필터링 조회
`startedAtSince`를 사용하여 최근 7일 등 특정 시점 이후의 데이터만 조회합니다.

```graphql
query GetJobRunsLast7Days($since: String = "2026-03-05") {
  recentJobRuns(
    filter: { 
      startedAtSince: $since 
    }
    limit: 50
  ) {
    items {
      jobId
      startTime
      type
      owners
    }
    totalCount
  }
}
```

## 3. 복합 필터링 및 정렬
프로젝트, 상태, 타입을 복합적으로 필터링하고 최신순(DESC)으로 정렬합니다.

```graphql
query GetFilteredJobRuns {
  recentJobRuns(
    filter: {
      projects: ["sales-prod"],
      statuses: ["SUCCESS"],
      types: ["SELF-TYPE"]
    }
    sortOrder: DESC
    limit: 10
  ) {
    items {
      jobId
      dagId
      startTime
    }
    totalCount
  }
}
```

## 4. Job 상세 및 실행 통계 (연관 객체 조회)
Job의 설정(Config)과 성능 통계(Stats)를 한 번에 조회합니다. Relay style의 `edges`, `node` 구조를 사용합니다.

```graphql
query GetJobsWithStats {
  jobs(first: 10) {
    edges {
      node {
        id
        displayLabel
        config {
          owner
          schedule
          projectId
          type
        }
        stats {
          avgSlots
          maxSlots
          lastRunStatus
          updatedAt
          duration
          progress
        }
      }
    }
    totalCount
  }
}
```

## 5. 유저 및 프로젝트 관계 조회
특정 유저 정보와 해당 유저가 속한 프로젝트 목록을 중첩 조회합니다.

```graphql
query GetUserWithProjects($userId: ID = "u1") {
  user(id: $userId) {
    username
    fullName
    email
    projects {
      id
      displayName
      description
    }
  }
}
```

---
*참고: `recentJobRuns` 내부의 `items`에는 현재 스키마상 `status`, `duration` 등의 필드가 정의되어 있지 않으므로, 해당 정보가 필요한 경우 `jobs` 쿼리의 `stats` 필드를 활용하세요.*
