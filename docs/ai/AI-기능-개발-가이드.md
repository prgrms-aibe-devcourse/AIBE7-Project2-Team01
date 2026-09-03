# AI 기능 개발 가이드

상세 연동 규칙은 [B Matching 연동 계약](./B-매칭-연동-계약.md)에서 확인한다.

## 1. 목표

Talent와 Request를 자연어로 검색하고, SQL 원본 데이터를 검증해 적합한 후보와 추천 이유를 제공한다. Portfolio 임베딩은 다른 AI 기능에서 사용할 수 있지만 B Matching 검색 대상에서는 제외한다.

```text
게시글/포트폴리오
→ Embedding → pgvector 저장
→ 자연어 검색 → Vector Search
→ 원본 데이터 조건 검증 → Ranking
→ 최종 추천 → 추천 이유 생성
```

Review/Reputation은 일정, 발표 준비, 성능 개선과 프론트 연동을 우선하기 위해 MVP 범위에서 제외한다.

## 2. 역할 분담

| 담당 | 영역 | 주요 작업 |
| --- | --- | --- |
| A | Generation / Embedding | AI 게시글 생성, Talent/Request/Portfolio 임베딩, 생성·수정·삭제에 따른 VectorStore 데이터 관리 |
| B | Matching / RAG | Talent/Request 자연어 검색, Vector Search, 원본 조건 검증, MatchScore, 최종 후보와 추천 이유 생성 |

## 3. 전체 구조

```text
ai
├── embedding       # A/B 공통 계약과 VectorStore 쓰기
├── generation      # A
└── matching        # B

A: Domain CRUD → Document 생성 → EmbeddingService → VectorStore
B: AI 검색 화면 → Query 분석 → TALENT/REQUEST 검색 계획 → Vector Search → 원본 DB → Ranking → 추천
```

## 4. 공통 Embedding 규칙

MVP에서는 Spring AI `VectorStore`를 사용하며 별도 `AiEmbeddingEntity`, `AiEmbeddingRepository`, 자체 HTTP Client를 만들지 않는다.

### Document ID

```text
{TARGET_TYPE}:{TARGET_ID}

TALENT:{UUID}
REQUEST:{UUID}
PORTFOLIO:{UUID}
```

`EmbeddingTargetType`은 `TALENT`, `REQUEST`, `PORTFOLIO`만 사용한다. 동일 ID로 다시 저장해 수정 시 upsert하고, 삭제 시 같은 ID를 사용한다.

현재 `application-ai.yaml`과 `docs/database/schema.sql`은 PgVectorStore ID 타입을 `TEXT`로 맞춘다.

### Metadata

| 대상 | 필수 metadata |
| --- | --- |
| 공통 | `targetType`, `targetId`, `userId` |
| Talent | 공통 + `categoryId`, `status` |
| Request | 공통 + `categoryId`, `status` |
| Portfolio | 공통 항목만 사용 |

UUID와 enum은 문자열로 저장하고 nullable 값은 key 자체를 생략한다. 가격, 예산, 기간, 마감일은 우선 원본 DB에서 최종 검증한다. Metadata는 후보를 좁히기 위한 복제 정보이며 source of truth가 아니다.

### Document Text

```text
Talent:    [TYPE] 재능 제공 / [TITLE] / [CATEGORY] / [DESCRIPTION]
Request:   [TYPE] 재능 요청 / [TITLE] / [CATEGORY] / [DESCRIPTION]
Portfolio: [TYPE] 포트폴리오 / [TITLE] / [DESCRIPTION]
```

Markdown 이미지 문법과 URL은 제거하되 의미가 있는 본문과 기술 키워드는 유지한다. 가격, UUID, 닉네임, 상태, 날짜, 파일명은 text에서 제외한다.

## 5. Matching 흐름

```text
사용자 Query
→ targetType 확인(TALENT 또는 REQUEST)
→ `/ai/matches/analyze`가 자연어에서 targetType과 조건을 추출
→ 사용자가 확인 가능한 조건으로 `/ai/matches` 호출
→ 서버가 검색 계획 검증
→ targetType metadata filter
→ Vector Search로 후보 추출
→ targetId로 Talent 또는 Request 원본 일괄 조회
→ 가격/예산/카테고리/상태/기간 최종 검증
→ 서버 MatchScore 계산
→ TOP 3~5 선정
→ LLM이 추천 이유 생성
```

B는 Portfolio Document를 검색하거나 Ranking에 직접 사용하지 않는다. 검색 API는 `query`, `targetType`, 선택적 `categoryId`와 금액·기간 조건을 받는다. 프론트는 자연어 분석 API 결과로 해당 입력값을 자동 채운다.

`VectorSearchService`는 Spring AI `VectorStoreRetriever`로 검색하고, `AiMatchingService`는 원본 조회와 전체 흐름을 조정하며, `MatchRankingService`는 외부 의존성 없이 점수만 계산한다. Ranking은 서버가 결정하고 LLM은 내부 UUID나 임의 SQL/filter 또는 순위를 만들지 않는다.

상태와 명시적 category, 가격 상한, 예산 범위, 기간, 마감일은 VectorStore metadata가 아닌 SQL 원본을 기준으로 필수 Filtering 처리한다. MatchScore는 semantic score 중심으로 계산하고 금액 선호가 있을 때만 amount fit을 추가한다.

## 6. 개발 순서

- [x] 공통 Document ID, metadata key, text 규격 확정
- [x] VectorStore ID 타입을 합성 ID 규칙과 일치시키기
- [x] Talent 저장·수정·삭제와 검색용 metadata 준비
- [x] TALENT Vector Search와 similarity score 추출 검증
- [x] Talent 원본 Entity 일괄 조회와 필수 조건 Filtering 구현
- [x] 구조화된 TALENT Matching API와 단순 Ranking 완성
- [x] Request 임베딩과 Matching 확장(Portfolio 검색 제외)
- [ ] Portfolio 임베딩 lifecycle 확장
- [x] LLM 자연어 Query 조건 분석
- [x] LLM 추천 이유 생성
- [ ] 기존 데이터 재임베딩과 장애 복구 방법 준비
- [x] 프론트 AI 검색 화면 연동
- [ ] 운영 배포 환경 `/ai/matches` 공개 호출 재검증

## 7. 협업 시 주의사항

- 공통 `ai/embedding` 코드는 담당자와 협의 없이 임의 수정하지 않는다.
- Document ID와 metadata key 이름 및 타입을 임의 변경하지 않는다.
- `build.gradle`, `application-ai.yaml`, 모델명, embedding 차원 변경은 반드시 팀에 공유한다.
- Metadata는 원본 도메인 데이터의 source of truth로 사용하지 않는다.
- 각 담당 영역 밖의 Domain Entity, Service, DTO를 수정해야 하면 해당 담당자에게 먼저 공유한다.
- AI API 장애 때문에 원본 Talent/Request/Portfolio CRUD가 롤백되지 않도록 한다.
- 임베딩 실패는 기록하고 대상별 또는 전체 재임베딩으로 복구할 수 있게 한다.
- 실제 API Key와 사용자 원문을 로그나 PR에 남기지 않는다.
