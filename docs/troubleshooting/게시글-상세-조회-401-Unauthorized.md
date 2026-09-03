# 게시글 상세 조회 401 Unauthorized 트러블슈팅

## 개요

재능글과 요청글 상세 조회 API에서 비로그인 사용자도 조회할 수 있어야 하는데 `401 Unauthorized`가 발생하는 문제가 있었다. Security 설정 자체는 공개 조회로 되어 있었고, 최종적으로 상세 DTO 변환에 필요한 연관 Entity 조회 전략을 분리해 문제를 해결했다.

## S: Situation | 상황

재능글과 요청글 상세 조회 화면에서 게시글 데이터를 정상적으로 조회하지 못하고 로그인 페이지로 이동하는 문제가 발생했다.

```text
GET /api/talents/{talentPostId}
GET /api/requests/{requestPostId}

→ 401 Unauthorized
→ 로그인이 필요해요.
```

하지만 상세 조회 API는 원래 비로그인 사용자도 볼 수 있어야 했다. Spring Security 설정도 공개 접근으로 되어 있었다.

```java
.requestMatchers(HttpMethod.GET, "/talents/**").permitAll()
.requestMatchers(HttpMethod.GET, "/requests/**").permitAll()
```

프론트엔드에서는 `/api/talents/{id}`로 요청하지만 Express Proxy가 `/api` prefix를 제거하고 백엔드로 전달한다.

```javascript
const targetPath = req.originalUrl.replace(/^\/api/, "") || "/";
```

따라서 Spring Security의 실제 매칭 경로는 `/api/talents/**`가 아니라 `/talents/**`가 맞았다.

## T: Task | 과제

- 401의 원인이 Security URL 패턴 문제인지 확인한다.
- 상세 조회 Controller가 인증 객체를 필요로 하는지 확인한다.
- Service와 Repository 조회 방식이 상세 응답 DTO에 필요한 데이터를 충분히 가져오는지 확인한다.
- 재능글과 요청글 상세 조회가 비로그인 상태에서도 정상 동작하게 한다.

## A: Action | 행동

### 1. Security 설정 검증

처음에는 `/api` prefix 때문에 Security URL 패턴이 잘못된 것으로 의심했다.

하지만 프론트 Express Proxy가 `/api`를 제거하므로 백엔드가 실제로 받는 경로는 다음과 같았다.

```text
/api/talents/{id}
→ Express Proxy
→ /talents/{id}
```

따라서 다음 설정은 올바른 상태였다.

```java
.requestMatchers(HttpMethod.GET, "/talents/**").permitAll()
```

### 2. Controller 인증 의존성 확인

재능글 상세 조회 Controller는 인증 객체를 사용하지 않았다.

```java
@GetMapping("/{talentPostId}")
public ApiResponse<TalentPostResponseDto> readOne(
        @PathVariable UUID talentPostId
) {
    TalentPostEntity talentPostEntity = talentPostService.readOne(talentPostId);

    return ApiResponse.ok(TalentPostResponseDto.toDto(talentPostEntity));
}
```

즉, 상세 조회 메서드 자체는 인증 정보가 없어도 동작해야 하는 구조였다.

### 3. 상세 DTO 변환에 필요한 연관관계 확인

상세 응답 DTO는 게시글 자체뿐 아니라 작성자, 카테고리, 포트폴리오 등 연관 데이터를 사용했다.

```text
TalentPostEntity
├── User
├── Category
└── Portfolio
```

기존 `findById()`는 게시글 Entity 조회에는 충분하지만, 상세 DTO 변환에 필요한 연관 Entity를 항상 함께 준비한다는 의미는 아니었다.

```text
findById()
→ 게시글 조회
→ 연관관계 Lazy
→ DTO 변환 중 연관 Entity 접근
→ 추가 조회 필요
→ 상세 조회 실패 가능
```

### 4. 상세 조회 전용 Repository 메서드 분리

상세 조회에 필요한 연관관계를 함께 로딩하도록 `@EntityGraph` 기반 상세 조회 메서드를 분리했다.

```java
@EntityGraph(attributePaths = {"user", "category", "portfolio"})
@Query("""
    SELECT t
    FROM TalentPostEntity t
    WHERE t.id = :talentPostId
    """)
Optional<TalentPostEntity> findDetailById(
        @Param("talentPostId") UUID talentPostId
);
```

Service에서는 상세 조회 시 `findDetailById()`를 사용하도록 변경했다.

```java
private TalentPostEntity getTalentPostEntity(UUID talentPostId) {
    return talentPostRepository.findDetailById(talentPostId)
            .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
}
```

요청글 상세 조회도 실제 상세 응답에서 사용하는 연관관계를 기준으로 동일하게 상세 조회 전용 메서드를 적용했다.

### 5. 401 증상 해석

`@EntityGraph`는 인증을 처리하는 기능이 아니므로 HTTP 401을 직접 해결하는 기능은 아니다.

다만 프론트 공통 API 처리에서는 401이나 인증 실패 흐름이 발생하면 로그인 화면으로 이동할 수 있다. 따라서 실제 서버 내부의 조회 실패나 예외가 사용자에게는 인증 문제처럼 보였을 가능성이 있다.

핵심은 상세 조회용 데이터가 충분히 로딩되지 않았고, 상세 조회 전용 Repository 메서드를 분리한 뒤 문제가 해결됐다는 점이다.

## R: Result | 결과 및 배움

### 결과

- 재능글과 요청글 상세 조회에서 필요한 연관 Entity를 명시적으로 함께 조회하게 됐다.
- 상세 DTO 변환 과정에서 연관 데이터 접근으로 인한 실패 가능성을 줄였다.
- 목록 조회와 상세 조회의 조회 목적을 Repository 메서드 이름으로 분리했다.
- 공개 상세 조회 API의 Security 경로를 `/api/**`로 잘못 바꾸는 실수를 피했다.

### 개선 전후

변경 전:

```text
findById()
→ 게시글만 조회
→ DTO 변환 중 연관 Entity 접근
→ 추가 조회/영속성 컨텍스트 문제 가능
```

변경 후:

```text
findDetailById()
→ 게시글 + 상세 응답에 필요한 연관 Entity 함께 조회
→ DTO 변환
→ 정상 응답
```

### 배운 점

- 상세 조회에서는 Entity 하나만 가져오는 것이 아니라 응답 DTO가 사용하는 연관관계까지 함께 고려해야 한다.
- `findById()`는 단순 조회에는 적절하지만, 상세 화면처럼 연관 데이터가 필요한 경우에는 조회 목적에 맞는 Repository 메서드를 따로 두는 것이 좋다.
- 프론트 프록시가 `/api`를 제거하는 구조라면 Spring Security 설정에는 `/api` prefix를 붙이면 안 된다.
- 화면에서 401로 보이는 문제라도 실제 원인은 인증이 아니라 데이터 조회 또는 예외 처리 흐름일 수 있으므로 서버 로그와 프론트 공통 API 처리를 함께 봐야 한다.

## 최종 정리

재능글과 요청글 상세 조회에서 `findById()`만 사용하면서 상세 DTO 변환에 필요한 연관 Entity가 충분히 준비되지 않았다. 상세 조회 전용 `@EntityGraph` Repository 메서드를 분리하여 필요한 연관 데이터를 함께 로딩하도록 개선했고, 상세 조회 화면의 실패 흐름을 해결했다.

