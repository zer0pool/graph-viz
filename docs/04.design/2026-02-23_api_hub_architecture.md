---
status: draft
owner: David
created: 2026-02-23
updated: 2026-02-23
version: 1.0
tags: [architecture, api-hub, msa, swagger, documentation]
---

# API Hub: Unified Documentation Architecture

## 1. Overview
**API Hub**는 분산된 마이크로서비스(MSA) 환경에서 각 서비스마다 흩어져 있는 API 문서를 하나의 인터페이스(Single Pane of Glass)에서 집계하여 제공하는 기능입니다. 

개발자는 서비스 URL을 일일이 기억할 필요 없이, 공통 진입점을 통해 전체 시스템의 API 규격을 탐색하고 테스트할 수 있습니다.

---

## 2. System Architecture

아래 다이어그램은 API Hub가 요청을 처리하고 각 서비스의 스펙을 로드하는 구조를 보여줍니다.

```mermaid
graph TD
    User([Developer / Browser]) -->|Access /admin-console/docs| Proxy[Nginx / API Gateway]
    
    subgraph Frontend Container
        Proxy -->|Serve Static HTML| HubPage[API Hub HTML / Swagger UI]
    </div>

    subgraph Backend Services
        HubPage -->|Fetch openapi.json| LM[Lineage-Manager-V2]
        HubPage -->|Fetch openapi.json| MM[analytics-manager]
    </div>

    LM --- DB1[(MySQL)]
    MM --- DB2[(Redis / BigQuery)]
```

### Key Components
1. **API Gateway (Nginx)**: 모든 외부 요청을 통합 관리하며, `/admin-console/docs` 경로를 API Hub 정적 페이지로 매핑합니다.
2. **Aggregator UI (Swagger UI)**: 브라우저 상에서 동작하며, 사용자의 선택에 따라 각 백엔드 서비스의 `openapi.json` 스펙 파일을 동적으로 로드합니다.
3. **Backend Service Layer**: 자신의 비즈니스 로직에 따른 OpenAPI Specification을 표준 JSON 형식으로 외부에 노출합니다.

---

## 3. Technical Mechanism

### 3.1 OpenAPI Specification Aggregation
API Hub는 직접 API를 호출하여 데이터를 모으는 방식이 아니라, **"스펙 파일의 경로"**를 모으는 방식입니다.
- 각 FastAPI 서비스는 `/api/v1/openapi.json` 경로를 통해 자신의 규격을 제공합니다.
- API Hub 상단의 드롭다운 메뉴는 이 URL들을 리스트로 가지고 있다가, 선택 시 해당 파일을 다시 읽어 UI를 갱신합니다.

### 3.2 URL Swap Logic
`SwaggerUIBundle`의 내부 `specActions` API를 사용하여 전체 페이지를 리로드하지 않고도 스펙을 전환합니다.
```javascript
function loadSpec(url) {
  if (ui) {
    // 기존 UI 인스턴스의 스펙 URL만 교체 및 재다운로드
    ui.specActions.updateUrl(url);
    ui.specActions.download(url);
  } else {
    // 최초 초기화
    ui = SwaggerUIBundle({ ...config, url });
  }
}
```

### 3.3 Proxy Base Path Challenge (root_path)
MSA 환경에서는 리버스 프록시를 통해 서비스가 노출되므로, 내부 경로와 외부 노출 경로가 다를 수 있습니다.
- **Problem**: Swagger UI가 API를 테스트할 때 프리픽스 없이 `/api/v1/...`으로 요청을 보내 404가 발생.
- **Solution**: FastAPI 초기화 시 `root_path="/admin-console"`을 명시하여, Swagger UI가 생성하는 모든 URL에 프록시 프리픽스가 자동으로 붙도록 설정합니다.

---

## 4. Operational Benefits

1. **Discovery**: 새로운 팀원이 합류했을 때 모든 백엔드 포트를 알 필요 없이 `/docs` 하나만으로 전체 시스템 파악 가능.
2. **Consistency**: 서로 다른 기술 스택으로 개발되더라도 OpenAPI 표준을 지킨다면 하나의 허브에 통합 가능.
3. **Efficiency**: 개발 모드(Local)와 배포 모드(Container) 환경에서 동일한 URL 구조로 API 테스트 가능.

## 5. Future Roadmap
- **Auth Integration**: API Hub 상단에서 공통 토큰을 입력하면 모든 서비스에 일괄 적용되는 시큐리티 기능.
- **Search & Discovery**: 엔드포인트 이름이나 모델명으로 전체 마이크로서비스를 검색하는 기능 확장.
