# LINK 발표 준비 체크리스트

## 반드시 추가할 자료
- [ ] 서비스 로고 (표지 우측 상단)
- [ ] Demo용 실제 서비스 화면 캡처 또는 30~60초 녹화본
- [ ] AI Matching 실제 입력/결과 캡처
- [ ] 거래 상태 변화 화면 캡처

## 측정하면 좋은 항목 — 수치 없으면 비워둘 것
- [ ] AI Golden Set 20~30개 기준 추천 적합도 Before/After
- [ ] AI Matching 평균/P95 응답시간
- [ ] 게시글 목록 API 평균/P95 응답시간 Before/After
- [ ] 동시 거래 테스트: 같은 Wallet/RequestPost 대상으로 동시 요청 시 정합성 유지 여부
- [ ] CI 평균 실행 시간 (선택)

## 발표 전 사실 확인
- [ ] Render Auto Deploy 실제 설정 확인
- [ ] render.yaml / backend Dockerfile 존재 여부 및 현재 배포 방식 확인
- [ ] README/requirements 최신화
- [ ] 거래 취소 정책 문서와 실제 코드 일치 여부 확인
- [ ] Review/Reputation은 MVP 제외라고 명확히 표기
- [ ] AI rate limit / 임베딩 재처리는 후속 과제로만 언급

## Demo 리허설
- [ ] 테스트 계정 로그인 상태 준비
- [ ] AI 입력 문장 사전 준비
- [ ] 채팅 상대 계정/브라우저 준비
- [ ] 거래 가능한 잔액/게시글 상태 준비
- [ ] 라이브 데모 실패 대비 영상 또는 캡처본 준비

## 발표 시간 가이드
- 소개/문제/Flow/Architecture: 약 3분
- AI/보안/동시성: 약 4분
- 성능/CI/트러블슈팅: 약 2.5분
- Demo: 2분
- 회고/Q&A: 약 1분
