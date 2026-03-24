# Lineage MFE 그래프 시각화 개선 및 리팩토링 계획 (2026-01-21)

이 문서는 Lineage Manager의 그래프 시각화 품질 개선과 코드 리팩토링 작업에 대한 기록입니다.

---

## 완료된 작업

### 1. 그래프 시각화 개선

#### 1.1 중복 Placeholder 버그 수정

**문제**: 노드 확장 시 "... X more"와 "... Y more" 플레이스홀더가 동시에 표시되는 문제
**해결**:

- `useGraphData.ts`의 `mergeGraphData` 로직에서 `placeholder` 타입 노드를 필터링하여 상태에 저장되지 않도록 수정
- 확장 시 기존 그룹 노드를 제거하고 새로운 그룹 노드로 대체

#### 1.2 초기 로드 시 노드 폴딩 적용

**문제**: 처음 그래프를 조회할 때 연결된 노드가 많아도 모두 표시되어 그래프가 복잡해지는 문제
**해결**:

- `applyProgressiveLoading` 함수를 생성하여 초기 로드와 확장 시 동일한 폴딩 로직 적용
- upstream/downstream 각 방향별로 독립적으로 limit(3개) 체크하여 폴딩 여부 결정
- 3개 초과 시 "... X more" 그룹 노드 자동 생성

#### 1.3 테이블 이름 Truncation 및 Tooltip

**문제**: 긴 테이블 이름이 노드 경계를 넘어 표시되어 가독성 저하
**해결**:

- `mermaidDslService.ts`의 `getShortenedName` 함수에 25자 제한 추가
- Mermaid DSL에 `tooltip` 속성 추가하여 전체 이름 표시
- `lineage.css`에 `.mermaidTooltip` 스타일 추가 (다크 배경, 높은 z-index)

### 2. 코드 리팩토링

#### 2.1 중복 코드 제거

**문제**: 초기 로드와 확장 시 동일한 폴딩 로직이 중복 구현됨 (약 130줄)
**해결**:

- `applyProgressiveLoading` 헬퍼 함수 추출
- `createGroupNode` 함수 분리
- 중복 코드 제거로 유지보수성 향상

#### 2.2 유틸리티 파일 분리

**문제**: 그래프 폴딩 로직이 `useGraphData` 훅 내부에 강하게 결합됨
**해결**:

- 새 파일 생성: `utils/GraphFoldingUtils.ts`
- 순수 함수로 분리하여 테스트 가능성 향상
- 관심사 분리 (Separation of Concerns) 달성

**파일 구조**:

```
utils/
├── ExportUtils.ts           # 그래프 내보내기
├── LineageTreeUtils.ts      # 리스트 뷰 트리 구조
└── GraphFoldingUtils.ts     # 그래프 폴딩 로직 (신규)
```

---

## 향후 계획

### Phase 1: 타입 시스템 강화 (1-2일)

- `GraphNode`의 `[key: string]: any` 제거
- 명확한 도메인 모델 정의 (`JobNode`, `TableNode`, `GroupNode`)
- API 응답 타입 정의

### Phase 2: 상태 관리 리팩토링 (2-3일)

- Context API 도입으로 전역 상태 관리
- 거대한 훅 분리:
  - `useGraphData` (313줄) → `useGraphState`, `useGraphApi`, `useGraphFolding`
  - `useMermaidRenderer` (294줄) → 렌더링/이벤트/D3 로직 분리

### Phase 3: 비즈니스 로직 분리 (2-3일)

- 도메인 서비스 생성 (`domain/GraphDomain.ts`, `domain/NodeDomain.ts`)
- 이벤트 핸들러 추상화
- UI 로직과 비즈니스 로직 분리

### Phase 4: 컴포넌트 최적화 (1-2일)

- `App.tsx` (281줄) 분해 → 50줄 목표
- Memoization 적용 (`React.memo`)
- 불필요한 리렌더링 방지

### Phase 5: 유틸리티 정리 (1일)

- 카테고리별 디렉토리 구조 개선
- `utils/graph/`, `utils/export/`, `utils/tree/`

### Phase 6: Unit Test 인프라 구축 (3.5일)

- **목표**: 90% 이상 코드 커버리지
- **프레임워크**: Vitest + React Testing Library
- **우선순위**:
  1. Utils 테스트 (95%+ 목표) - 순수 함수
  2. Services 테스트 (90%+ 목표) - API 호출
  3. Hooks 테스트 (85%+ 목표) - 상태 관리
  4. Components 테스트 (80%+ 목표) - UI

**테스트 구조**:

```
src/
├── test/
│   ├── setup.ts
│   ├── utils/renderWithProviders.tsx
│   └── mocks/graphData.ts
├── utils/__tests__/
├── services/__tests__/
├── hooks/__tests__/
└── components/__tests__/
```

---

## 기술적 개선 사항

### 즉시 적용 가능한 Quick Wins

1. **타입 안정성**: `any` → `Record<string, unknown>`
2. **상수 추출**: 매직 넘버를 `constants/graph.ts`로
3. **에러 핸들링**: 커스텀 에러 클래스 (`GraphApiError`)

### 장기 개선 사항

1. **성능 최적화**
   - Virtual scrolling for large graphs
   - Web Worker for heavy computations
   - Lazy loading for components

2. **접근성 개선**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

3. **개발자 경험**
   - Storybook 도입
   - ESLint/Prettier 강화
   - CI/CD 파이프라인 개선

---

## 예상 일정

| Phase | 작업               | 예상 시간 |
| ----- | ------------------ | --------- |
| 1     | 타입 시스템 강화   | 1-2일     |
| 2     | 상태 관리 리팩토링 | 2-3일     |
| 3     | 비즈니스 로직 분리 | 2-3일     |
| 4     | 컴포넌트 최적화    | 1-2일     |
| 5     | 유틸리티 정리      | 1일       |
| 6     | Unit Test 인프라   | 3.5일     |

**총 예상 시간**: 약 2-3주

---

## 참고 문서

- 상세 리팩토링 계획: `brain/refactoring_plan.md`
- 작업 완료 내역: `brain/walkthrough.md`
- 작업 체크리스트: `brain/task.md`
