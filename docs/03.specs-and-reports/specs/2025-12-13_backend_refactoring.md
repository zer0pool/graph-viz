# Graph Lineage Sync Refactoring & Job-Level Sync API Design

작성일: 2025-12-13  
수정일: 2025-12-13  
작성자: Lineage Manager Team  
문서 버전: 1.0  
상태: Draft  

---

## 1. 목적 (Purpose)

본 문서는 **Job Manager로부터 수신한 Scheduling Lineage 데이터를 Graph Manager에 동기화하는 구조를 단순화·정합화**하기 위한 리팩토링 설계와,  
그 결과를 재활용하여 **특정 Job만 선택적으로 동기화하는 신규 API**를 정의한다.

핵심 목표는 다음과 같다.

- `SchedulingLineage` → `JobDataTransformer` → Graph 구조로 이어지는 **불필요한 중간 변환 제거**
- Job / Table / Relation 정보를 **Graph Node / Edge에 직접 저장**
- 전체 초기화 API와 **부분 Job Sync API 간 구조 재사용**

---

## 2. 배경 (Background)

현재 구조에서는 Job Manager로부터 전달받은 `SchedulingLineage` 모델을  
`JobDataTransformer` 클래스를 통해 별도의 내부 데이터 구조로 변환한 뒤  
Graph(Node / Edge)에 반영하고 있다.

그러나 실제로는:

- `SchedulingLineage` 자체가 이미 **Job / Table / Dependency 정보를 충분히 포함**
- 중간 변환 계층은 **추가 의미를 제공하지 못하고 유지보수 비용만 증가**

따라서 **SchedulingLineage → Graph Node / Edge 직접 매핑 구조**로 단순화한다.

---

## 3. 기존 문제점 요약

### 3.1 불필요한 변환 계층

- `class JobDataTransformer`
  - 단순 필드 매핑 수준
  - 의미 있는 비즈니스 로직 부재
  - 신규 API 추가 시 중복 구현 발생

### 3.2 확장성 저하

- 전체 초기화(`/graph/initialize`)와
- 부분 동기화 요구사항을 동시에 만족시키기 어려움

---

## 4. 리팩토링 핵심 설계

### 4.1 기준 데이터 모델: SchedulingLineage

Job Manager에서 전달하는 메시지는 아래 모델을 **정식 입력 포맷**으로 사용한다.

```python
class SchedulingLineage(BaseModel):
    job: JobInfo
    input_tables: list[TableInfo]
    output_tables: list[TableInfo]
    upstream_jobs: list[JobInfo]
    downstream_jobs: list[JobInfo]
    relations: list[RelationInfo]