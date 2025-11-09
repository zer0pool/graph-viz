04. 그래프 확장기능﻿
 

1) 사용자 시나리오 & UX

사용자는 현재 렌더링된 서브그래프에서 노드(작업/테이블) 하나를 클릭.

노드에 더 확장 가능한 이웃이 존재하면, 우클릭 컨텍스트 메뉴에 그래프 확장 버튼 노출.

옵션:

방향: Upstream, Downstream, Both

깊이(depth): 1(기본) 혹은 2~3

한도(limit): 엣지/노드 최대 로드 수 (예: 100)

필터: job_status, project/dataset, edge.is_active, trigger_on_only 등

버튼 클릭 시:

노드를 중심으로 이웃 질의(Neo4j 또는 ClosureTable/SQL) 실행

결과를 현재 그래프에 머지(merge)

새로 들어온 노드/엣지에 확장 애니메이션 적용

노드: 중심 노드에서 바깥쪽으로 스프링 아웃(Neo4j Browser 유사)

엣지: 페이드인 → 0.3s 동안 thickness up → 정규 두께로 안정화

레이아웃: 전체 재정렬 대신 부분 레이아웃(선택 노드 주변만 force/cola)

UI 피드백:

확장 중 인디케이터(노드 테두리 회전/펄싱)

툴팁: “+23 nodes, +41 edges 추가됨 (0.24s)”

중복 노드/엣지는 하이라이트만(깜빡임) 하고 재생성하지 않음

접근성:

키보드 단축키: E (Expand from selected), Shift+E(옵션 팝오버 열기)

취소/롤백:

상단 토스트에 “확장 취소(undo)” 6초 제공 → 마지막 증분만 제거


5) 클라이언트 병합 로직 (Cytoscape 예)

요청 직전

선택 노드에 loading 스타일(테두리 펄스) 적용

응답 수신

added.nodes 중 미보유 ID만 cy.add()

added.edges도 동일

애니메이션

새 노드만 position: selectedNode.position() + jitter로 임시 배치 → 300ms spring spread

새 엣지 opacity:0 → 1, width 1.5x → 1.0x ease-out

부분 레이아웃

eles = cy.collection(addedNodes).closedNeighborhood()

eles.layout({ name:'fcose', animate:true, fit:false, randomize:true, idealEdgeLength: … })

집계/토스트

+N nodes, +M edges 표시, undo 버튼


10) QA 체크리스트

 중복 노드/엣지 머지 정확성

 방향/깊이/필터 조합별 정합성(Neo4j vs SQL 결과 동일성 샘플 테스트)

 권한 필터 후 카운트/통계 정확

 대규모 확장 시 FPS 유지(부분 레이아웃/배치 최적화)

 Undo/Redo 동작(증분 단위 롤백)

 API 타임아웃/리밋/커서 정상 동작

원하시면 위 스펙대로 컨텍스트 메뉴 컴포넌트, Cytoscape 확장 애니메이션 코드,
