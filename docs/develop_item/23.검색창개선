# Lineage Manager – 검색창 개선 설계 문서

## 방식: ⭐ Suggestion Dropdown 기반 검색 UX 개선

---

## 1. 목적

현재 Lineage Manager의 검색 기능은:

- 검색 입력 후 “Enter”를 눌러야 동작하고
- 검색 결과가 단순 문자열 리스트 형태이며
- 테이블 / 작업 / 소유자 등의 구분이 없음

이로 인해 검색 효율성이 떨어진다.

이를 개선하기 위해 **GCP Console 스타일의 Auto-Suggestion Dropdown** 을 도입하여

**검색 입력 즉시 결과를 그룹별로 시각화하는 현대적인 검색 UX** 를 구축한다.

이 문서는 **최소한의 코드 변경으로 가장 큰 UX 개선 효과**를 얻기 위한

간단하고 실용적인 설계 문서이다.

---

## 2. 전체 목표

### ✔ 검색창에서 입력 즉시 자동 제안(Suggestion Dropdown) 제공

### ✔ 결과는 테이블 / 작업 / 소유자 별로 그룹화된 형태로 표시

### ✔ 별도의 Command Palette 또는 전체 검색 페이지는 생성하지 않음

### ✔ 기존 UI/라우팅을 변경하지 않고 최소한의 컴포넌트만 추가

### ✔ 검색 API를 하나로 통합하여 유지보수성 향상

---

## 3. 적용 방식 요약

> 사용자가 검색창에 입력 → Debounce(200ms) → /api/v1/search?q= API 호출 → Dropdown에 결과 표시
> 

Dropdown 종료는:

- 입력 내용 삭제
- 검색창 blur
- ESC 키 입력
등의 이벤트에서 이루어진다.

---

## 4. Suggestion Dropdown 구성

검색창 아래에 나타나는 Dropdown 구성 예시는 다음과 같다.

🔍 sales

Tables
• demo.analytics.sales_daily
• demo.analytics.sales_hourly

Jobs
• SALES_AGG_DAILY
• SALES_VALIDATE

Owners
• data-team-sales

yaml
코드 복사

### 4.1 항목 구성

| 그룹 | 데이터 출처 |
| --- | --- |
| **Tables** | graph_table_node.full_name prefix 검색 |
| **Jobs** | graph_job_node.job_id 또는 name prefix 검색 |
| **Owners** | meta.owner / job.owner prefix 검색 |

추가할 수 있는 항목(옵션):

- S3 / GCS storage paths
- recent viewed history
- tags

---

## 5. Backend API 설계

### 5.1 Endpoint

GET /api/v1/search?q={text}&limit=10

yaml
코드 복사

### 5.2 Request Params

| 파라미터 | 설명 | 기본값 |
| --- | --- | --- |
| q | 검색어 prefix | 필수 |
| limit | 각 그룹별 최대 반환 개수 | 10 |

---

### 5.3 Response Schema

```json
{
  "tables": [
    {"full_name": "demo.analytics.sales_daily"},
    {"full_name": "demo.analytics.sales_hourly"}
  ],
  "jobs": [
    {"job_id": "SALES_AGG_DAILY"},
    {"job_id": "SALES_VALIDATE"}
  ],
  "owners": [
    {"name": "data-team-sales"}
  ]
}
5.4 Backend 검색 로직 요약
prefix search (LIKE 'q%')

fuzzy search(optional)

limit 적용

결과는 3개 그룹으로 나누어 반환

예시 SQL:

sql
코드 복사
SELECT full_name
FROM graph_table_node
WHERE full_name LIKE :q || '%'
LIMIT :limit;
sql
코드 복사
SELECT job_id
FROM graph_job_node
WHERE job_id LIKE :q || '%' OR name LIKE :q || '%'
LIMIT :limit;
6. Frontend 구성 설계
6.1 Debounce 처리
검색창 onInput 이벤트에 debounce 적용:

200ms 동안 입력이 없다면 검색 API 호출

부하 감소 + 사용자 경험 증가

6.2 Dropdown 렌더링 조건
Dropdown은 다음 조건에서 보여진다:

검색어가 1자 이상일 때

검색 결과 API 정상 응답 시

숨김 조건:

blur 발생

ESC 키 입력

검색창 초기화

검색 결과 0건일 경우 선택적으로 숨김

7. Dropdown UI 구성
7.1 전체 구조
php-template
코드 복사
<div class="search-dropdown">
  <div class="result-group">
    <div class="group-title">Tables</div>
    <div class="item">demo.analytics.sales_daily</div>
    ...
  </div>

  <div class="result-group"> ... Jobs ... </div>

  <div class="result-group"> ... Owners ... </div>
</div>
7.2 UI 원칙
검색창 바로 아래 absolute position으로 표시

width는 검색창과 동일

결과 그룹은 상단부터 정렬

키보드 ↑ ↓ 선택 기능은 선택적으로 구현 가능

엔터 입력 시 해당 항목으로 이동(그래프 중심으로 보기)

8. Frontend 동작 시나리오
시나리오 1: 검색 입력
사용자가 “sal” 입력

debounce → API 호출

테이블과 job이 반환됨

Dropdown 표시

시나리오 2: 항목 선택
항목 클릭

선택된 항목의 detail panel 또는 그래프 조회로 이동

Dropdown 닫힘

시나리오 3: ESC 입력
Dropdown 즉시 닫힘

9. 구현 난이도 및 장점
항목	난이도	설명
검색창 유지	매우 쉬움	기존 UI 그대로 사용
suggestion dropdown 추가	쉬움	HTML div 하나 + CSS
search API	쉬움	단일 endpoint
Command Palette(팝업)	어려움	구현 필요 없음
전체 검색 페이지	중간~어려움	생략 가능

결국 이 개선 방식은:

⭐ (효과) 검색 UX 2~3배 개선
⭐ (비용) 코드 추가 최소화, UI 영향 최소화
10. 향후 확장 포인트 (Optional)
최근 조회(Recent Views) 추천 기능

인기 검색어(Popular searches)

fuzzy ranking

검색 결과 내 키보드 네비게이션

“View All Results” 버튼 → 전체 페이지 이동

현재 설계에서는 “최소 구현”만 포함함.

11. 결론
Suggestion Dropdown 방식은 다음 이유로 현 시점에 가장 적합한 검색 개선 전략이다:

UI 컴포넌트 추가만으로 간단히 구현 가능

기존 라우팅이나 구조 변경 없음

검색 API 1개만 만들면 됨

사용자 경험은 GCP Console 수준으로 충분히 현대적

즉, 적은 투자로 가장 큰 검색 UX 개선 효과를 주는 방법이다.
```