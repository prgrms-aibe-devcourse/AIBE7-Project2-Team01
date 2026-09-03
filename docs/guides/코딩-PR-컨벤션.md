# 📌 Code Convention

본 문서는 프로젝트의 코드 일관성과 협업 효율을 높이기 위한 코드 작성 및 Git 협업 규칙을 정의한다.

---

## 1. 클래스 / 메서드 / 변수 네이밍

### 1.1 기본 네이밍 규칙

Java의 기본 네이밍 컨벤션을 따른다.

| 대상      | 규칙               | 예시                    |
| ------- | ---------------- | --------------------- |
| 클래스     | PascalCase       | `UserService`         |
| 인터페이스   | PascalCase       | `UserRepository`      |
| 메서드     | camelCase        | `findUserById()`      |
| 변수      | camelCase        | `userId`              |
| 상수      | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`       |
| 패키지     | 소문자              | `domain.user.service` |
| Enum    | PascalCase       | `RequestPostStatus`   |
| Enum 상수 | UPPER_SNAKE_CASE | `IN_PROGRESS`         |

### 1.2 클래스 네이밍

클래스명은 **역할이 명확하게 드러나도록** 작성한다.

```java
public class UserService {
}

public class RequestPostController {
}

public class TalentPostRepository {
}
```

Spring 계층별 접미사는 다음 규칙을 따른다.

* Controller → `Controller`
* Service → `Service`
* Repository → `Repository`
* Entity → `Entity`
* DTO → `Request`, `Response`
* Exception → `Exception`

---

### 1.3 메서드 네이밍

메서드는 **동작을 나타내는 동사 + 대상** 형태로 작성한다.

```java
createRequestPost()
findRequestPost()
findRequestPostById()
updateRequestPost()
deleteRequestPost()
```

조회 메서드는 다음과 같이 구분한다.

```java
findAll()
findById()
findByUserId()
findByCategoryId()
```

Boolean 값을 반환하는 메서드는 `is`, `has`, `can` 등을 사용한다.

```java
isActive()
hasPermission()
canEdit()
```

---

### 1.4 변수 네이밍

변수명은 **의미를 명확하게 전달할 수 있도록** 작성한다.

```java
Long userId;
String title;
LocalDate dueDate;
RequestPostEntity requestPost;
```

의미가 불분명한 축약어 사용을 지양한다.

```java
// ❌
UserEntity u;
RequestPostEntity rp;
String req;

// ✅
UserEntity user;
RequestPostEntity requestPost;
String requestTitle;
```

단, 일반적으로 통용되는 약어는 사용할 수 있다.

```java
id
url
dto
api
jwt
```

---

## 2. DTO / Entity 이름 규칙

### 2.1 Entity

Entity 클래스명은 **도메인명 + `Entity`** 형태로 작성한다.

```java
UserEntity
TalentPostEntity
RequestPostEntity
CategoryEntity
PortfolioFileEntity
```

Entity는 데이터베이스의 테이블과 도메인 객체의 역할을 담당한다.

```java
@Entity
@Table(name = "request_posts")
public class RequestPostEntity {
}
```

---

### 2.2 DTO

DTO는 용도에 따라 `Request`, `Response`를 명확하게 구분한다.

#### Request DTO

클라이언트로부터 전달받는 데이터를 표현한다.

```java
CreateRequestPostRequest
UpdateRequestPostRequest
LoginRequest
```

#### Response DTO

클라이언트에게 반환하는 데이터를 표현한다.

```java
RequestPostResponse
UserResponse
TalentPostResponse
```

---

### 2.3 DTO 패키지 구조

가능하면 도메인별로 DTO를 관리한다.

```text
domain/
├── request/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   └── dto/
│       ├── CreateRequestPostRequest.java
│       ├── UpdateRequestPostRequest.java
│       └── RequestPostResponse.java
```

---

### 2.4 DTO 이름 작성 기준

DTO 이름만 보고 **언제 사용되는 DTO인지 알 수 있도록** 작성한다.

```java
// 생성
CreateRequestPostRequest

// 수정
UpdateRequestPostRequest

// 조회 응답
RequestPostResponse

// 목록 응답
RequestPostListResponse
```

단순히 `RequestDto`, `ResponseDto`와 같이 의미가 불명확한 이름은 지양한다.

```java
// ❌
RequestDto
ResponseDto
UserDto

// ✅
CreateRequestPostRequest
RequestPostResponse
UserResponse
```

---

## 3. Commit Message Convention

커밋 메시지는 **Conventional Commits** 형식을 따른다.

### 3.1 기본 형식

```text
<type>: <description>
```

예시:

```text
feat: 재능글 생성 API 구현
fix: JWT 인증 오류 수정
refactor: 게시글 조회 로직 개선
```

---

### 3.2 Commit Type

| Type       | 설명                  |
| ---------- | ------------------- |
| `feat`     | 새로운 기능 추가           |
| `fix`      | 버그 수정               |
| `refactor` | 기능 변경 없이 코드 구조 개선   |
| `docs`     | 문서 수정               |
| `test`     | 테스트 코드 추가 및 수정      |
| `style`    | 코드 포맷팅, import 정리 등 |
| `chore`    | 설정, 빌드, 의존성 등 기타 작업 |
| `perf`     | 성능 개선               |

---

### 3.3 Commit 작성 규칙

#### 1. 한 커밋에는 하나의 작업 단위만 포함한다.

```text
❌ feat: 로그인 구현 및 게시글 API 수정 및 README 수정
```

```text
✅ feat: 로그인 API 구현
✅ fix: 게시글 조회 오류 수정
✅ docs: README 작성
```

#### 2. 제목은 간결하게 작성한다.

```text
✅ feat: 재능글 생성 API 구현
```

#### 3. 제목 끝에 마침표를 사용하지 않는다.

```text
❌ feat: 재능글 생성 API 구현.
✅ feat: 재능글 생성 API 구현
```

#### 4. 커밋은 기능 단위로 쪼개서 작성한다.

```text
feat: RequestPost Entity 추가
feat: RequestPost 생성 DTO 추가
feat: RequestPost 생성 서비스 구현
feat: RequestPost 생성 API 구현
```

---

### 3.4 Commit 예시

```text
feat: 재능글 생성 API 구현
```

```text
fix: RequestPost 조회 시 존재하지 않는 ID 처리
```

```text
refactor: RequestPost 조회 로직 캡슐화
```

```text
test: RequestPost 생성 서비스 테스트 추가
```

```text
docs: API 명세서 수정
```

---

## 4. PR 작성 규칙

PR은 **변경 사항과 테스트 결과를 다른 팀원이 쉽게 이해할 수 있도록** 작성한다.

### 4.1 PR 제목

PR 제목은 커밋 컨벤션과 동일한 형식을 사용한다.

```text
<type>: <작업 내용>
```

예시:

```text
feat: 재능글 생성 API 구현
fix: JWT 인증 오류 수정
refactor: 게시글 조회 로직 개선
```

---

### 4.2 PR 본문

다음 형식을 기본 템플릿으로 사용한다.

```markdown
## 📌 작업 내용

- 재능글 생성 API 구현
- 재능글 생성 DTO 추가
- 재능글 생성 Service 구현
- 재능글 생성 Controller 구현

## 🔍 주요 변경 사항

### Entity
- `TalentPostEntity` 생성

### DTO
- `CreateTalentPostRequest` 생성
- `TalentPostResponse` 생성

### Service
- 재능글 생성 로직 구현

### Controller
- `POST /talent-posts` API 구현

## 🧪 테스트

- [x] 재능글 정상 생성
- [x] 존재하지 않는 카테고리 요청
- [x] 필수 값 누락 요청
- [x] 인증되지 않은 사용자 요청

## 📸 결과

<!-- 필요한 경우 API 실행 결과 또는 화면 첨부 -->

## ⚠️ 참고 사항

<!-- 리뷰어가 알아야 할 사항이 있다면 작성 -->
```

---

### 4.3 PR 작성 시 주의사항

#### 1. PR 하나에는 하나의 기능 또는 목적을 담는다.

```text
❌ 로그인 + 회원가입 + 게시글 수정 + AI 검색
```

```text
✅ 로그인 API 구현
```

#### 2. 변경 사항을 구체적으로 작성한다.

```text
❌ 코드 수정
```

```text
✅ RequestPost 생성 API 및 Service 로직 구현
```

#### 3. 테스트 여부를 명확하게 표시한다.

```markdown
## 🧪 테스트

- [x] 정상 요청 테스트
- [x] 예외 상황 테스트
- [x] 인증 실패 테스트
```

#### 4. 리뷰어가 확인해야 할 부분이 있다면 PR 본문에 명시한다.

```markdown
## ⚠️ 리뷰 요청 사항

- RequestPost의 status 변경 로직 확인 부탁드립니다.
- 카테고리 조회 시 예외 처리 방식 확인 부탁드립니다.
```

---

## 5. 전체 예시

### Commit

```text
feat: 재능글 생성 API 구현
```

### PR

```markdown
# feat: 재능글 생성 API 구현

## 📌 작업 내용

- 재능글 생성 API 구현
- 재능글 생성 DTO 추가
- 재능글 생성 Service 구현
- 재능글 생성 Controller 구현

## 🔍 주요 변경 사항

- `CreateTalentPostRequest` 추가
- `TalentPostResponse` 추가
- `TalentPostService#createTalentPost()` 구현
- `TalentPostController#createTalentPost()` 구현

## 🧪 테스트

- [x] 정상적인 재능글 생성
- [x] 필수 값 검증
- [x] 존재하지 않는 카테고리 검증
- [x] 인증되지 않은 사용자 요청 검증

## 📸 결과

- API 정상 동작 확인

## ⚠️ 참고 사항

- 인증된 사용자만 재능글을 생성할 수 있도록 처리했습니다.
```

---

## 6. 핵심 요약

### Naming

```text
Class       → PascalCase
Method      → camelCase
Variable    → camelCase
Constant    → UPPER_SNAKE_CASE
Package     → lowercase
Entity      → DomainEntity
Request DTO → ActionDomainRequest
Response DTO → DomainResponse
```

### Commit

```text
type: description
```

예:

```text
feat: 재능글 생성 API 구현
fix: JWT 인증 오류 수정
refactor: 게시글 조회 로직 개선
```

### PR

```text
제목
↓
작업 내용
↓
주요 변경 사항
↓
테스트
↓
결과
↓
참고 사항 / 리뷰 요청 사항
```
