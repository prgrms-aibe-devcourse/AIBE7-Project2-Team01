# A-B Embedding 연동 계약

## 1. 목적

이 문서는 A가 저장하는 Spring AI `Document`와 B가 수행하는 Matching 검색 사이의 고정 계약을 정의한다.

- A는 Document 생성과 VectorStore 쓰기 lifecycle을 담당한다.
- B는 저장된 Document 검색과 원본 Entity 검증을 담당한다.
- B의 검색 대상은 `TALENT`, `REQUEST`만 사용한다.
- `PORTFOLIO`는 A가 저장할 수 있지만 B Matching에서는 검색하거나 Ranking하지 않는다.

## 2. 담당 범위

| 구분 | A: Generation / Embedding | B: Matching / RAG |
| --- | --- | --- |
| Document text 생성 | 담당 | 수정하지 않음 |
| Metadata 생성 | 담당 | 계약에 맞게 조회 |
| VectorStore add/update/delete | 담당 | 호출하지 않음 |
| Similarity Search | 담당하지 않음 | 담당 |
| 원본 Entity 재조회 | 담당하지 않음 | 담당 |
| 조건 Filtering / Ranking | 담당하지 않음 | 담당 |
| 추천 이유 생성 | 게시글 생성과 별도 | Matching 최종 단계에서 담당 |

A와 B는 공통 `ai/embedding` 코드와 이 문서의 계약을 협의 없이 변경하지 않는다.

## 3. Document ID 계약

```text
{TARGET_TYPE}:{TARGET_ID}

TALENT:{talentPostId UUID}
REQUEST:{requestPostId UUID}
PORTFOLIO:{portfolioId UUID}
```

예시:

```text
TALENT:550e8400-e29b-41d4-a716-446655440000
REQUEST:6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

규칙:

- A는 생성·수정·삭제에서 항상 동일한 ID 생성 규칙을 사용한다.
- 수정은 같은 Document ID로 upsert한다.
- 삭제는 같은 Document ID로 제거한다.
- B는 Document ID 문자열을 파싱하지 않고 `metadata.targetId`를 사용한다.

### 구현 선행조건

현재 프로젝트는 합성 문자열 ID를 사용하므로 Spring AI PgVectorStore ID 타입을 `TEXT` 기준으로 맞춘다.

```yaml
spring:
  ai:
    vectorstore:
      pgvector:
        id-type: TEXT
```

이 설정은 현재 `application-ai.yaml`에 반영되어 있다. 기존 `vector_store.id`가 UUID인 DB라면 설정만 변경하지 말고 팀 DB 상태를 확인한 뒤 `docs/database/migrations/20260831_vector_store_id_to_text.sql`을 적용하거나 빈 테이블을 재생성한다.

## 4. Metadata 계약

### 공통 Key

| Key | 값 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `targetType` | String | 필수 | `TALENT`, `REQUEST`, `PORTFOLIO` |
| `targetId` | String | 필수 | 원본 Entity UUID 문자열 |
| `userId` | String | 필수 | 원본 작성자 UUID 문자열 |

### 대상별 추가 Key

| 대상 | Key | 값 타입 | 허용 값 |
| --- | --- | --- | --- |
| Talent | `categoryId` | String | Category UUID 문자열 |
| Talent | `status` | String | `ACTIVE`, `INACTIVE` |
| Request | `categoryId` | String | Category UUID 문자열 |
| Request | `status` | String | `OPEN`, `CLOSED`, `CANCELLED` |
| Portfolio | 추가 Key 없음 | - | B Matching 대상 아님 |

Metadata 규칙:

- Key 이름과 대소문자를 그대로 사용한다.
- UUID와 enum은 모두 문자열로 저장한다.
- Metadata에는 null 값을 넣지 않는다. nullable 값은 key 자체를 생략한다.
- 가격, 예산, 기간, 마감일은 MVP metadata에 저장하지 않는다.
- Metadata는 후보 검색용 복제 정보이며 source of truth가 아니다.
- B는 Vector Search 후 항상 `targetId`로 원본 DB를 다시 조회한다.

### Talent 예시

```json
{
  "targetType": "TALENT",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "categoryId": "7d444840-9dc0-11d1-b245-5ffdce74fad2",
  "status": "ACTIVE"
}
```

### Request 예시

```json
{
  "targetType": "REQUEST",
  "targetId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "categoryId": "7d444840-9dc0-11d1-b245-5ffdce74fad2",
  "status": "OPEN"
}
```

## 5. Document Text 계약

Document text에는 의미 검색에 필요한 실제 필드만 포함한다.

```text
Talent
[TYPE] 재능 제공
[TITLE] TalentPostEntity.title
[CATEGORY] CategoryEntity.name
[DESCRIPTION] TalentPostEntity.content

Request
[TYPE] 재능 요청
[TITLE] RequestPostEntity.title
[CATEGORY] CategoryEntity.name
[DESCRIPTION] RequestPostEntity.content

Portfolio
[TYPE] 포트폴리오
[TITLE] PortfolioEntity.title
[DESCRIPTION] PortfolioEntity.description
```

정규화 규칙:

- Markdown 이미지 문법과 이미지 URL은 제거한다.
- 제목, 목록, 링크 라벨, 본문 기술 키워드는 유지한다.
- 가격, 예산, UUID, 작성자 닉네임, 상태, 날짜, 파일명은 text에서 제외한다.
- Talent에 연결된 Portfolio 본문을 합치지 않는다. Portfolio 변경이 Talent embedding을 오염시키거나 stale 상태를 만들 수 있다.

## 6. A의 VectorStore Lifecycle

| 도메인 변경 | A 처리 |
| --- | --- |
| Talent 생성(`ACTIVE`) | Document 생성 후 upsert |
| Talent 내용·카테고리 수정 | 동일 ID로 upsert |
| Talent `INACTIVE` 전환 | Document 삭제 |
| Talent 삭제 | Document 삭제 |
| Request 생성(`OPEN`) | Document 생성 후 upsert |
| Request 내용·카테고리 수정 | 동일 ID로 upsert |
| Request `CLOSED`/`CANCELLED` 전환 | Document 삭제 |
| Request 삭제 | Document 삭제 |
| Portfolio 생성·수정·삭제 | A가 필요한 AI 기능 기준으로 관리하며 B에는 영향 없음 |

AI API 또는 VectorStore 장애가 원본 Talent/Request CRUD를 롤백시키지 않도록 한다. 실패 대상은 로그 또는 재처리 가능한 형태로 남기고 대상별/전체 재임베딩 경로를 제공한다.

## 7. B의 검색 계약

B는 Spring AI `VectorStoreRetriever`와 `SearchRequest`를 사용한다.

검색 시 적용할 metadata filter:

```text
TALENT 검색
targetType == 'TALENT'

REQUEST 검색
targetType == 'REQUEST'
```

규칙:

- Filter 문자열을 사용자 입력으로 직접 조합하지 않고 `FilterExpressionBuilder`를 사용한다.
- status와 category metadata는 현재 필터에 사용하지 않고 SQL 원본 값으로 검증한다.
- Vector 후보는 내부 `topK` 20~30개로 시작하고 최종 응답은 3~5개만 반환한다.
- 초기 similarity threshold는 0으로 두고 테스트 데이터의 score 분포를 확인한 뒤 조정한다.
- 유사도는 검색 결과 `Document.getScore()`를 사용한다.
- `targetId`는 UUID로 안전하게 변환하고 실패한 Document는 제외한다.
- 원본 Entity는 `findAllById`로 일괄 조회하고 ID Map으로 Vector 결과 순서를 복원한다.
- 원본 DB의 상태, category, 가격/예산, 기간/마감일을 다시 검증한다.
- Portfolio Document가 결과에 포함되더라도 B는 사용하지 않는다.

## 8. 오류 및 불일치 처리

| 상황 | B 처리 |
| --- | --- |
| 필수 metadata 누락 | 후보 제외 및 경고 로그 |
| `targetId` UUID 변환 실패 | 후보 제외 및 경고 로그 |
| Vector에는 있으나 원본 Entity 없음 | 후보 제외 |
| Metadata는 활성이나 원본은 비활성/마감 | 후보 제외 |
| Metadata category와 원본 category 불일치 | 원본 DB 값 기준으로 판단 |
| `Document.getScore()`가 null | 후보 제외 또는 0점 처리 정책을 테스트에서 고정 |
| 검색 결과 없음 | 정상적인 빈 후보 목록 반환 |

## 9. 통합 완료 기준

### A 완료 기준

- Talent/Request 생성 시 계약에 맞는 Document가 저장된다.
- 수정 시 Document 수가 늘지 않고 같은 ID 데이터가 갱신된다.
- 비활성·마감·취소·삭제 시 Document가 제거된다.
- Metadata key, 값 타입, enum 문자열이 계약과 일치한다.

### B 완료 기준

- TALENT 검색에 REQUEST/PORTFOLIO가 포함되지 않는다.
- REQUEST 검색에 TALENT/PORTFOLIO가 포함되지 않는다.
- targetType metadata filter가 적용된다.
- status와 선택적 category 조건은 SQL 원본 기준으로 적용된다.
- targetId와 similarity score를 안정적으로 추출한다.
- 원본 Entity를 ID별 반복 호출하지 않고 일괄 조회한다.
- stale 또는 잘못된 Vector Document가 최종 후보에서 제외된다.

### 공동 통합 테스트

최소 다음 데이터를 사용한다.

```text
ACTIVE Talent 2개
INACTIVE Talent 1개
OPEN Request 2개
CLOSED Request 1개
Portfolio 1개
서로 다른 Category 2개 이상
```

통합 테스트에서 targetType, status, category 필터와 원본 DB 재검증을 모두 확인한 후 Ranking 구현을 시작한다.

## 10. 계약 변경 규칙

- Metadata key, 값 타입, Document ID, text 구성 변경은 A/B 모두의 승인이 필요하다.
- 변경 시 기존 Vector 데이터를 재임베딩해야 하는지 함께 판단한다.
- 계약 변경 PR에는 A 저장 테스트와 B 검색 테스트를 함께 갱신한다.
- B Matching 요구만으로 Portfolio를 검색 대상에 추가하지 않는다. 범위 변경은 별도 합의한다.
