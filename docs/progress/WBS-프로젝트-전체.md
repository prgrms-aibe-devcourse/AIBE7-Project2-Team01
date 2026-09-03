# WBS: Knotty 프로젝트 전체 작업 분해

## 1. 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| 프로젝트명 | Knotty |
| 주제 | AI 기반 양방향 재능 거래 플랫폼 |
| 목표 | 재능 판매글과 요청글을 연결하고, 채팅 기반 거래와 AI 매칭을 제공한다. |
| MVP 핵심 흐름 | 회원가입/로그인 → 게시글 작성/탐색 → AI 매칭 → 채팅 → 거래 요청 → 결제/완료 |
| 제외 범위 | Review/Reputation, Bookmark |

## 2. 전체 일정 흐름

```text
기획
→ 요구사항 정리
→ DB/API 설계
→ 백엔드 핵심 도메인 구현
→ 프론트 화면 구현
→ 채팅/거래 연동
→ AI 생성/매칭 구현
→ 보안/동시성/성능 개선
→ 테스트/CI
→ 배포/발표 준비
```

## 3. 상위 WBS

| WBS ID | 작업 영역 | 주요 작업 | 산출물 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | 기획 | 서비스 주제 선정, 타겟 사용자 정의, MVP 범위 설정 | 기획서, 요구사항 명세서 | 완료 |
| 2 | 설계 | ERD, API, 상태 흐름, 거래 정책 설계 | ERD, API 명세서, ADR | 완료 |
| 3 | 개발 환경 | Spring Boot, Frontend, DB, Redis, Storage, AI 설정 | 실행 환경, `.env.example`, 설정 문서 | 완료 |
| 4 | 회원/인증 | 회원가입, 로그인, Google OAuth2, JWT Cookie, 로그아웃 | Auth API, Security 설정 | 완료 |
| 5 | 게시글 | 재능글, 요청글, 카테고리, 이미지, 썸네일, 상태 관리 | Talent/Request API, 화면 | 완료 |
| 6 | 포트폴리오 | 포트폴리오 CRUD, 파일 업로드, 재능글 연결 | Portfolio API, 화면 | 완료 |
| 7 | 채팅 | 채팅방 생성, 메시지 송수신, 이미지 메시지, 거래 버튼 메시지 | WebSocket/STOMP, Chat UI | 완료 |
| 8 | 거래/지갑 | 금액 제안, 결제, 정산, 취소, 지갑 내역, 상태 전이 | Trade/Wallet API, 거래 UI | 완료 |
| 9 | AI | AI 글 생성, 임베딩, Vector Search, SQL 검증, 추천 이유 | Spring AI 설정, AI API, AI Search UI | 완료 |
| 10 | 보안 | HttpOnly Cookie, SameSite, CSRF, CORS, XSS 방어 | 보안 코드, ADR, 테스트 | 완료 |
| 11 | 성능/정합성 | N+1 개선, 페이지네이션, 비관적 락, DB 제약 | Repository 개선, Migration, 트러블슈팅 | 완료 |
| 12 | 테스트/CI | 백엔드/프론트 테스트, GitHub Actions | 테스트 코드, CI workflow | 완료 |
| 13 | 배포 | Render 배포, Supabase, PostgreSQL, Redis 연결 | 배포 URL, 배포 가이드 | 완료 |
| 14 | 문서/발표 | README, 발표자료, 트러블슈팅, ADR 정리 | README, docs, 발표자료 | 완료 |

## 4. 상세 WBS

### 4.1 기획 및 요구사항

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 1.1 | 서비스 문제 정의 | 단방향 재능 거래의 한계와 양방향 거래 필요성 정리 | 기획서 |
| 1.2 | 타겟 사용자 정의 | 재능 제공자와 요청자를 모두 고려한 사용자 정의 | 기획서 |
| 1.3 | MVP 범위 설정 | 핵심 거래 흐름과 제외 기능 분리 | 요구사항 명세서 |
| 1.4 | 기능 우선순위 정리 | 상/중/하 또는 MVP/후속 범위 구분 | 요구사항 명세서 |

### 4.2 설계

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 2.1 | 도메인 모델 설계 | User, Talent, Request, Portfolio, Chat, Trade, Wallet 관계 정의 | ERD |
| 2.2 | 게시글 상태 설계 | 요청글 1회성, 재능글 상시 유지 규칙 반영 | 요구사항 명세서 |
| 2.3 | 거래 상태 전이 설계 | `PENDING`, `PAID`, `COMPLETED`, `CANCELLED` 흐름 정의 | ADR, 트러블슈팅 |
| 2.4 | API 계약 설계 | 인증, 게시글, 채팅, 거래, AI API 정리 | API 명세서 |
| 2.5 | AI 연동 계약 설계 | Document ID, metadata, text, Matching 흐름 정의 | AI 가이드, A-B 계약 |

### 4.3 백엔드 구현

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 3.1 | 공통 응답/예외 처리 | 일관된 API 응답과 ErrorCode 사용 | Common 모듈 |
| 3.2 | 인증 구현 | Local/Google 로그인과 JWT Cookie 발급 | Auth API |
| 3.3 | 회원 기능 구현 | 회원가입, 내 정보 조회/수정, 프로필 이미지 | User API |
| 3.4 | 재능글 구현 | CRUD, 상태, 상세정보, 대표 이미지 | Talent API |
| 3.5 | 요청글 구현 | CRUD, 상태 전이, 예산, 마감일, 대표 이미지 | Request API |
| 3.6 | 포트폴리오 구현 | CRUD, 파일, 썸네일, 재능글 연결 | Portfolio API |
| 3.7 | 채팅 구현 | 채팅방, 메시지, WebSocket/STOMP | Chat API |
| 3.8 | 거래/지갑 구현 | 거래 생성, 결제, 완료, 취소, 지갑 내역 | Trade/Wallet API |
| 3.9 | 파일 업로드 구현 | Supabase Storage 업로드와 URL 관리 | Storage API |
| 3.10 | AI 구현 | Gemini 글 생성, 임베딩, 매칭, 추천 이유 | AI API |

### 4.4 프론트엔드 구현

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 4.1 | SPA 라우팅 구성 | 주요 화면이 hash route로 이동 가능 | Router, App |
| 4.2 | 공통 API 모듈 | Cookie 인증, CSRF Header, API Proxy 대응 | `api.js` |
| 4.3 | 인증 화면 | 로그인, 회원가입, Google 로그인 화면 | Auth UI |
| 4.4 | 게시글 화면 | 재능글/요청글 목록, 작성, 상세, 수정, 비활성화/삭제 | Post UI |
| 4.5 | 카테고리 선택 | 이중 팝업 기반 카테고리 선택과 필터 | Category UI |
| 4.6 | 포트폴리오 화면 | 포트폴리오 목록, 작성, 상세 팝업 | Portfolio UI |
| 4.7 | 채팅 화면 | 메시지 내역 스크롤, 이미지, 거래 액션 버튼 | Chat UI |
| 4.8 | 거래/지갑 화면 | 결제 팝업, 거래 목록, 지갑 충전/내역 | Trade/Wallet UI |
| 4.9 | AI 매칭 화면 | 자연어 검색, 조건 자동 채움, 결과 카드 | AI Search UI |
| 4.10 | 마이페이지 | 내 정보, 포트폴리오, 지갑, 거래, 작성글 표시 | MyPage UI |

### 4.5 보안 및 정합성 개선

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 5.1 | HttpOnly Cookie 적용 | JS에서 Token 직접 접근 불가 | ADR-001 |
| 5.2 | SameSite/Secure 설정 | 로컬/운영 환경별 Cookie 정책 분리 | Security 설정 |
| 5.3 | CSRF 방어 | CSRF Cookie와 Header 검증 | Security 설정, 테스트 |
| 5.4 | XSS 방어 | DOMPurify와 안전한 Form 접근 방식 적용 | Frontend 보안 코드 |
| 5.5 | 거래 동시성 제어 | 거래, 지갑, 요청글에 비관적 락 적용 | Trade 코드 |
| 5.6 | DB 중복 방지 | 거래/지갑 내역 중복 제약 추가 | Migration |
| 5.7 | 상세 조회 개선 | `@EntityGraph`로 연관 Entity 조회 전략 분리 | Repository 개선 |

### 4.6 AI 기능

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 6.1 | Spring AI 설정 | Gemini와 pgvector 설정 완료 | `application-ai.yaml` |
| 6.2 | Document 계약 정의 | targetType, targetId, userId 등 metadata 확정 | A-B 계약 문서 |
| 6.3 | 임베딩 lifecycle | 생성/수정/삭제 시 VectorStore 동기화 | Embedding Service |
| 6.4 | AI 글 생성 | 입력 조건 기반 제목/본문 생성 | Generation API |
| 6.5 | AI 매칭 분석 | 자연어에서 targetType과 조건 추출 | Analyze API |
| 6.6 | Vector Search | TALENT/REQUEST 유사 후보 조회 | VectorSearchService |
| 6.7 | SQL 원본 검증 | 후보 UUID로 원본 Entity 조회 후 조건 검증 | Matching Service |
| 6.8 | Ranking | 서버 MatchScore 기준 TOP 후보 선정 | Ranking Service |
| 6.9 | 추천 이유 생성 | 최종 후보에 대해서만 Gemini 추천 이유 생성 | Reason Service |

### 4.7 테스트, CI/CD, 배포

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 7.1 | 백엔드 테스트 | 핵심 Service와 ApplicationContext 테스트 통과 | Backend test |
| 7.2 | 프론트 테스트 | XSS, CSRF, 화면 로직 테스트 통과 | Frontend test |
| 7.3 | GitHub Actions | PR/Push 시 테스트 자동 실행 | CI workflow |
| 7.4 | Render 배포 | Frontend/Backend 배포 성공 | 배포 URL |
| 7.5 | 운영 환경변수 정리 | DB, Redis, OAuth, Storage, AI Key 설정 목록 정리 | 배포 가이드 |
| 7.6 | 배포 후 검증 | 로그인, 게시글, AI 검색, 채팅, 거래 흐름 확인 | 점검 기록 |

### 4.8 문서 및 발표

| ID | 작업 | 완료 기준 | 산출물 |
| --- | --- | --- | --- |
| 8.1 | README 작성 | 프로젝트 소개, 스크린샷, 기술스택, 문서 링크 정리 | README |
| 8.2 | API/ERD 최신화 | 현재 코드 기준 문서 반영 | API 명세서, ERD |
| 8.3 | ADR 작성 | 인증, AI 매칭, 리뷰 제외 등 의사결정 기록 | ADR |
| 8.4 | 트러블슈팅 작성 | 주요 문제를 STAR 방식으로 정리 | Troubleshooting |
| 8.5 | 발표자료 작성 | 핵심 기능, 아키텍처, 보안, AI, 거래 정합성 설명 | Presentation |
| 8.6 | 시연 준비 | 회원가입, 글 작성, AI 매칭, 채팅 거래 시나리오 준비 | Demo |


## 5. 마일스톤

| 마일스톤 | 완료 기준 |
| --- | --- |
| M1. 기획 확정 | 주제, MVP 범위, 핵심 사용자 흐름 확정 |
| M2. 기본 CRUD 완성 | 회원, 재능글, 요청글, 포트폴리오 API와 화면 구현 |
| M3. 거래 흐름 완성 | 채팅에서 거래 요청, 결제, 완료, 취소 흐름 구현 |
| M4. AI 기능 완성 | 글 생성, 임베딩, 매칭, 추천 이유 연동 |
| M5. 안정화 | XSS/CSRF/Cookie 보안, 동시성 제어, N+1 개선 |
| M6. 배포/발표 | Render 배포, README/docs 정리, 발표자료와 시연 준비 |

## 6. 주요 리스크와 대응

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 거래 중복 결제 | 금전 정합성 문제 | 비관적 락과 DB 제약 적용 |
| Cookie 인증과 CSRF 충돌 | 로그인/작성 실패 | SameSite, Secure, CSRF Header 정책 분리 |
| XSS 방어 후 폼 필드 누락 | 글 작성 실패 | `postTitle`과 `data-*` 선택자 기반 접근 |
| AI API 장애 | 글 생성/매칭 실패 | 원본 CRUD와 임베딩을 분리하고 추천 이유 실패 시 후보 유지 |
| Vector 후보 누락 | 검색 품질 저하 | MVP 이후 metadata 선필터와 SQL 선필터 개선 |
| Review/Reputation 일정 부족 | 기능 미완성 위험 | MVP 제외 후 ADR로 근거 기록 |

## 7. 완료 기준

- 사용자가 회원가입/로그인 후 게시글을 작성할 수 있다.
- 재능글과 요청글 목록, 상세, 수정, 비활성화/삭제 흐름이 동작한다.
- 게시글 대표 이미지와 포트폴리오 연결이 화면에 반영된다.
- AI 글 생성과 AI 매칭 검색을 사용할 수 있다.
- 채팅에서 거래 요청, 결제, 완료 메시지 흐름이 동작한다.
- 거래와 지갑 정산에서 동시성 문제가 발생하지 않도록 잠금과 제약이 적용된다.
- XSS, CSRF, HttpOnly Cookie 보안 정책이 적용된다.
- Render 배포 환경에서 핵심 사용자 흐름을 시연할 수 있다.
- README, API 명세, ERD, ADR, 트러블슈팅 문서가 최신 상태로 정리된다.
