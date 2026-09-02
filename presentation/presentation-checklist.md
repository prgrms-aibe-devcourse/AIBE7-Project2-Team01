# 발표 전 체크리스트

## 1. 실행 확인

- [ ] `presentation/presentation.html`을 브라우저에서 열어 슬라이드 이동 확인
- [ ] 방향키 왼쪽/오른쪽 이동 확인
- [ ] Space 키 다음 슬라이드 이동 확인
- [ ] `F` 키 전체화면 진입 확인
- [ ] `#1`, `#7`, `#13` 해시 직접 접근 확인
- [ ] 브라우저 인쇄 화면에서 PDF 저장 레이아웃 확인

## 2. 데모 준비

- [ ] Render 프론트 접속 확인: `https://knotty-frontend.onrender.com/`
- [ ] 백엔드 서버 상태 확인
- [ ] Google OAuth 로그인 가능 여부 확인
- [ ] 데모 계정 지갑 잔액 준비
- [ ] 카테고리 더미 데이터 확인
- [ ] AI 검색용 게시글 임베딩 데이터 확인
- [ ] 재능글 데모 데이터 준비
- [ ] 요청글 데모 데이터 준비
- [ ] 채팅방 생성 및 메시지 전송 확인
- [ ] 거래 요청, 결제, 완료 흐름 확인

## 3. 캡처 필요 화면

아래 이미지는 `presentation/assets/screenshots/`에 넣어두면 라이브 데모 실패 시 대체 자료로 쓸 수 있다.

- [ ] 메인 화면
- [ ] AI 매칭 검색 화면
- [ ] AI 매칭 결과 화면
- [ ] 재능글 상세 화면
- [ ] 요청글 상세 화면
- [ ] 채팅 거래 요청 버튼 화면
- [ ] 결제 팝업 또는 결제 완료 화면
- [ ] 마이페이지 거래 목록 화면
- [ ] GitHub Actions 성공 화면
- [ ] Render 배포 화면

## 4. 측정 필요 항목

임의 수치를 발표하지 않는다. 측정하지 못하면 “측정 필요”라고 말한다.

- [ ] 게시글 목록 조회 응답 시간 Before/After
- [ ] AI 매칭 평균 응답 시간
- [ ] Gemini 추천 이유 생성 실패율
- [ ] 동시 결제 테스트 결과
- [ ] 배포 환경 WebSocket 연결 안정성
- [ ] 프론트 Lighthouse 또는 접근성 점검

## 5. 사실 검증 주의

- [ ] Review/Reputation은 MVP 제외라고 말하기
- [ ] 공개 AI API rate limit은 후속 과제라고 말하기
- [ ] 임베딩 전체 재처리 관리자 기능은 후속 과제라고 말하기
- [ ] AI 추천 정확도 수치를 임의로 말하지 않기
- [ ] 채팅방 N+1 개선 수치는 PR #74 근거 기준으로만 말하기
- [ ] 거래 취소 정책은 현재 코드 기준으로 확인 후 말하기

## 6. 근거 링크 확인

- [ ] PR #64 XSS/CSP
- [ ] PR #65 CSRF/SameSite/CORS
- [ ] PR #72 AI Matching
- [ ] PR #73 게시글 목록 Page/EntityGraph
- [ ] PR #74 채팅방 N+1
- [ ] PR #86 거래 로직/password 제한
- [ ] PR #93 CI
- [ ] PR #96 배포 대응
- [ ] ADR-001 HttpOnly Cookie JWT
- [ ] ADR-002 Hybrid AI Matching
- [ ] ADR-003 Review/Reputation MVP 제외

