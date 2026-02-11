SPA → MFE 이전 가이드  
**(작업 진행을 위한 설계 문서 / 강제 규칙집)**

본 문서는 **기존 SPA 기반 화면(Job / Table Detail 등)을  
Micro Frontend(MFE) 구조로 이전하기 위한 공식 가이드**이다.

이 문서의 목적은 **“어떻게 구현할 것인가”가 아니라  
“무엇을 하면 구조가 망가지는가를 방지”**하는 데 있다.

> ⚠️ 본 가이드의 규칙을 어길 경우
>
> - iframe 연동 불가
> - Admin / User Console 분리 불가
> - 독립 배포 불가
> - 장기 유지보수 비용 급증
>
> 이 문서는 **권고가 아니라 설계 제약(Constraint)**으로 취급한다.

---

## 1. 기본 전제 (Scope)

### 대상

- 기존 SPA로 구현된 Job / Table Detail 화면
- Tab 기반 상세 뷰
- Frontend / User Console에서 공용으로 사용될 기능

### 목표

- Drawer(EMBEDDED), Page, iframe(Page-less) **공용 MFE**
- Shell과 완전히 분리된 View
- 진입 방식 변화에 영향받지 않는 구조

---

## 2. ❌ 절대 하지 말아야 할 것 (Red Flags)

아래 항목 중 **하나라도 포함되면 MFE 이전 실패**로 간주한다.

---

### ❌ 2.1 View 내부에서 Router 사용

#### 금지 예시

````tsx
import { useParams } from "react-router-dom";

const JobDetail = () => {
  const { jobId } = useParams();
}
문제점
View가 Shell / Page / iframe 진입 방식에 종속

Drawer / Page / iframe 공용 불가

원칙
라우팅은 진입 App(Shell / PageApp)의 책임
View는 식별자를 props로만 받는다

허용 예시
tsx
코드 복사
<JobDetailView jobId={jobId} />
❌ 2.2 Shell 컴포넌트 직접 import
금지 예시
tsx
코드 복사
import { Sidebar } from "@/shell/Sidebar";
문제점
MFE가 Shell 구현에 종속

iframe / standalone 실행 즉시 파괴

원칙
Shell UI는 Shell 전용
MFE는 Layout을 모른다

❌ 2.3 전역 Store(Redux/Zustand)를 그대로 이전
금지 예시
tsx
코드 복사
useGlobalStore(state => state.jobDetail);
문제점
상태 충돌

MFE 간 결합

독립 배포 불가

원칙
View 내부 state

mount 시 초기값 주입

이벤트 기반 상태 변경

❌ 2.4 URL을 상태 저장소로 사용
금지 예시
tsx
코드 복사
useEffect(() => {
  navigate(`?tab=${tab}`);
}, [tab]);
문제점
Shell / iframe URL 정책과 충돌

Drawer ↔ Page 전환 시 상태 유실

원칙
URL은 “진입 식별자”만 표현한다
(jobId, tableName)

❌ 2.5 window / document 직접 접근
금지 예시
ts
코드 복사
window.addEventListener("resize", ...)
document.body.scrollTop = 0;
문제점
iframe 환경에서 오동작

다중 MFE 충돌

원칙
ref 기반 접근

eventTarget 주입

mount 옵션 활용

❌ 2.6 Admin 전용 로직을 View에 포함
금지 예시
tsx
코드 복사
if (user.role === "admin") {
  renderDeleteButton();
}
문제점
User Console 재사용 불가

iframe 재사용 불가

원칙
tsx
코드 복사
<JobDetailView canEdit={true} />
권한 판단은 Shell 또는 진입 App의 책임

❌ 2.7 SPA 구조를 그대로 복사
❌ “일단 옮기고 나중에 정리”

이 접근은 100% 실패한다.

3. ✅ 반드시 지켜야 할 것 (Golden Rules)
✅ 3.1 View는 순수 함수 컴포넌트
txt
코드 복사
입력(props)
  ↓
렌더
외부 컨텍스트 ❌

글로벌 상태 ❌

라우터 ❌

✅ 3.2 진입 App과 View를 명확히 분리
txt
코드 복사
[Shell Router / iframe Router]
        ↓
      PageApp
        ↓
  JobDetailView / TableDetailView
View는 누가 호출했는지 모른다

View는 어디에 렌더되는지 모른다

✅ 3.3 모든 외부 입력은 props 또는 mount 옵션
입력 유형	전달 방식
최초 선택	initialSelection
이후 변경	custom event
권한	props
실행 모드	props (EMBEDDED / PAGE)

✅ 3.4 공통 레이아웃은 MFE 내부에 둔다
DetailLayout

Tabs

Header

Shell 레이아웃과 절대 혼동하지 않는다.

✅ 3.5 파일 구조는 역할 기준
txt
코드 복사
views/        # 비즈니스 View
components/   # 재사용 UI
hooks/        # 데이터 로직
App.tsx       # EMBEDDED 진입
PageApp.tsx   # PAGE 진입
IframeApp.tsx # iframe 진입 (후속)
✅ 3.6 항상 스스로에게 물어볼 질문
“이 컴포넌트는
Shell 없이도 렌더 가능한가?”

YES → 합격

NO → 구조 위반

4. 이전 중 자주 발생하는 문제 (Top 5)
첫 클릭 시 빈 패널
→ initialSelection 미주입

두 번째 클릭부터만 반응
→ event-only 설계

iframe에서 깨짐
→ window / document 접근

Page 전환 시 탭 상태 유실
→ URL state 사용

User Console 재사용 실패
→ 권한 로직 View 혼입

5. 최종 원칙 (One-liner)
MFE는 “페이지가 아니라 기능 앱”이다.

Shell이 바뀌어도
View는 살아남아야 한다.

6. 문서 상태
Version: v1.0

Status: Active (설계 제약 문서)

적용 범위: Job / Table Detail MFE 이전 전 과정

## 7. Migration Plan & TODO List

Based on the analysis of legacy code (`apps/lineage_manager/static/js/app`), the following steps are required.

### Phase 1: Foundation & API Layer
- [ ] **Migrate API Client**
    - Port `apps/lineage_manager/static/js/app/services/api.js` to MFE `src/services/api.ts`.
    - Ensure `fetchWithAuth` is injected or handled via a shared auth context/hook.
- [ ] **SSO / Authentication Integration (New)**
    - **Principle**: Shell acts as the Auth Container. MFEs do *not* implement login flows.
    - **Mechanism**:
        - Shell obtains `authClient` (or equivalent token manager).
        - Shell passes `auth` object to MFE via `mount` props.
        - `RemoteMount` explicitly injects `auth={authClient}` into MFE.
        - **Interface**:
          ```typescript
          interface AuthClient {
            fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
            getToken: () => Promise<string | null>;
          }
          ```
    - **Action**: Update `RemoteMount.tsx` and MFE `mount.tsx`, `PageApp.tsx` (via props from wrapper) to accept `auth`.
- [ ] **Define Types**
    - Create TypeScript interfaces for Job and Table data models (based on `api.js` responses).
    - locations: `src/types/job.ts`, `src/types/table.ts`.

#### ✅ Phase 1 Verification
- [ ] **Unit Test**: API service methods successfully mock requests and return typed responses.
- [ ] **Integration Test**: `PageApp` (standalone) can fetch data using a dummy/mock AuthClient.
- [ ] **Check**: `fetchWithAuth` is correctly called for all endpoints.

### Phase 2: Component Migration (Pure UI)
- [ ] **Migrate JobDetailView Components** (`js/app/ui/jobDetailView.js`)
    - [ ] `JobOverview`: Status, Schedule (with proper formatting), Owner, lifecycle.
    - [ ] `JobRunHistory`: Run list table, pagination logic.
    - [ ] `JobRunTimeline`: (Port ECharts logic from `renderTimeline`).
    - [ ] `JobRunDrawer`: "Side-sheet" for specific run details.
    - [ ] `JobLineage`: Input/Output lists with "show more" logic.
- [ ] **Migrate TableDetailView Components** (`js/app/ui/tableDetailView.js`)
    - [ ] `TableOverview`: Description, Owner, Tags/Labels.
    - [ ] `TableStorage`: Partition info, clustering, storage stats.
    - [ ] `TableSchema`: Recursive rendering for nested records (`RECORD`/`STRUCT`).
    - [ ] `TableTimeliness`: Activity/Timelines chart (Port ECharts logic from `timelinesView.js`).

#### ✅ Phase 2 Verification
- [ ] **Storyboard/Test Page**: Render each component in isolation with static JSON data (mocking the API response).
- [ ] **Visual Check**: Compare MFE component rendering with Legacy UI screenshots to ensure high fidelity.
- [ ] **Responsiveness**: Check components adapt to narrow (Drawer) and wide (Page) containers.

### Phase 3: Logic Migration (Hooks)
- [ ] **Data Fetching Hooks** (Replacing `PanelController` orchestration)
    - [ ] `useJobOverview(jobId)`
    - [ ] `useJobRunHistory(jobId)`
    - [ ] `useTableOverview(tableName)`
    - [ ] `useTableSchema(tableName)`
    - [ ] `useTableTimeliness(tableName)`: Handle day selection and granular fetch logic.
- [ ] **Lineage Logic**
    - [ ] Port `LineageInsightProvider` logic if needed for summaries.
- [ ] **Trigger Manager**
    - [ ] Port `TriggerManager` logic to React for enabling/disabling triggers.

#### ✅ Phase 3 Verification
- [ ] **Hook Test**: Hooks return correct loading, error, and data states.
- [ ] **Integration**: Connect Phase 2 Components with Phase 3 Hooks in `JobDetailView`/`TableDetailView`.
- [ ] **Behavior Check**: Verify tab switching triggers correct data fetching (lazy loading).

### Phase 4: Visualizations & Legacy Viewers
- [ ] **Mermaid Integration**
    - [ ] Port `js/viewers/mermaid-table-viewer.js` to a React component (`MermaidGraph`).
    - [ ] Implement expansion logic (upstream/downstream) using React state.
    - [ ] Ensure click handlers propagate `selection` events correctly.

#### ✅ Phase 4 Verification
- [ ] **Interactive Check**: Graph renders correctly in both Embedded and Page modes.
- [ ] **Event Check**: Clicking a node in the MFE graph logs/triggers the specific selection event.

### Phase 5: Verification (End-to-End)
- [ ] **Drawer Mode Check**: ensuring SSO token is passed from Shell -> Drawer -> MFE and API calls succeed.
- [ ] **Page Mode Check**: accessing `/jobs/:id` directly loads the authenticated view.
- [ ] **Iframe Compatibility**: Verify no `window`/`document` global pollution.

````
