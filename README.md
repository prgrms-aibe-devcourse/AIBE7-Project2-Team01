<p align="center">
  <a href="https://kn0tty.onrender.com">
    <img src="./frontend/assets/knotty-logo.png" alt="Knotty" width="220" />
  </a>
</p>

<h1 align="center">Knotty</h1>

<p align="center">
  매듭 짓다, 더 가까워지다.<br />
  필요한 일과 가진 재능을 연결하는 재능 거래 플랫폼
</p>

<div align="center">
  <table>
    <tr>
      <td align="center" width="160">
        <a href="https://github.com/wlsdn020416">
          <img src="https://github.com/wlsdn020416.png?size=120" alt="wlsdn020416" width="80" height="80" />
          <br />
          <img src="https://img.shields.io/badge/wlsdn020416-181717?style=flat-square&logo=github&logoColor=white" alt="wlsdn020416" />
        </a>
      </td>
      <td align="center" width="160">
        <a href="https://github.com/pooreunblue">
          <img src="https://github.com/pooreunblue.png?size=120" alt="pooreunblue" width="80" height="80" />
          <br />
          <img src="https://img.shields.io/badge/pooreunblue-181717?style=flat-square&logo=github&logoColor=white" alt="pooreunblue" />
        </a>
      </td>
      <td align="center" width="160">
        <a href="https://github.com/yeunyeuna">
          <img src="https://github.com/yeunyeuna.png?size=120" alt="yeunyeuna" width="80" height="80" />
          <br />
          <img src="https://img.shields.io/badge/yeunyeuna-181717?style=flat-square&logo=github&logoColor=white" alt="yeunyeuna" />
        </a>
      </td>
    </tr>
  </table>
</div>

<p align="center">
  <a href="https://kn0tty.onrender.com">서비스 바로가기</a>
  ·
  <a href="./docs/README.md">프로젝트 문서</a>
  ·
  <a href="./docs/specs/API-명세서.md">API 명세</a>
  ·
  <a href="./docs/database/ERD.md">ERD</a>
</p>

## 핵심 포인트

- 재능을 판매하는 사람과 필요한 일을 요청하는 사람을 연결하는 양방향 거래 구조
- 재능글·요청글·포트폴리오 기반 작성, 탐색, 채팅, 거래 흐름 제공
- HttpOnly Cookie, SameSite, CSRF Token, DOMPurify 기반 보안 적용
- 거래·지갑·요청글 상태 전이에 비관적 락과 DB 제약을 적용해 중복 결제 방지
- Spring AI, Gemini, pgvector를 활용한 자연어 기반 AI 매칭
- Render, Supabase Storage, PostgreSQL, Redis를 활용한 배포 환경 구성

## 유저 핵심 흐름

```mermaid
flowchart LR
    A["회원가입 / 로그인"] --> B["재능글·요청글 탐색"]
    B --> C["AI 매칭으로 조건에 가까운 글 찾기"]
    C --> D["상세 페이지에서 작성자 확인"]
    D --> E["채팅 시작"]
    E --> F["금액 제안 / 결제"]
    F --> G["거래 완료"]
```

## Screenshots

<table>
  <tr>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/signup.png" alt="회원가입" width="100%" />
      <br />
      <strong>회원가입</strong>
    </td>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/talent-list.png" alt="재능글 목록" width="100%" />
      <br />
      <strong>재능글 목록</strong>
    </td>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/request-create-ai-generation.png" alt="AI 글 생성" width="100%" />
      <br />
      <strong>AI 글 생성</strong>
    </td>
  </tr>
  <tr>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/ai-matching.png" alt="AI 매칭" width="100%" />
      <br />
      <strong>AI 매칭</strong>
    </td>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/chat-trade.png" alt="채팅 거래" width="100%" />
      <br />
      <strong>채팅 거래</strong>
    </td>
    <td width="33.33%" align="center">
      <img src="./docs/images/wireframe/actual-screenshots/my-page.png" alt="마이페이지" width="100%" />
      <br />
      <strong>마이페이지</strong>
    </td>
  </tr>
</table>

## Tech Stack

### Backend

![Java](https://img.shields.io/badge/Java_17-007396?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4.0.7-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Spring AI](https://img.shields.io/badge/Spring_AI-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Gradle](https://img.shields.io/badge/Gradle-02303A?style=for-the-badge&logo=gradle&logoColor=white)

### Frontend

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![DOMPurify](https://img.shields.io/badge/DOMPurify-XSS_Defense-FF5A52?style=for-the-badge)

### Infra / External

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-Vector_Search-4169E1?style=for-the-badge)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_Storage-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Render](https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

## 상세 문서

| 문서 | 링크 |
| --- | --- |
| 전체 문서 안내 | [docs/README.md](./docs/README.md) |
| 시스템 아키텍처 | [docs/architecture/시스템-아키텍처.md](./docs/architecture/시스템-아키텍처.md) |
| 프로젝트 기획서 | [docs/specs/기획서.md](./docs/specs/기획서.md) |
| 요구사항 명세서 | [docs/specs/요구사항-명세서.md](./docs/specs/요구사항-명세서.md) |
| API 명세서 | [docs/specs/API-명세서.md](./docs/specs/API-명세서.md) |
| ERD | [docs/database/ERD.md](./docs/database/ERD.md) |
| Render 배포 가이드 | [docs/guides/Render-배포-가이드.md](./docs/guides/Render-배포-가이드.md) |
| AI 기능 개발 가이드 | [docs/ai/AI-기능-개발-가이드.md](./docs/ai/AI-기능-개발-가이드.md) |
| ADR | [docs/README.md#adr](./docs/README.md#adr) |
| 트러블슈팅 | [docs/README.md#트러블슈팅](./docs/README.md#트러블슈팅) |

## 실행

자세한 로컬 실행과 환경변수 설정은 [문서 전체 안내](./docs/README.md)와 [Render 배포 가이드](./docs/guides/Render-배포-가이드.md)를 참고한다.
