# 요구사항 명세서

## 1. 문서 개요

- 프로젝트: AI 기반 양방향 재능 거래 플랫폼 Knotty
- 기준일: 2026년 9월 1일
- 상태 기준: `완료`, `부분 완료`, `예정`, `MVP 제외`
- 구현 기준: 현재 Backend/Frontend 코드와 ADR

## 2. MVP 목표

사용자가 재능 판매글 또는 재능 요청글을 등록하고, 자연어 검색으로 적합한 글을 찾은 뒤 채팅에서 거래 금액을 협의하고 지갑 결제·정산까지 완료할 수 있어야 한다.

```text
게시글 작성
→ 검색 및 AI 매칭
→ 채팅
→ 거래 요청
→ 결제
→ 완료 또는 취소
```

Review/Reputation과 Bookmark는 핵심 거래 흐름, 프론트 연동, 성능 개선과 발표 준비에 집중하기 위해 MVP 범위에서 제외한다.

## 3. 구현 현황 요약

| 영역 | 상태 | 비고 |
| --- | --- | --- |
| 회원·인증 | 완료 | Local/Google 로그인, HttpOnly Cookie, CSRF |
| 재능글 | 완료 | CRUD, 상태, 파일, 썸네일, 포트폴리오 연결 |
| 요청글 | 완료 | CRUD, 상태 전이, 파일, 썸네일 |
| 포트폴리오 | 완료 | CRUD, 파일, 썸네일, 재능글 연결 |
| 검색 | 완료 | 키워드·카테고리·AI 검색 화면 연동 |
| AI 생성 | 완료 | Gemini 기반 Talent/Request 초안 생성 |
| AI 매칭 | 완료 | Backend/Frontend 연동 완료, 운영 배포 공개 API 재검증 필요 |
| 채팅 | 완료 | STOMP, 이미지, 거래 액션 메시지 |
| 거래·결제 | 완료 | 양방향 거래, 상태 전이, 잠금, 환불·정산 |
| 보안 | 완료 | XSS, HttpOnly Cookie, SameSite, CSRF, CORS |
| 리뷰·평판 | MVP 제외 | ADR-003 기준 |
| 북마크 | MVP 제외 | 후속 기능 |

## 4. 회원 및 인증

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | 이메일 회원가입 | 이메일·비밀번호·닉네임과 선택 프로필 이미지로 가입 | 상 | 완료 |
| FR-AUTH-02 | Local 로그인 | 인증 성공 시 Access/Refresh Token을 HttpOnly Cookie로 발급 | 상 | 완료 |
| FR-AUTH-03 | Google 로그인 | OAuth2 성공 후 Cookie 발급 및 프론트로 이동 | 상 | 완료 |
| FR-AUTH-04 | 인증 갱신 | Refresh Cookie로 Access Cookie 재발급 | 상 | 완료 |
| FR-AUTH-05 | 로그아웃 | Redis 토큰 제거 및 Cookie 만료 | 상 | 완료 |
| FR-AUTH-06 | 내 정보 관리 | 조회, 닉네임·프로필 이미지 수정, 회원 탈퇴 | 중 | 완료 |
| NFR-SEC-01 | Token 탈취 방지 | JavaScript가 인증 Token에 접근하지 못하도록 HttpOnly 적용 | 상 | 완료 |
| NFR-SEC-02 | CSRF 방어 | SameSite/Secure Cookie와 CSRF Cookie/Header 검증 | 상 | 완료 |
| NFR-SEC-03 | XSS 방어 | 사용자·AI·Markdown 출력 sanitizing 및 URL allowlist | 상 | 완료 |

## 5. 재능글

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-TALENT-01 | 재능글 CRUD | 인증 사용자가 작성하고 작성자만 수정·삭제 가능 | 상 | 완료 |
| FR-TALENT-02 | 상세 정보 | 카테고리, 가격, 예상 기간, 단위와 선택 포트폴리오 저장 | 상 | 완료 |
| FR-TALENT-03 | Markdown 작성 | 본문 작성·미리보기와 임시 이미지 삽입 지원 | 상 | 완료 |
| FR-TALENT-04 | 대표 이미지 | 이미지 업로드, 교체, 삭제, 대표 지정과 첫 이미지 자동 지정 | 중 | 완료 |
| FR-TALENT-05 | 판매 상태 | `ACTIVE`, `INACTIVE` 상태와 작성자 비활성화 지원 | 상 | 완료 |
| FR-TALENT-06 | 반복 거래 | 거래 완료 후에도 재능글은 `ACTIVE` 유지 | 상 | 완료 |

## 6. 요청글

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-REQUEST-01 | 요청글 CRUD | 인증 사용자가 작성하고 작성자만 `OPEN` 글 수정·삭제 가능 | 상 | 완료 |
| FR-REQUEST-02 | 상세 정보 | 카테고리, 최소·최대 예산과 선택 마감일 저장 | 상 | 완료 |
| FR-REQUEST-03 | Markdown 작성 | 재능글 작성 화면과 동일한 본문 작성·미리보기 제공 | 상 | 완료 |
| FR-REQUEST-04 | 대표 이미지 | 이미지 업로드, 교체, 삭제, 대표 지정과 첫 이미지 자동 지정 | 중 | 완료 |
| FR-REQUEST-05 | 1회성 상태 | `OPEN → IN_PROGRESS → CLOSED`, 결제 취소 시 `OPEN` 복구 | 상 | 완료 |
| FR-REQUEST-06 | 수동 마감 | 작성자가 거래 전 `OPEN` 글을 마감 가능 | 중 | 완료 |

## 7. 카테고리 및 포트폴리오

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-CATEGORY-01 | 카테고리 목록 | 전체 카테고리 조회 | 중 | 완료 |
| FR-CATEGORY-02 | 카테고리 필터 | Talent/Request 목록에서 선택 카테고리 필터링 | 중 | 완료 |
| FR-PORTFOLIO-01 | 포트폴리오 CRUD | 작성자 기준 생성·조회·수정·삭제 | 중 | 완료 |
| FR-PORTFOLIO-02 | 파일 관리 | 다중 파일 업로드·교체·삭제와 대표 이미지 지정 | 중 | 완료 |
| FR-PORTFOLIO-03 | 재능글 연결 | 재능글 작성 팝업에서 내 포트폴리오 선택 | 중 | 완료 |
| FR-PORTFOLIO-04 | 상세 팝업 | 재능글 하단 카드 클릭 시 포트폴리오 상세 팝업 재사용 | 중 | 완료 |

## 8. 검색 및 AI

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-SEARCH-01 | 키워드 검색 | Talent/Request 제목과 본문 검색 | 상 | 완료 |
| FR-SEARCH-02 | AI 글 생성 | Gemini가 입력 조건과 선택 이미지로 제목·본문 초안 생성 | 중 | 완료 |
| FR-SEARCH-03 | 임베딩 lifecycle | 게시글 커밋 후 비동기로 VectorStore 저장·갱신·삭제 | 상 | 완료 |
| FR-SEARCH-04 | 자연어 매칭 | `TALENT` 또는 `REQUEST` Vector Similarity Search | 상 | 완료 |
| FR-SEARCH-05 | Hybrid 검증 | Vector 후보를 UUID로 일괄 조회하고 SQL 원본 조건 검증 | 상 | 완료 |
| FR-SEARCH-06 | Ranking | semantic similarity와 선택 amount fit으로 서버가 순위 결정 | 상 | 완료 |
| FR-SEARCH-07 | 추천 이유 | 서버 TOP 후보에 대해 Gemini가 이유만 생성, 실패 시 결과 유지 | 중 | 완료 |
| FR-SEARCH-08 | 매칭 썸네일 | 대표 이미지를 후보 응답에 일괄 포함 | 중 | 완료 |
| FR-SEARCH-09 | 공개 검색 | 비로그인 사용자도 AI 매칭 API 호출 가능 | 중 | 완료 |
| FR-SEARCH-10 | AI 검색 화면 연동 | mock 화면을 실제 매칭 API와 연결 | 상 | 완료 |
| FR-SEARCH-11 | AI 조건 자동 채움 | 검색 문장을 분석해 대상 타입과 조건 입력값을 채움 | 중 | 완료 |
| FR-SEARCH-12 | Keyword fallback | AI 장애 시 일반 검색 결과 제공 | 중 | 예정 |
| NFR-AI-01 | 공개 API 호출 제한 | IP 기준 Rate Limit과 `429` 응답 | 상 | 예정 |
| NFR-AI-02 | 임베딩 복구 | 실패 대상 재처리와 전체·대상별 재임베딩 수단 | 상 | 예정 |
| NFR-AI-03 | 정형 조건 후보 누락 방지 | metadata 또는 SQL 선필터로 TOP K 이후 필터 누락 완화 | 중 | 예정 |
| NFR-AI-04 | 운영 배포 검증 | Render 배포 환경에서 `/ai/matches` 공개 호출 정상화 | 상 | 예정 |

Portfolio 임베딩은 다른 AI 기능에서 사용할 수 있으나 B Matching 검색 대상에서는 제외한다.

## 9. 채팅

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-CHAT-01 | 채팅방 생성 | Talent 또는 Request와 상대 사용자를 기준으로 1:1 방 생성 | 상 | 완료 |
| FR-CHAT-02 | 실시간 메시지 | SockJS/STOMP 메시지 발행 및 방별 구독 | 상 | 완료 |
| FR-CHAT-03 | 내 채팅방 | 상대 프로필, 사용자명과 연결 게시글 제목 표시 | 중 | 완료 |
| FR-CHAT-04 | 메시지 내역 | 페이지 단위 조회와 긴 목록 내부 스크롤 | 중 | 완료 |
| FR-CHAT-05 | 이미지 메시지 | 스토리지 업로드 후 이미지 메시지 전송 | 중 | 완료 |
| FR-CHAT-06 | 거래 액션 | 금액 설정 요청, 결제 요청, 결제 완료 메시지 표현 | 상 | 완료 |
| FR-CHAT-07 | 채팅방 나가기 | 참여자 삭제 및 마지막 참여자 퇴장 시 정리 | 중 | 완료 |

## 10. 거래·결제·지갑

| ID | 요구사항 | 완료 조건 | 우선순위 | 상태 |
| --- | --- | --- | --- | --- |
| FR-TRADE-01 | Request 거래 요청 | 글 작성자가 상대에게 금액 설정 요청, 상대가 금액 확정 | 상 | 완료 |
| FR-TRADE-02 | Talent 거래 요청 | 글 작성자가 금액을 확정해 결제 요청 | 상 | 완료 |
| FR-TRADE-03 | 결제 주체 | Request는 작성자, Talent는 신청자가 payer | 상 | 완료 |
| FR-TRADE-04 | 결제 | 지갑 차감, payee 정산과 거래 `PENDING → PAID → COMPLETED` 처리 | 상 | 완료 |
| FR-TRADE-05 | 완료·정산 | 결제 API에서 즉시 완료 처리하고 완료 메시지 발행 | 상 | 완료 |
| FR-TRADE-06 | 취소 | 수취자가 결제 전 `PENDING` 거래를 취소하고 요청글 상태 복구 | 상 | 완료 |
| FR-TRADE-07 | 거래 조회 | 참여자의 거래 목록·상세 조회 | 중 | 완료 |
| FR-WALLET-01 | 지갑 충전 | 최소 금액 검증과 충전 내역 기록 | 상 | 완료 |
| FR-WALLET-02 | 지갑 내역 | 충전·결제·정산·환불 내역 페이지 조회 | 중 | 완료 |
| NFR-TRADE-01 | 동시성 제어 | 거래·요청글·지갑·채팅방에 비관적 쓰기 락 적용 | 상 | 완료 |
| NFR-TRADE-02 | DB 중복 방지 | 진행 거래, 요청글 결제, 거래별 지갑 내역에 제약 적용 | 상 | 완료 |

## 11. MVP 제외 범위

| ID | 기능 | 제외 이유 | 재검토 조건 |
| --- | --- | --- | --- |
| OUT-01 | Review CRUD | 거래·AI·프론트 완성도와 발표 준비 우선 | 거래 완료 권한과 중복 리뷰 정책 확정 |
| OUT-02 | Reputation 분석·Ranking | 리뷰 데이터와 효과 검증 기준 부재 | 리뷰 축적 후 추천 품질 비교 가능 |
| OUT-03 | Bookmark | 핵심 거래 흐름과 직접 관련 없음 | MVP 이후 사용자 편의 기능 확장 |

Review/Reputation 제외 결정은 [ADR-003](./adr/ADR-003-리뷰-평판-MVP-제외.md)과 [MVP 리뷰 기능 범위 조정 트러블슈팅](./troubleshooting/MVP-리뷰-기능-범위-조정.md)을 따른다.

## 12. 검증 기준

- Backend 전체 테스트와 Spring ApplicationContext가 통과해야 한다.
- Frontend 보안 테스트에서 XSS sanitizing과 CSRF Header 처리가 통과해야 한다.
- Request 결제 경쟁 상황에서 하나의 거래만 게시글을 선점해야 한다.
- AI 추천 이유 생성 실패가 매칭 후보와 Ranking 결과를 제거하지 않아야 한다.
- 프론트 AI 검색 화면은 `/ai/matches/analyze`와 `/ai/matches`를 순서대로 호출해야 한다.
- 운영 배포에서는 `/ai/matches`가 비로그인 호출에서도 200을 반환하는지 별도 확인한다.
- 실제 API Key, JWT Secret과 환경변수 파일은 Git에 포함하지 않는다.
