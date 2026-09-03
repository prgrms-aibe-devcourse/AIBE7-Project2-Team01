# API 명세서

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| Backend | Spring Boot 4.0.7 / Java 17 |
| Local server | `http://localhost:8080` |
| Frontend proxy | `http://localhost:3000/api` → Backend |
| OpenAPI JSON | `/v3/api-docs` |
| Swagger UI | `/swagger-ui/index.html` |
| 공통 성공 응답 | `{"success":true,"data":...}` |
| 식별자 | UUID |

`/health`는 문자열을 반환한다. 그 외 주요 API는 `ApiResponse`로 감싸며, Talent/Request 목록과 검색 API는 Spring `Page`를 `data`에 담아 반환한다.

## 2. 인증 및 보안

- Access Token과 Refresh Token은 `HttpOnly Cookie`로 전달한다.
- 프론트 요청은 `credentials: include`를 사용한다.
- `POST`, `PUT`, `PATCH`, `DELETE` 요청은 `XSRF-TOKEN` 쿠키 값을 `X-XSRF-TOKEN` 헤더로 전달한다.
- CSRF 쿠키는 `GET /auth/csrf`로 발급한다.
- `/ws/**`는 SockJS fallback POST를 위해 CSRF 검사에서 제외한다.
- 인증 만료 시 `POST /auth/refresh` 성공 후 원래 요청을 한 번 재시도한다.

### 공개 API

- `GET /health`, `GET /categories`
- `POST /users/signup`
- `GET /auth/csrf`, `POST /auth/login`, `POST /auth/refresh`
- `GET /users/public/**`
- `GET /talents/**`, `GET /requests/**`
- `POST /ai/matches/analyze`
- `POST /ai/matches`
- `/oauth2/**`, `/login/oauth2/**`, `/swagger-ui/**`, `/v3/api-docs/**`, `/ws/**`

그 외 API는 인증이 필요하다.

## 3. Auth / User

| Method | URL | 인증 | Content-Type | 설명 |
| --- | --- | --- | --- | --- |
| GET | `/auth/csrf` | 공개 | - | CSRF 쿠키 발급 |
| POST | `/auth/login` | 공개 | JSON | 로그인 및 Access/Refresh Cookie 발급 |
| POST | `/auth/refresh` | 공개 | - | Refresh Cookie로 Access Cookie 재발급 |
| POST | `/auth/logout` | 필요 | - | Redis 토큰 제거 및 인증 Cookie 만료 |
| GET | `/oauth2/authorization/google` | 공개 | - | Google OAuth2 로그인 시작 |
| POST | `/users/signup` | 공개 | Multipart | 회원가입. `request` JSON part, 선택 `profileImage` part |
| GET | `/users/me` | 필요 | - | 마이페이지 조회 |
| PATCH | `/users/me` | 필요 | JSON | 닉네임 수정 |
| PATCH | `/users/me/profile-image` | 필요 | Multipart | 프로필 이미지 수정. `file` part |
| DELETE | `/users/me` | 필요 | - | 회원 탈퇴 |
| GET | `/users/public/{userId}` | 공개 | - | 공개 프로필 사용자 정보 조회 |

```json
// POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

회원가입 비밀번호는 최소 8자 이상이어야 한다. 내 정보 수정은 현재 닉네임 변경과 프로필 이미지 변경을 분리해서 처리한다.

## 4. Category

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/categories` | 공개 | 전체 카테고리 목록 조회 |

## 5. Talent Post

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/talents?page=&size=&sort=` | 공개 | 재능글 페이지 목록 조회. 기본 size 20, `createdAt,DESC` |
| GET | `/talents/{talentPostId}` | 공개 | 재능글 상세 조회 |
| GET | `/talents/search?keyword=&page=&size=&sort=` | 공개 | 키워드 및 페이지 검색. 기본 size 20 |
| POST | `/talents` | 필요 | 재능글 등록 |
| PUT | `/talents/{talentPostId}` | 작성자 | 재능글 수정 |
| PATCH | `/talents/{talentPostId}/inactive` | 작성자 | `ACTIVE → INACTIVE` 전환 |
| DELETE | `/talents/{talentPostId}` | 작성자 | 재능글 삭제 |

```json
{
  "title": "Spring Boot API 개발",
  "content": "마크다운 본문",
  "categoryId": "UUID",
  "price": 500000,
  "estimatedDuration": 7,
  "durationUnit": "DAY",
  "portfolioId": null
}
```

`durationUnit`은 `DAY`, `WEEK`, `MONTH`를 사용한다. `portfolioId`는 선택값이다.

## 6. Request Post

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/requests?page=&size=&sort=` | 공개 | 요청글 페이지 목록 조회. 기본 size 20, `createdAt,DESC` |
| GET | `/requests/{requestPostId}` | 공개 | 요청글 상세 조회 |
| GET | `/requests/search?keyword=&page=&size=&sort=` | 공개 | 키워드 및 페이지 검색. 기본 size 20 |
| POST | `/requests` | 필요 | 요청글 등록 |
| PUT | `/requests/{requestPostId}` | 작성자 | `OPEN` 요청글 수정 |
| PATCH | `/requests/{requestPostId}/close` | 작성자 | 요청글 수동 마감 |
| DELETE | `/requests/{requestPostId}` | 작성자 | `OPEN` 요청글 삭제 |

```json
{
  "title": "쇼핑몰 API 개발 요청",
  "content": "마크다운 본문",
  "categoryId": "UUID",
  "budgetMin": 300000,
  "budgetMax": 700000,
  "dueDate": "2026-09-30"
}
```

요청글 상태는 `OPEN`, `IN_PROGRESS`, `CLOSED`, `CANCELLED`를 사용한다.

## 7. Post File / Thumbnail

Talent와 Request 파일 API의 구조는 동일하다.

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/{talents|requests}/{postId}/files` | 공개 | 파일 목록 조회 |
| POST | `/{talents|requests}/{postId}/files` | 작성자 | `file` part 업로드 |
| PATCH | `/{talents|requests}/{postId}/files/{fileId}` | 작성자 | `file` part로 교체 |
| PATCH | `/{talents|requests}/{postId}/files/{fileId}/thumbnail` | 작성자 | 이미지 파일을 대표 이미지로 지정 |
| DELETE | `/{talents|requests}/{postId}/files/{fileId}` | 작성자 | 파일 삭제 |

대표 이미지를 지정하지 않으면 첫 이미지가 자동으로 대표 이미지가 된다. 대표 이미지가 없으면 목록과 매칭 응답에서 이미지 영역을 생략한다.

## 8. Portfolio

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/portfolios` | 필요 | 포트폴리오 등록 |
| GET | `/users/me/portfolios` | 필요 | 내 포트폴리오 목록 |
| GET | `/users/{userId}/portfolios` | 필요 | 사용자 포트폴리오 목록 |
| GET | `/users/public/{userId}/portfolios` | 공개 | 공개 프로필용 사용자 포트폴리오 목록 |
| GET | `/portfolios/{portfolioId}` | 필요 | 포트폴리오 상세 |
| PATCH | `/portfolios/{portfolioId}` | 작성자 | 포트폴리오 수정 |
| DELETE | `/portfolios/{portfolioId}` | 작성자 | 포트폴리오 삭제 |
| GET | `/portfolios/{portfolioId}/files` | 필요 | 파일 목록 |
| POST | `/portfolios/{portfolioId}/files` | 작성자 | 파일 업로드 |
| PATCH | `/portfolios/{portfolioId}/files/{fileId}` | 작성자 | 파일 교체 |
| PATCH | `/portfolios/{portfolioId}/files/{fileId}/thumbnail` | 작성자 | 대표 이미지 지정 |
| DELETE | `/portfolios/{portfolioId}/files/{fileId}` | 작성자 | 파일 삭제 |

## 9. AI Generation

두 API 모두 인증이 필요하며 `multipart/form-data`를 사용한다. `data`에는 JSON, `image`에는 선택 이미지를 전달한다.

| Method | URL | 설명 |
| --- | --- | --- |
| POST | `/ai/generation/talents` | 재능글 제목과 마크다운 본문 생성 |
| POST | `/ai/generation/requests` | 요청글 제목과 마크다운 본문 생성 |

응답은 `title`, `content`를 포함한다. 생성 결과를 저장하지 않으며 사용자가 확인·수정한 후 일반 게시글 API로 등록한다.

## 10. AI Matching

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/ai/matches/analyze` | 공개 | 자연어 검색 문장을 `targetType`과 정형 조건으로 분석 |
| POST | `/ai/matches` | 공개 | 자연어 기반 Talent 또는 Request 매칭 |

```json
// POST /ai/matches/analyze
{
  "query": "50만원 이하 Spring 백엔드 개발자 찾아줘"
}
```

```json
// POST /ai/matches
{
  "query": "50만원 이하 Spring 백엔드 개발",
  "targetType": "TALENT",
  "condition": {
    "categoryId": null,
    "maxPrice": 500000,
    "maxEstimatedDuration": 14,
    "durationUnit": "DAY",
    "minBudget": null,
    "maxBudget": null,
    "dueDateFrom": null,
    "dueDateTo": null
  },
  "limit": 5
}
```

- `targetType`: `TALENT` 또는 `REQUEST`. `PORTFOLIO` 검색은 지원하지 않는다.
- `limit`: 1~5, 생략 시 5.
- Talent 조건: `categoryId`, `maxPrice`, `maxEstimatedDuration`와 `durationUnit`.
- Request 조건: `categoryId`, `minBudget`, `maxBudget`, `dueDateFrom`, `dueDateTo`.
- Vector Search 후 SQL 원본 상태와 조건을 재검증한다.
- 응답 후보는 `thumbnailUrl`, `semanticScore`, `amountScore`, `matchScore`, `recommendationReason`을 포함한다.
- Gemini 추천 이유 생성에 실패하면 순위와 후보는 유지하고 `recommendationReason`만 비어 있을 수 있다.
- 프론트 AI 검색 화면은 먼저 `/ai/matches/analyze`로 검색 문장을 분석한 뒤, 사용자가 확인 가능한 조건으로 `/ai/matches`를 호출한다.

## 11. Chat / WebSocket

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/chatrooms` | 필요 | Request 또는 Talent 기준 1:1 채팅방 생성 |
| GET | `/chatrooms` | 필요 | 내 채팅방 목록 |
| GET | `/chatrooms/{id}?page=0&size=50` | 참여자 | 채팅 메시지 목록 |
| POST | `/chatrooms/{chatRoomId}/images` | 참여자 | 이미지 메시지 전송 |
| POST | `/chatrooms/{chatRoomId}/trade-amount-request` | 요청글 작성자 | 상대방에게 금액 설정 요청 전송 |
| DELETE | `/chatrooms/{id}` | 참여자 | 채팅방 나가기 |

WebSocket 연결과 메시지 경로:

| 구분 | 경로 |
| --- | --- |
| SockJS endpoint | `/ws` |
| Publish | `/app/chat.send` |
| Subscribe | `/topic/chat-rooms/{chatRoomId}` |

메시지 타입은 `TEXT`, `IMAGE`, `SYSTEM`, `TRADE_REQUEST`를 사용한다. `SYSTEM` 메시지는 `actionType`으로 `TRADE_AMOUNT_REQUEST`, `TRADE_PAID`, `TRADE_COMPLETED`, `TRADE_CANCELLED`를 내려줄 수 있고, 거래 카드 렌더링에는 `trade` 객체를 사용한다.

## 12. Trade / Wallet

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/chatrooms/{chatRoomId}/trades` | 참여자 및 정책상 요청 권한자 | 채팅방 거래 생성 |
| GET | `/trades` | 필요 | 내 거래 목록. Pageable 지원 |
| GET | `/trades/{tradeId}` | 참여자 | 거래 상세 |
| POST | `/trades/{tradeId}/pay` | 결제자 | 지갑 결제, 정산 및 `PENDING → PAID → COMPLETED` |
| PATCH | `/trades/{tradeId}/complete` | 결제자 | `PAID` 상태 거래 수동 완료. 현재 결제 API가 즉시 완료하므로 예외 보정용 |
| PATCH | `/trades/{tradeId}/cancel` | 수취자 | `PENDING` 거래 취소. 요청글 거래면 `OPEN`으로 복구 |
| GET | `/wallet` | 필요 | 내 지갑 조회 |
| POST | `/wallet/charge` | 필요 | 지갑 충전. 최소 1,000원 |
| GET | `/wallet/transactions` | 필요 | 지갑 거래 내역. Pageable 지원 |

```json
// POST /chatrooms/{chatRoomId}/trades
{
  "amount": 500000,
  "requestPostId": "UUID",
  "talentPostId": null
}
```

- Request 거래: 요청글 작성자가 payer, 신청자가 payee이다. 거래 요청 생성 시 요청글은 `IN_PROGRESS`가 되고, 결제 후 바로 `CLOSED`로 완료 처리된다. 결제 전 취소 시에는 요청글을 다시 `OPEN`으로 복구한다.
- Talent 거래: 신청자가 payer, 재능글 작성자가 payee이다. 결제 후 바로 완료 처리되며 재능글은 거래 후에도 `ACTIVE`를 유지한다.
- 거래 상태: `PENDING`, `PAID`, `COMPLETED`, `CANCELLED`.
- 지갑 내역 타입: `CHARGE`, `PAYMENT`, `RECEIVE`, `REFUND`.

## 13. Upload / Health

| Method | URL | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/uploads/temp` | 필요 | 마크다운 본문용 임시 이미지 업로드 |
| GET | `/health` | 공개 | 서버 상태 문자열 반환 |
