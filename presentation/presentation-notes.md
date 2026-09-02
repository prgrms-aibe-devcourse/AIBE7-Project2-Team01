# Knotty 발표자 노트

## 발표 기준

- 예상 발표 시간: 10~15분
- 발표 방향: 기능 나열보다 문제 발견과 기술적 해결 과정 중심
- 주의: 구현되지 않은 Review/Reputation, AI rate limit, 임베딩 재처리 관리자 기능은 완료 기능처럼 말하지 않는다.
- 근거 기준: 현재 코드, README/docs, git commit, GitHub PR 기록

## Slide 01. 프로젝트 소개

- 예상 시간: 40초
- 말할 내용: Knotty는 재능을 판매하는 사람과 일을 요청하는 사람을 연결하는 양방향 재능 거래 플랫폼이다. 단순 게시판이 아니라 게시글 탐색, AI 매칭, 채팅, 거래, 지갑 결제까지 MVP 흐름을 연결했다.
- 연결 문장: 이 서비스를 만들면서 가장 먼저 마주한 문제는 “글을 올리는 것”보다 “맞는 사람을 찾고 안전하게 거래를 끝내는 것”이었다.
- 예상 질문: 왜 TalentPulse가 아니라 Knotty인가?
- 답변: README의 초기 프로젝트명은 TalentPulse로 남아 있고, 최근 프론트 브랜딩은 Knotty 로고와 문구로 변경되었다. 발표에서는 현재 서비스 브랜딩인 Knotty를 사용한다.
- Evidence:
  - `README.md`
  - `frontend/assets/knotty-logo.png`

## Slide 02. 문제 정의

- 예상 시간: 1분
- 말할 내용: 재능 거래에서 문제는 세 가지였다. 첫째, 사용자가 다른 표현으로 검색하면 SQL 키워드만으로는 적절한 후보를 찾기 어렵다. 둘째, 채팅과 거래가 분리되어 있으면 실제 결제로 이어지는 흐름이 끊긴다. 셋째, 금전 거래에서는 중복 결제와 상태 충돌이 생길 수 있다.
- 연결 문장: 그래서 해결 방향도 검색, 채팅, 거래를 하나의 사용자 흐름으로 묶는 쪽으로 잡았다.
- 예상 질문: 문제를 실제로 겪었나?
- 답변: AI 매칭 ADR에는 SQL 검색만으로 표현 차이를 처리하기 어렵고, Vector 결과만 쓰면 종료/삭제된 글이 추천될 수 있다는 문제가 기록되어 있다. 거래 트러블슈팅에는 동시 결제 가능성이 명시되어 있다.
- Evidence:
  - `docs/adr/ADR-002-하이브리드-AI-매칭-아키텍처.md`
  - `docs/troubleshooting/거래-정합성-및-임베딩-AFTER-COMMIT.md`

## Slide 03. Solution / 핵심 가치

- 예상 시간: 50초
- 말할 내용: 사용자는 게시글을 작성하고, 다른 사용자는 AI 매칭이나 목록 검색으로 글을 찾는다. 이후 채팅에서 거래 요청 버튼을 주고받고, 지갑 결제로 거래를 완료한다. MVP는 이 흐름이 끊기지 않도록 구현하는 데 집중했다.
- 연결 문장: 이 흐름은 재능글과 요청글에서 거래 규칙이 다르기 때문에 사용자 Flow를 먼저 정리해야 했다.
- 예상 질문: 일반 검색과 AI 검색은 둘 다 있나?
- 답변: 일반 목록/키워드/카테고리 검색이 있고, AI 매칭은 `/ai/matches/analyze`, `/ai/matches`를 호출하는 별도 검색 흐름이 있다.
- Evidence:
  - `frontend/src/features/search/AiSearchPage.js`
  - `frontend/src/features/search/matchingApi.js`
  - `backend/src/main/java/org/example/link/ai/matching/controller/AiMatchingController.java`

## Slide 04. 사용자 Flow

- 예상 시간: 1분
- 말할 내용: 재능글은 판매자가 금액을 정하고 구매자가 결제한다. 거래 완료 후에도 글은 ACTIVE 상태로 유지될 수 있다. 요청글은 글 작성자가 일을 요청하는 1회성 글이다. 전문가가 금액을 제안하고 요청자가 결제하면 요청글은 진행 후 마감된다.
- 연결 문장: 이 차이를 코드에서 놓치면 같은 요청글이 여러 거래에 잡히거나 완료된 요청글이 계속 검색되는 문제가 생긴다.
- 예상 질문: 요청글은 결제 시점과 완료 시점이 어떻게 다른가?
- 답변: 현재 코드에서는 요청글 거래 요청 생성 시 `OPEN -> IN_PROGRESS`로 선점하고, 결제 완료 흐름에서 거래를 완료하며 요청글을 `CLOSED`로 전환한다.
- Evidence:
  - `backend/src/main/java/org/example/link/domain/request/entity/RequestPostEntity.java`
  - `backend/src/main/java/org/example/link/domain/trade/service/TradeService.java`
  - PR #86 `fix: trade 로직, password 제한`

## Slide 05. 시스템 Architecture

- 예상 시간: 1분
- 말할 내용: 프론트는 Express 정적 서버이자 `/api` 프록시로 동작한다. 백엔드는 Spring Boot이고 PostgreSQL, pgvector, Redis, Supabase Storage, Gemini API와 연결된다. pgvector는 PostgreSQL 안에서 Spring AI VectorStore로 사용한다.
- 연결 문장: 시스템 구성을 봤으니, 다음은 실제 데이터가 어떻게 연결되는지 보겠다.
- 예상 질문: 프론트가 왜 API를 직접 부르지 않고 프록시를 쓰나?
- 답변: 배포 환경에서 같은 origin의 `/api` 경로로 호출하면 쿠키/CSRF/CSP/CORS 관리가 단순해진다. 실제 `frontend/server.js`에 proxy와 runtime config가 있다.
- Evidence:
  - `frontend/server.js`
  - `backend/src/main/resources/application-ai.yaml`
  - `backend/src/main/resources/application-auth.yaml`
  - `backend/build.gradle`

## Slide 06. ERD

- 예상 시간: 1분
- 말할 내용: 핵심 데이터는 사용자, 게시글, 채팅, 거래 네 영역으로 묶인다. 사용자는 지갑과 포트폴리오를 갖고, Talent/Request 게시글을 작성한다. 채팅방은 게시글을 주제로 열리고, 거래는 채팅방과 게시글을 기준으로 생성된다. 지갑 거래내역은 거래와 연결된다. VectorStore는 별도 도메인 원본이 아니라 AI 검색용 복제 데이터이며 `targetId`로 원본 게시글을 다시 찾는다.
- 연결 문장: 이 ERD에서 특히 요청글 상태와 거래 상태가 중요했기 때문에, 백엔드에서는 상태 전이를 명시적으로 관리했다.
- 예상 질문: ERD에서 Review/Reputation은 왜 없나?
- 답변: MVP 범위 조정으로 제외했기 때문이다. ADR-003과 트러블슈팅 문서에 결정 이유가 남아 있다.
- 예상 질문: ChatRoom과 Trade의 게시글/사용자 관계가 모두 물리 FK인가?
- 답변: 아니다. ERD 문서에 따르면 ChatRoom과 TradeEntity 일부 게시글·사용자 ID는 JPA 연관 객체가 아니라 UUID 값으로 관리된다. 발표에서는 도메인상 논리 관계로 설명한다.
- Evidence:
  - `docs/erd.md`
  - `docs/schema.sql`
  - `docs/adr/ADR-003-리뷰-평판-MVP-제외.md`

## Slide 07. 핵심 Backend 설계

- 예상 시간: 1분
- 말할 내용: 요청글은 `OPEN`, `IN_PROGRESS`, `CLOSED`, `CANCELLED` 상태를 가진다. 상태 변경 메서드를 엔티티에 두어 잘못된 상태 전이를 막았다. 재능글은 거래가 끝나도 `ACTIVE`를 유지한다.
- 연결 문장: 이 상태 전이는 다음 슬라이드의 AI 매칭과도 연결된다. 검색 가능한 글과 거래 중인 글을 구분해야 하기 때문이다.
- 예상 질문: 상태 전이를 서비스가 아니라 엔티티에 둔 이유는?
- 답변: 요청글의 유효한 상태 변경 규칙을 한 곳에 모아, 수정/마감/거래 시작/완료/복구에서 같은 검증을 재사용하기 위해서다.
- Evidence:
  - `backend/src/main/java/org/example/link/domain/request/entity/RequestPostEntity.java`
  - `docs/troubleshooting/거래-정합성-및-임베딩-AFTER-COMMIT.md`

## Slide 08. AI Matching

- 예상 시간: 1분 40초
- 말할 내용: AI 매칭은 세 책임으로 나뉜다. LLM이 검색 문장을 분석해 targetType과 조건을 채운다. VectorStore는 의미적으로 가까운 후보를 찾는다. 이후 SQL 원본 데이터를 다시 조회해서 상태, 카테고리, 가격, 예산, 기간, 마감일을 검증한다. 최종 순위는 Java 코드의 MatchScore가 결정하고 Gemini는 추천 이유만 생성한다.
- 연결 문장: 여기서 중요한 의사결정은 AI에게 전부 맡기지 않고, 정확성이 필요한 부분은 서버 코드와 DB가 책임지게 한 것이다.
- 예상 질문: RAG인가?
- 답변: 넓게 보면 검색 결과를 원본 데이터로 보강해 답변하는 RAG 성격이 있다. 하지만 범용 RAG Advisor에 위임하지 않고 매칭 서비스가 검색, 원본 검증, Ranking 순서를 명시적으로 제어한다.
- 예상 질문: Portfolio도 검색 대상인가?
- 답변: 현재 B Matching 대상은 TALENT와 REQUEST만이다. Portfolio embedding은 다른 AI 기능에서 사용할 수 있으나 매칭 Ranking에는 직접 쓰지 않는다.
- Evidence:
  - `backend/src/main/java/org/example/link/ai/matching/service/AiMatchingService.java`
  - `backend/src/main/java/org/example/link/ai/matching/service/search/VectorSearchService.java`
  - `backend/src/main/java/org/example/link/ai/matching/service/filter/MatchCandidateFilter.java`
  - `backend/src/main/java/org/example/link/ai/matching/service/ranking/MatchRankingService.java`
  - `backend/src/main/java/org/example/link/ai/matching/service/recommendation/RecommendationReasonService.java`
  - PR #72 `feat: AI 매칭 검색 및 추천 결과 구현`
  - commit `51d8b82 feat: 매칭 이후 LLM 추천 이유 생성 기능 추가`

## Slide 09. Security

- 예상 시간: 1분 30초
- 말할 내용: 초기에는 브라우저에서 토큰을 직접 다루는 방식이었지만, 웹 서비스 특성상 JavaScript가 토큰을 읽을 필요가 낮다고 보고 HttpOnly Cookie로 전환했다. 대신 Cookie 인증은 CSRF 위험이 있으므로 CSRF Token, SameSite, Secure, CORS 제한을 함께 적용했다. 프론트 출력은 DOMPurify와 safe helper로 XSS를 방어하고 서버에는 CSP를 적용했다.
- 연결 문장: 보안도 중요했지만, 금전 거래에서는 데이터 정합성이 더 직접적인 장애로 이어질 수 있었다.
- 예상 질문: CSRF 토큰 쿠키가 HttpOnly false인 이유는?
- 답변: CSRF 토큰은 프론트가 읽어 `X-XSRF-TOKEN` 헤더로 다시 보내야 한다. 인증 토큰은 HttpOnly이고, CSRF 토큰은 검증용 값이므로 JavaScript 접근이 필요하다.
- Evidence:
  - `backend/src/main/java/org/example/link/auth/cookie/CookieUtil.java`
  - `backend/src/main/java/org/example/link/auth/config/SecurityConfig.java`
  - `backend/src/main/java/org/example/link/auth/config/CorsConfig.java`
  - `frontend/src/shared/security/xss.js`
  - `frontend/server.js`
  - PR #64, commit `528aa22`
  - PR #65, commit `12308dc`
  - `docs/adr/ADR-001-HttpOnly-쿠키-JWT-인증.md`

## Slide 10. Transaction / 동시성

- 예상 시간: 1분 30초
- 말할 내용: `@Transactional`은 실패 시 롤백을 보장하지만, 동시에 들어온 요청이 같은 상태와 잔액을 읽는 문제까지 막지는 못한다. 그래서 거래, 지갑, 요청글 조회에 `PESSIMISTIC_WRITE`를 적용했다. 추가로 DB unique index와 check constraint로 애플리케이션 검증을 우회하는 중복도 막는다.
- 연결 문장: 이처럼 실제 장애 가능성을 코드와 DB 제약으로 줄이는 작업은 성능 개선에서도 이어졌다.
- 예상 질문: 낙관적 락 대신 비관적 락을 선택한 이유는?
- 답변: 거래/지갑은 충돌이 났을 때 재시도보다 정확한 순차 처리가 중요하다. 금액 차감과 정산은 보수적으로 비관적 락을 우선 적용하는 것이 더 적절하다고 판단했다.
- Evidence:
  - `backend/src/main/java/org/example/link/domain/trade/repository/TradeRepository.java`
  - `backend/src/main/java/org/example/link/domain/wallet/repository/WalletRepository.java`
  - `backend/src/main/java/org/example/link/domain/request/repository/RequestPostRepository.java`
  - `docs/migrations/20260831_trade_integrity_constraints.sql`
  - `docs/troubleshooting/거래-정합성-및-임베딩-AFTER-COMMIT.md`

## Slide 11. Performance

- 예상 시간: 1분 10초
- 말할 내용: 게시글 목록은 전체 조회에서 Page 기반으로 변경하고, DTO 변환에 필요한 연관관계를 EntityGraph로 미리 로딩했다. 채팅방 목록은 코드리뷰에서 지적된 게시글 제목 개별 조회뿐 아니라 LAZY 연관 조회까지 같이 제거했다.
- 연결 문장: 이 개선은 CI에서 회귀 테스트를 돌릴 수 있도록 연결했다.
- 예상 질문: 성능 수치는 측정했나?
- 답변: 채팅방 목록은 PR #74에 방 N개 기준 쿼리 수가 `1 + 3N -> 고정 4개`로 기록되어 있다. 응답 시간, 처리량 같은 수치는 아직 측정 필요다.
- Evidence:
  - `backend/src/main/java/org/example/link/domain/chat/service/ChatService.java`
  - `backend/src/main/java/org/example/link/domain/chat/repository/ChatParticipantRepository.java`
  - `backend/src/main/java/org/example/link/domain/talent/repository/TalentPostRepository.java`
  - `backend/src/main/java/org/example/link/domain/request/repository/RequestPostRepository.java`
  - PR #73, commits `fd5be76`, `2502db6`
  - PR #74, commit `665617e`
  - `docs/troubleshooting/chatroom-list-nplus1.md`

## Slide 12. CI / CD

- 예상 시간: 50초
- 말할 내용: GitHub Actions에서 backend와 frontend 테스트를 분리해 실행한다. Backend job은 PostgreSQL pgvector 이미지를 service로 띄우고 extension을 활성화한 뒤 Gradle test를 돌린다. Frontend job은 Node 24에서 npm test를 실행한다. 배포는 Render 환경을 기준으로 프론트 URL이 생성되어 있고, 프론트 서버는 `/api` proxy와 runtime config를 제공한다.
- 연결 문장: 마지막으로, 일정 안에서 모든 기능을 넣는 대신 무엇을 뺄지 결정한 경험을 정리하겠다.
- 예상 질문: CI에 실제 API Key를 넣었나?
- 답변: 넣지 않았다. CI에는 dummy 값이 들어가 있고 실제 비밀값은 GitHub Secrets나 Render 환경변수에서 관리해야 한다.
- Evidence:
  - `.github/workflows/ci.yml`
  - PR #93, commits `9e811e7`, `4c0bf3a`
  - PR #96 `chore: deploy`

## Slide 13. Troubleshooting / Scope

- 예상 시간: 1분
- 말할 내용: 원래 Review/Reputation을 매칭에 반영하려 했지만, 남은 기간에 거래 흐름, 보안, 성능, 프론트 연동, 발표 준비까지 모두 완성해야 했다. 그래서 리뷰 기능은 MVP에서 제외하고, AI 매칭은 semantic score와 금액 조건 중심으로 단순화했다. 이 결정은 ADR과 트러블슈팅 문서로 남겼다.
- 연결 문장: 그래서 시연도 모든 기능이 아니라 핵심 MVP 흐름이 실제로 연결되는지를 보여주는 방식으로 준비한다.
- 예상 질문: 리뷰를 제외하면 추천 품질이 낮아지지 않나?
- 답변: 맞다. 그래서 ADR에 부정적 영향으로 기록했다. 다만 리뷰 데이터가 충분하지 않은 상태에서 평판 점수를 넣으면 오히려 검증되지 않은 점수가 된다. MVP 이후 리뷰 데이터가 쌓였을 때 재도입하는 것이 낫다고 판단했다.
- Evidence:
  - `docs/adr/ADR-003-리뷰-평판-MVP-제외.md`
  - `docs/troubleshooting/MVP-리뷰-기능-범위-조정.md`
  - PR #72, commit `41a8c89`

## Slide 14. Demo

- 예상 시간: 2~3분
- 말할 내용: 시연은 AI 검색에서 시작한다. 검색어를 입력하면 targetType과 조건이 분석되고, 후보를 선택해 상세로 이동한다. 이후 채팅방을 만들고 거래 요청 버튼을 통해 금액 제안, 결제, 거래 완료까지 보여준다.
- 연결 문장: 라이브 데모가 실패할 수 있으므로 주요 화면 캡처나 녹화본을 준비해 둔다.
- 예상 질문: 데모 실패 시 무엇을 보여줄 것인가?
- 답변: `presentation/assets/screenshots/`에 AI 검색 결과, 게시글 상세, 채팅 거래 버튼, 결제 완료 화면 캡처를 넣어 대체 시연 자료로 사용한다.
- Evidence:
  - `frontend/src/features/search/AiSearchPage.js`
  - `frontend/src/features/chat/ChatPage.js`
  - `frontend/src/features/payment/CheckoutPage.js`

## Slide 15. Q&A

- 예상 시간: 남은 시간
- 말할 내용: 구현 완료 범위와 후속 과제를 분리해서 답변한다. AI rate limit, 임베딩 복구, Review/Reputation은 후속 과제다. 보안, 거래 정합성, AI 매칭, CI는 현재 코드와 PR 근거가 있다.
- 예상 질문: 지금 가장 먼저 보완할 점은?
- 답변: 공개 AI API rate limit, 임베딩 재처리 관리자 기능, 운영 배포 환경에서 OAuth/Cookie/CORS 최종 검증이다.
- Evidence:
  - `README.md`의 현재 후속 과제
  - `docs/requirements.md`

## 발표 가치 등급 요약

| 등급 | 소재 | 이유 |
| --- | --- | --- |
| S | 거래 정합성/동시성 | 금전 도메인, 실제 장애 가능성, 락과 DB 제약 근거가 있음 |
| S | AI Hybrid Matching | 서비스 차별점, Vector와 SQL 역할 분리가 명확함 |
| S | Cookie + CSRF + XSS/CSP | 보안 트레이드오프와 대응을 설명하기 좋음 |
| A | 채팅방 N+1 개선 | PR에 Before/After 쿼리 수 근거가 있음 |
| A | 게시글 Page/EntityGraph | 데이터 증가 대비 개선 사례 |
| A | CI 구성 | pgvector 포함 테스트 환경 |
| B | UUID 전환 | 큰 변경이지만 발표 핵심보다는 보조 사례 |
| B | Storage/Thumbnail | 사용자 경험 중심 보조 사례 |
