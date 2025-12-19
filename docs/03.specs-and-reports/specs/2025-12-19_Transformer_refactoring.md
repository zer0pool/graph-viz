작성일: 2025-12-19
수정일: 2025-12-19
작성자: David Song
문서 버전: 0.1
상태: Draft
제목: Transformer 제거 리팩토링 설계안 (Before/After) — Lineage Manager

요약:
SchedulingLineage → Transformer → GraphSpec(Node/Edge) 변환 계층을 제거하고,
원본 도메인 모델(SchedulingLineage)을 Graph 동기화/저장/응답의 단일 소스로 사용한다.
그래프 구조와 무관한 운영/런타임 정보는 properties에만 저장/노출하여 계약을 단순화한다.

---

## 1. 배경 및 문제 정의

현재 구조는 Job Manager로부터 받은 SchedulingLineage를 중간 변환기(Transformer)로 다시 Node/Edge Spec으로 바꾼다.

- SchedulingLineage 자체가 이미 충분히 graph-friendly (job/table/relation 모두 포함)
- Transformer가 대부분 pass-through 또는 필드 재배치 수준
- 결과적으로
  - 필드 의미가 분산됨 (top-level vs meta/properties 혼재)
  - “그래프 구조 필드”와 “운영 필드(status/schedule)”가 섞임
  - 유지보수 포인트 증가 (변환 로직/스키마/테스트 중복)

---

## 2. 목표 (Goals)

1) Transformer 계층 제거
2) SchedulingLineage를 그래프 저장/응답의 단일 소스로 사용
3) 그래프 구조와 무관한 정보는 모두 properties로 정규화
4) API 응답 구조 단순화 및 계약 안정화
5) 동기화/복구(재시작) 시 데이터 일관성 개선

비목표(Non-goals):
- 그래프 레이아웃(좌표), UI 렌더링 최적화는 본 문서 범위 밖
- closure-table/lineage traversal 알고리즘 변경은 별도 문서로 다룸

---

## 3. 핵심 원칙

### 3.1 구조(Structure) vs 운영(Operational) 분리

- Structure (그래프 구성에 필요한 최소 단위)
  - Node: id/type/name, (job/table), up/down 관계를 만들 수 있는 키
  - Edge: source/target/type

- Operational (그래프 구조와 무관하지만 상세 패널/운영에 필요한 정보)
  - status, schedule(cron), owner, labels, tags, engine-specific fields, timestamps 등

✅ 규칙:
- Operational 정보는 **항상 `properties` 하위**에만 저장/노출한다.
- Node/Edge의 top-level에는 그래프 렌더링에 필요한 최소 필드만 둔다.

---

## 4. Before / After 아키텍처

## 4.1 Before (현재)

```text
Job Manager API
  -> SchedulingLineage DTO
      -> JobDataTransformer / GraphTransformer
          -> GraphSpec(nodes, edges)
              -> GraphService.save_graph(spec)
                  -> DB(graph_node, graph_edge, ...)
                      -> API Response(GraphSpec)
