# XSS 보안 적용 후 제목 필드 누락 트러블슈팅

## 개요

XSS 방어를 위해 HTML을 DOMPurify로 정제한 이후 요청글, 재능글, 포트폴리오 작성 화면에서 제목 값을 가져오지 못하는 문제가 발생했다. 원인은 `name="title"`이 DOM clobbering 위험이 있는 속성으로 판단되어 정제 과정에서 제거된 것이었다.

## S: Situation | 상황

XSS 보안 코드를 적용한 이후 글 작성과 AI 글 생성 흐름에서 제목 값이 정상적으로 처리되지 않았다.

AI 글 생성 기능에서는 다음 오류가 발생했다.

```text
Cannot set properties of undefined (setting 'value')
```

또한 글 등록 payload를 만들 때 `FormData`에서 제목 값이 누락됐다.

```javascript
new FormData(form).get("title") // null
```

## T: Task | 과제

- XSS 정제 이후 제목 입력 필드가 실제 DOM에 남아 있는지 확인한다.
- `form.elements.title` 접근이 실패하는 이유를 찾는다.
- 요청글, 재능글, 포트폴리오 작성·수정 화면에서 제목 값이 안정적으로 전달되게 한다.
- 보안 정제를 유지하면서 폼 접근 방식을 개선한다.

## A: Action | 행동

### 1. 기존 폼 구조 확인

프론트엔드에서는 제목 입력 필드를 다음과 같이 사용하고 있었다.

```html
<input name="title" type="text" />
```

JavaScript에서는 `name`을 기준으로 제목 필드에 접근했다.

```javascript
form.elements.title.value = generated.title;
```

### 2. DOMPurify 정제 결과 확인

DOMPurify 적용 이후 `name="title"` 속성이 제거될 수 있음을 확인했다.

```html
<input type="text" />
```

`title`은 브라우저 DOM 객체에서 이미 사용하는 기본 속성 이름이다. 이처럼 DOM 기본 속성과 충돌할 수 있는 이름은 DOM clobbering 공격 표면이 될 수 있으므로 정제 과정에서 제거될 수 있다.

그 결과 다음 접근이 실패했다.

```javascript
form.elements.title // undefined
```

### 3. 제목 필드 이름 변경

DOM 기본 속성과 충돌하지 않도록 제목 필드 이름을 `postTitle`로 변경했다.

```html
<input
  name="postTitle"
  data-portfolio-title-input
  type="text"
/>
```

### 4. named property 접근 제거

브라우저 named property에 의존하는 접근을 제거하고, 의도가 명확한 `data-*` 선택자를 사용했다.

```javascript
const titleInput = form.querySelector("[data-portfolio-title-input]");

titleInput.value = generated.title || "";
titleInput.dispatchEvent(new Event("input", { bubbles: true }));
```

### 5. FormData key 변경

payload 생성 시에도 변경된 필드명을 사용했다.

```javascript
const formData = new FormData(form);

const payload = {
  title: formData.get("postTitle"),
  content: formData.get("content"),
};
```

요청글, 재능글, 포트폴리오 작성 및 수정 화면에 동일한 방향을 반영했다.

## R: Result | 결과 및 배움

### 결과

- DOMPurify 정제 이후에도 `postTitle` 필드가 유지됐다.
- AI 생성 결과의 제목과 본문이 입력 필드에 정상 반영됐다.
- 글 작성 및 수정 payload에 제목 값이 포함됐다.
- 요청글, 재능글, 포트폴리오 작성 화면에서 동일한 문제가 재발하지 않도록 폼 접근 방식을 통일했다.

### 검증

DOMPurify 정제 이후에도 제목 필드가 유지되는지 테스트로 확인했다.

```javascript
assert.equal(titleInput.name, "postTitle");
assert.equal(new FormData(titleInput.form).has("postTitle"), true);
```

검증 결과는 다음과 같다.

- DOMPurify 적용 후 `postTitle` 유지
- AI 생성 결과의 제목과 본문 입력 정상
- 글 작성 및 수정 payload에 제목 포함
- 프론트엔드 테스트 통과

### 배운 점

- XSS 방어 라이브러리는 위험한 태그와 이벤트 속성뿐 아니라 DOM clobbering 가능성이 있는 `id`, `name`도 제거할 수 있다.
- `title`, `action`, `method`, `submit`, `length`, `constructor`처럼 브라우저 기본 속성과 충돌하기 쉬운 이름은 폼 필드명으로 피하는 것이 좋다.
- `form.elements.title` 같은 named property 접근보다 `data-*` 선택자를 사용하는 방식이 더 명확하고 안전하다.

## 최종 정리

XSS 방어 적용 후 `name="title"`이 정제되면서 제목 필드를 찾지 못했다. 제목 필드명을 `postTitle`로 변경하고 `data-*` 선택자 기반 접근으로 전환하여 보안 정제를 유지하면서 글 작성 흐름을 복구했다.

