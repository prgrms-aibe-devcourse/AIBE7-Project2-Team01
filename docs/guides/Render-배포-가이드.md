# Render 배포 점검 가이드

## 1. 배포 구성

| 서비스 | 역할 | 주요 설정 |
| --- | --- | --- |
| `knotty-frontend` | Express 정적 서버와 `/api` 프록시 | `rootDir: frontend`, `npm start`, `API_TARGET` |
| `knotty-backend` | Spring Boot API 서버 | Docker, `prod,db,auth,redis,storage,ai` profile |

프론트는 `runtime-config.js`를 통해 API와 WebSocket base URL을 내려준다. 운영에서는 보통 다음 값을 사용한다.

```text
PUBLIC_API_BASE_URL=/api
PUBLIC_WS_BASE_URL=/api
API_TARGET=https://knotty-backend.onrender.com
```

백엔드는 운영 환경에서 `.env` 파일을 읽지 않고 Render Environment 값만 사용한다.

Blueprint로 배포할 때는 백엔드 Dockerfile 경로가 실제 파일 위치와 맞는지 확인한다. 현재 Dockerfile은 `backend/Dockerfile`에 있으며, Dockerfile 내부 `COPY backend/...` 명령은 저장소 루트를 build context로 가정한다.

## 2. 필수 환경변수

| 구분 | 환경변수 |
| --- | --- |
| DB | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |
| Auth | `JWT_SECRET`, `FRONTEND_ORIGIN`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE` |
| OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` |
| AI | `GEMINI_API_KEY`, `AI_PGVECTOR_INITIALIZE_SCHEMA` |

운영 HTTPS 환경 권장값:

```text
FRONTEND_ORIGIN=https://knotty-frontend.onrender.com
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=None
AI_PGVECTOR_INITIALIZE_SCHEMA=false
```

## 3. 사전 DB 작업

운영 DB에는 테이블 삭제 없이 필요한 확장과 스키마만 준비한다.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
```

`vector_store.id`는 합성 Document ID를 저장해야 하므로 `TEXT` 타입이어야 한다.

```text
TALENT:{UUID}
REQUEST:{UUID}
PORTFOLIO:{UUID}
```

기존 DB의 `vector_store.id`가 UUID라면 `docs/database/migrations/20260831_vector_store_id_to_text.sql`을 적용한다.

## 4. 배포 후 확인 순서

```bash
curl -I https://knotty-frontend.onrender.com/
curl -i https://knotty-backend.onrender.com/health
curl -i https://knotty-backend.onrender.com/categories
curl -i https://knotty-backend.onrender.com/ws/info
curl -I https://knotty-backend.onrender.com/oauth2/authorization/google
```

AI 매칭은 CSRF 토큰 발급 후 확인한다.

```bash
curl -i -c /tmp/knotty-cookies.txt https://knotty-backend.onrender.com/auth/csrf

curl -i -b /tmp/knotty-cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: 발급받은_XSRF_TOKEN" \
  -d '{"query":"5만원 이하 글쓰기 재능 찾아줘"}' \
  https://knotty-backend.onrender.com/ai/matches/analyze

curl -i -b /tmp/knotty-cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: 발급받은_XSRF_TOKEN" \
  -d '{"query":"5만원 이하 글쓰기 재능 찾아줘","targetType":"TALENT","condition":{"maxPrice":50000},"limit":5}' \
  https://knotty-backend.onrender.com/ai/matches
```

## 5. 현재 확인된 운영 점검 이슈

- 로컬 `main` 코드와 테스트 기준으로 `/ai/matches`는 비로그인 공개 API다.
- 배포 환경에서 `/ai/matches/analyze`는 200이지만 `/ai/matches`가 401을 반환하는 현상이 확인됐다.
- 같은 CSRF 토큰과 CORS 조건에서 `analyze`만 성공하므로 프론트 XSS/CSRF 문제가 아니라 배포 백엔드의 SecurityConfig 반영 상태를 우선 확인한다.
- Render 백엔드가 일시적으로 7~9초 이상 지연되거나 `/health`까지 타임아웃되는 경우가 있어, 시연 전 수동 호출로 인스턴스를 깨워둔다.

조치 순서:

1. Render 백엔드를 최신 `origin/main`으로 Manual Deploy한다.
2. 필요하면 Clear build cache 후 재배포한다.
3. Render가 바라보는 브랜치와 커밋 SHA가 `origin/main` 최신인지 확인한다.
4. 재배포 후 `/ai/matches` 비로그인 200 응답을 다시 확인한다.
