# Knotty 문서 안내

프로젝트 문서는 목적별로 나누어 관리한다. 최상위 `README.md`는 실행과 기능 요약을, `docs`는 발표·협업·운영에 필요한 상세 근거를 담는다.

## 빠른 이동

| 분류 | 문서 |
| --- | --- |
| 명세 | [프로젝트 기획서](./specs/기획서.md), [요구사항 명세서](./specs/요구사항-명세서.md), [API 명세서](./specs/API-명세서.md) |
| 아키텍처 | [시스템 아키텍처](./architecture/시스템-아키텍처.md) |
| 데이터베이스 | [ERD](./database/ERD.md), [초기 스키마](./database/schema.sql), [마이그레이션](./database/migrations) |
| 개발/운영 가이드 | [코딩 및 PR 컨벤션](./guides/코딩-PR-컨벤션.md), [Render 배포 가이드](./guides/Render-배포-가이드.md), [Spring Boot 참고 링크](./guides/Spring-Boot-참고링크.md) |
| AI | [AI 기능 개발 가이드](./ai/AI-기능-개발-가이드.md), [Spring AI 환경설정 가이드](./ai/Spring-AI-환경설정-가이드.md), [A-B 임베딩 연동 계약](./ai/A-B-임베딩-연동-계약.md), [B 매칭 연동 계약](./ai/B-매칭-연동-계약.md) |
| ADR | [ADR 목록](#adr) |
| 트러블슈팅 | [트러블슈팅 목록](#트러블슈팅) |
| 진행 기록 | [프로그램 수행일지 요약](./progress/프로그램-수행일지-요약.md), [프로그램 수행일지 상세](./progress/프로그램-수행일지-상세.md), [프로젝트 전체 WBS](./progress/WBS-프로젝트-전체.md) |

## 명세

- [프로젝트 기획서](./specs/기획서.md): 서비스 배경, 목표, MVP 범위
- [요구사항 명세서](./specs/요구사항-명세서.md): 기능별 구현 상태와 제외 범위
- [API 명세서](./specs/API-명세서.md): REST, WebSocket, 인증·CSRF, AI 요청 계약

## 아키텍처

- [시스템 아키텍처](./architecture/시스템-아키텍처.md): Frontend, Backend, Database, Redis, Supabase, AI 관계

## 데이터베이스

- 신규 DB는 [초기 스키마](./database/schema.sql)를 기준으로 구성한다.
- ERD와 관계 설명은 [ERD](./database/ERD.md)에서 확인한다.
- 기존 DB의 거래 정합성 제약은 [20260831_trade_integrity_constraints.sql](./database/migrations/20260831_trade_integrity_constraints.sql)을 적용한다.
- 기존 `vector_store.id`가 UUID인 DB는 [20260831_vector_store_id_to_text.sql](./database/migrations/20260831_vector_store_id_to_text.sql)을 적용한다.
- pgvector 사용 전 PostgreSQL에서 `CREATE EXTENSION IF NOT EXISTS vector;` 실행 권한을 확인한다.

## AI

| 문서 | 내용 |
| --- | --- |
| [AI 기능 개발 가이드](./ai/AI-기능-개발-가이드.md) | 역할 분담, 전체 흐름, MVP 구현 방향 |
| [Spring AI 환경설정 가이드](./ai/Spring-AI-환경설정-가이드.md) | Gemini, pgvector, 환경변수 설정 |
| [A-B 임베딩 연동 계약](./ai/A-B-임베딩-연동-계약.md) | Document ID, metadata, text, lifecycle |
| [B 매칭 연동 계약](./ai/B-매칭-연동-계약.md) | Vector Search와 SQL 원본 검증 계약 |
| [AI 에이전트 설계 원칙](./ai/AI-에이전트-설계.md) | 코드 작업 시 공통 개발 원칙 |

## ADR

| ADR | 상태 | 결정 |
| --- | --- | --- |
| [ADR-000](./adr/ADR-000-Spring-AI-초기-아키텍처.md) | 대체됨 | Spring AI 초기 아키텍처 |
| [ADR-001](./adr/ADR-001-HttpOnly-쿠키-JWT-인증.md) | 승인 | JWT를 HttpOnly Cookie로 관리 |
| [ADR-002](./adr/ADR-002-하이브리드-AI-매칭-아키텍처.md) | 승인 | Vector Search와 SQL 검증을 결합한 매칭 |
| [ADR-003](./adr/ADR-003-리뷰-평판-MVP-제외.md) | 승인 | Review/Reputation을 MVP에서 제외 |

## 트러블슈팅

- [거래 정합성 및 임베딩 AFTER_COMMIT](./troubleshooting/거래-정합성-및-임베딩-AFTER-COMMIT.md)
- [JWT 권한 설정 오류](./troubleshooting/JWT-권한-설정-오류.md)
- [XSS 적용 후 제목 필드 누락](./troubleshooting/XSS-적용-후-제목-필드-누락.md)
- [게시글 상세 조회 401 Unauthorized](./troubleshooting/게시글-상세-조회-401-Unauthorized.md)
- [MVP 리뷰 기능 범위 조정](./troubleshooting/MVP-리뷰-기능-범위-조정.md)
- [게시글 목록 N+1 및 페이지네이션](./troubleshooting/게시글-목록-N-PLUS-ONE-및-페이지네이션.md)
- [채팅방 목록 N+1](./troubleshooting/chatroom-list-nplus1.md)

## 관리 기준

- 문서가 코드와 달라지면 코드 기준으로 문서를 갱신한다.
- 발표 자료용 문서와 개발 근거 문서를 섞지 않는다.
- API, ERD, 요구사항 변경은 관련 문서와 README 링크를 함께 확인한다.
- 실제 비밀값, 운영 키, 개인 계정 정보는 문서에 작성하지 않는다.
