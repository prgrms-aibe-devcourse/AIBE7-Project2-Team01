# Knotty Frontend

Knotty의 브라우저 클라이언트다. Vanilla JavaScript 기반 SPA로 화면을 렌더링하고, Express 정적 서버가 `/api` 요청을 Spring Boot 백엔드로 프록시한다.

## 실행

```bash
cd frontend
npm install
npm start
```

- 접속 주소: `http://localhost:3000`
- 기본 백엔드 주소: `http://localhost:8080`

백엔드 주소를 바꿔야 하면 `API_TARGET`을 지정한다.

```bash
API_TARGET=http://localhost:8081 npm start
```

## 테스트

```bash
cd frontend
npm test
```

프론트 테스트는 API CSRF 처리, XSS 방어, AI 검색 화면, 목록 페이지네이션, 마이페이지, 사용자 프로필, 상세 페이지 액션을 확인한다.

## 구조

```text
frontend/
├── assets/              # favicon, OG 이미지, 로고
├── index.html           # SPA 진입점
├── login.html           # 로그인 진입점
├── runtime-config.js    # 배포 환경 런타임 설정
├── server.js            # Express 정적 서버와 API Proxy
├── styles.css
├── src/
│   ├── api/             # 공통 API 요청, 업로드 API
│   ├── auth/            # 현재 사용자와 인증 상태
│   ├── config/          # 런타임 설정 로더
│   ├── features/        # 기능별 화면과 API 모듈
│   ├── shared/security/ # XSS 방어 유틸
│   ├── shared/ui/       # 공통 UI 유틸
│   ├── app.js           # 라우팅 후 화면 바인딩
│   └── router.js
└── test/                # Node.js Test Runner 기반 프론트 테스트
```

## 주요 화면

- 홈
- 로그인/회원가입
- 재능글 목록·작성·상세
- 요청글 목록·작성·상세
- 포트폴리오 작성·조회
- AI 매칭 검색
- 채팅과 거래 진행
- 마이페이지, 사용자 프로필, 거래 목록, 지갑
