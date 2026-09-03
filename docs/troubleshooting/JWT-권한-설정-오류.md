# JWT 권한 설정 문제 트러블슈팅

## 개요

요청글 생성 API에서 `403 Forbidden`이 발생하고 작성자 정보가 정상적으로 전달되지 않는 문제가 있었다. 원인은 인증 사용자가 필요한 API를 `permitAll()`로 열어둔 Security 설정이었다.

## S: Situation | 상황

요청글 생성 요청인 `POST /requests`에서 권한 오류가 발생했다.

```text
POST /requests
→ 403 Forbidden
```

요청글 생성 로직은 로그인한 사용자의 정보를 기반으로 작성자를 설정해야 했다. Controller에서는 인증 객체를 통해 현재 사용자를 받는 구조였다.

```java
@AuthenticationPrincipal CustomUserDetails userDetails
```

즉, 요청글 생성 API는 비로그인 공개 API가 아니라 인증이 필요한 API였다.

## T: Task | 과제

- 요청글 생성 API가 인증이 필요한 API인지 확인한다.
- `SecurityConfig`의 URL 접근 정책과 Controller의 인증 의존성이 서로 맞는지 확인한다.
- JWT 인증이 완료된 사용자만 요청글 생성 API에 접근하도록 수정한다.
- `@AuthenticationPrincipal`에 `CustomUserDetails`가 정상 전달되는지 확인한다.

## A: Action | 행동

### 1. Security 설정 확인

기존 설정에서는 `/requests` 경로가 `permitAll()` 대상으로 열려 있었다.

```java
"/requests"
```

하지만 이 설정은 요청글 생성 API의 실제 요구사항과 맞지 않았다. 인증이 필요한 API를 공개 접근으로 처리하면 Spring Security 필터에서 인증 객체가 만들어지지 않거나, Controller에서 필요한 사용자 정보를 받을 수 없다.

### 2. Controller 인증 의존성 확인

요청글 생성 API는 로그인 사용자의 `userId`를 이용해 작성자를 저장해야 했다. 따라서 `@AuthenticationPrincipal`이 정상 동작해야 하고, 이 API는 반드시 인증된 요청으로 들어와야 했다.

### 3. 접근 정책 수정

요청글 생성 요청은 인증 필요 대상으로 변경했다.

```java
.requestMatchers(HttpMethod.POST, "/requests").authenticated()
```

또는 공개 API를 제외한 나머지를 인증 대상으로 두는 경우에는 다음 정책에 자연스럽게 포함되도록 정리했다.

```java
.anyRequest().authenticated()
```

### 4. 인증 흐름 재검증

JWT가 포함된 요청에서 `JwtFilter`가 인증 객체를 만들고, Controller의 `@AuthenticationPrincipal`로 `CustomUserDetails`가 전달되는지 확인했다.

```text
JWT Cookie
→ JwtFilter
→ CustomUserDetails 생성
→ @AuthenticationPrincipal 전달
→ 작성자 userId 저장
```

## R: Result | 결과 및 배움

### 결과

- 인증된 사용자만 요청글 생성 API를 호출할 수 있게 됐다.
- JWT 기반 인증 객체가 Controller까지 전달됐다.
- 요청글 작성자의 `userId`를 정상적으로 사용할 수 있게 됐다.
- 공개 API와 인증 API의 경계가 더 명확해졌다.

### 배운 점

- `@AuthenticationPrincipal`을 사용하는 API는 `permitAll()`로 설정하면 안 된다.
- URL 접근 정책은 단순히 열어둘지 막을지가 아니라, Controller와 Service가 인증 정보를 필요로 하는지까지 함께 보고 결정해야 한다.
- 게시글 조회처럼 공개 가능한 API와 게시글 생성처럼 작성자 정보가 필요한 API는 같은 도메인이라도 HTTP Method 기준으로 접근 정책을 분리해야 한다.

## 최종 정리

요청글 생성 API는 작성자 정보를 필요로 하므로 인증 필수 API로 관리해야 한다. `SecurityConfig`에서 `POST /requests`를 인증 대상으로 변경하여 JWT 인증 사용자만 글을 생성할 수 있도록 수정했다.

