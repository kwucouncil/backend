# 스포츠 대회 2025 API 명세서

## 📋 개요
광운대학교 스포츠 대회 2025를 위한 REST API입니다. 풋살 리그전, 토너먼트 경기, 학과별 순위, 경기장 정보 등을 제공합니다.

## 🔗 기본 정보
- **Base URL**: `https://api.example.com/api/sports2025`
- **Content-Type**: `application/json`
- **인증**: 현재 미구현 (추후 JWT 토큰 기반 인증 예정)

---

## 📊 1. 학과별 총점 순위 조회

### `GET /api/sports2025/standings`

학과별 총점 순위를 조회합니다. 모든 종목의 경기 결과를 종합하여 계산됩니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "standings": [
      {
        "department_id": 1,
        "department_name": "컴퓨터소프트웨어학과",
        "college_name": "정보융합대학",
        "total_score": 15,
        "rank": 1
      }
    ],
    "updated_at": "2025년 09월 01일 오후 10시 기준"
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/standings"
```

---

## ⚽ 2. 풋살 리그전 순위 조회

### `GET /api/sports2025/futsal-standings`

풋살 리그전의 조별 순위를 조회합니다. 승점, 득실차, 골 수 등을 기준으로 정렬됩니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "groupedStandings": {
      "A조": [
        {
          "department_id": 1,
          "department_name": "컴퓨터소프트웨어학과",
          "college_name": "정보융합대학",
          "group_name": "A조",
          "matches": 3,
          "wins": 2,
          "draws": 1,
          "losses": 0,
          "goals_for": 8,
          "goals_against": 3,
          "goal_difference": 5,
          "points": 7,
          "rank": 1,
          "wildcard": false
        }
      ]
    }
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/futsal-standings"
```

---

## 🏆 3. 경기 일정 조회

### `GET /api/sports2025/matches`

경기 일정을 조회합니다. 날짜, 종목, 경기장 등으로 필터링할 수 있습니다.

#### 쿼리 파라미터
- `date` (선택): 특정 날짜 (YYYY-MM-DD)
- `sport_id` (선택): 종목 ID
- `venue_id` (선택): 경기장 ID
- `is_played` (선택): 경기 완료 여부 (true/false)

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": 1,
        "match_date": "2025-08-30",
        "period_start": 1,
        "sport": {
          "id": 1,
          "name": "풋살",
          "name_eng": "futsal"
        },
        "venue": {
          "id": 1,
          "name": "교내 풋살장",
          "location_note": "체육관 1층"
        },
        "is_played": false,
        "rain_canceled": false,
        "participations": [
          {
            "department_id": 1,
            "department_name": "컴퓨터소프트웨어학과",
            "side": "home",
            "score": 0
          }
        ]
      }
    ]
  }
}
```

#### 사용 예시
```bash
# 전체 경기 조회
curl "https://api.example.com/api/sports2025/matches"

# 특정 날짜 경기 조회
curl "https://api.example.com/api/sports2025/matches?date=2025-08-30"

# 특정 종목 경기 조회
curl "https://api.example.com/api/sports2025/matches?sport_id=1"
```

---

## 🏫 4. 학과 정보 조회

### `GET /api/sports2025/departments`

모든 학과 정보를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": 1,
        "name": "컴퓨터소프트웨어학과",
        "college": {
          "id": 1,
          "name": "정보융합대학"
        }
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/departments"
```

---

## 🎓 5. 단과대학 정보 조회

### `GET /api/sports2025/colleges`

모든 단과대학 정보를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "colleges": [
      {
        "id": 1,
        "name": "정보융합대학"
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/colleges"
```

---

## ⚽ 6. 종목 정보 조회

### `GET /api/sports2025/sports`

모든 종목 정보를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "sports": [
      {
        "id": 1,
        "name": "풋살",
        "name_eng": "futsal",
        "is_team_sport": true
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/sports"
```

---

## 🏟️ 7. 경기장 정보 조회

### `GET /api/sports2025/venues`

모든 경기장 정보를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "venues": [
      {
        "id": 1,
        "name": "교내 풋살장",
        "location_note": "체육관 1층"
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/venues"
```

---

## 🎯 8. 종목별 경기장 정보 조회

### `GET /api/sports2025/sport-venues`

각 종목별로 사용 가능한 경기장 정보를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "sport_venues": {
      "풋살": {
        "name": "교내 풋살장",
        "location_note": "체육관 1층",
        "description": "실내 풋살 전용 경기장"
      },
      "농구": {
        "name": "교내 농구장",
        "location_note": "체육관 2층",
        "description": "실내 농구 전용 경기장"
      },
      "피구": {
        "name": "교내 농구장",
        "location_note": "체육관 2층",
        "description": "농구장을 활용한 피구 경기"
      },
      "족구": {
        "name": "교내 농구장",
        "location_note": "체육관 2층",
        "description": "농구장을 활용한 족구 경기"
      },
      "탁구": {
        "name": "교내 탁구장",
        "location_note": "체육관 3층",
        "description": "실내 탁구 전용 경기장"
      },
      "줄다리기": {
        "name": "광운스퀘어",
        "location_note": "교내 중앙 광장",
        "description": "야외 중앙 광장"
      },
      "LOL": {
        "name": "레드포스 광운대점",
        "location_note": "교내 PC방",
        "description": "e스포츠 전용 PC방"
      },
      "FC온라인": {
        "name": "레드포스 광운대점",
        "location_note": "교내 PC방",
        "description": "e스포츠 전용 PC방"
      }
    }
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/sports2025/sport-venues"
```

---

## 📢 9. 공지사항 조회

### `GET /api/announcements`

공지사항 목록을 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": 1,
        "title": "2025년 스포츠 대회 일정 안내",
        "content": "2025년 8월 30일부터 9월 5일까지 진행되는 스포츠 대회 일정을 안내드립니다.",
        "author": "학생회",
        "created_at": "2025-07-15T10:00:00Z",
        "updated_at": "2025-07-15T10:00:00Z"
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/announcements"
```

---

## 📝 10. 회의록 조회

### `GET /api/minutes`

회의록 목록을 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "minutes": [
      {
        "id": 1,
        "title": "2025년 스포츠 대회 기획 회의",
        "content": "스포츠 대회 종목 선정 및 일정 조율에 대한 논의",
        "meeting_date": "2025-07-15",
        "attendees": "학생회장, 체육부장, 각종목 담당자",
        "created_at": "2025-07-15T10:00:00Z",
        "updated_at": "2025-07-15T10:00:00Z"
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/minutes"
```

---

## 🎯 11. 경기 예측 조회

### `GET /api/predictions`

경기 예측 결과를 조회합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": 1,
        "user_id": "user123",
        "match_id": 1,
        "predicted_winner": "home",
        "predicted_score_home": 3,
        "predicted_score_away": 1,
        "created_at": "2025-07-15T10:00:00Z"
      }
    ]
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/predictions"
```

---

## 🔧 12. 시스템 검증

### `GET /api/verify-system`

시스템 상태와 데이터베이스 연결을 검증합니다.

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2025-07-15T10:00:00Z"
  }
}
```

#### 사용 예시
```bash
curl "https://api.example.com/api/verify-system"
```

---

## 📤 13. 파일 업로드

### `POST /api/upload`

파일을 업로드합니다.

#### 요청 본문
- `file`: 업로드할 파일 (multipart/form-data)

#### 응답 스키마
```json
{
  "success": true,
  "data": {
    "filename": "uploaded_file.pdf",
    "size": 1024,
    "url": "https://storage.example.com/files/uploaded_file.pdf"
  }
}
```

#### 사용 예시
```bash
curl -X POST -F "file=@document.pdf" "https://api.example.com/api/upload"
```

---

## 📊 데이터 구조

### 종목 정보
- **풋살**: 리그전 + 16강 토너먼트
- **농구**: 29강 토너먼트
- **피구**: 29강 토너먼트
- **족구**: 29강 토너먼트
- **탁구**: 29강 토너먼트
- **줄다리기**: 29강 토너먼트
- **LOL**: 29강 토너먼트
- **FC온라인**: 29강 토너먼트

### 풋살 리그전 구조
- **A조 ~ G조**: 총 7개 조
- **A조 ~ F조**: 각 조당 4개 팀
- **G조**: 5개 팀 (총 29개 학과)
- **승점 계산**: 승(3점), 무(1점), 패(0점)
- **순위 결정**: 승점 → 득실차 → 득점 → 승수

### 경기 일정
- **기간**: 2025년 8월 30일 ~ 9월 6일
- **교시**: 1교시 ~ 8교시 (일별 상이)
- **총 경기 수**: 43경기

---

## 🚨 오류 코드

### HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청
- `404`: 리소스를 찾을 수 없음
- `500`: 서버 내부 오류

### 오류 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "잘못된 요청입니다.",
    "details": "필수 파라미터가 누락되었습니다."
  }
}
```

---

## 📚 추가 정보

### 실시간 업데이트
- `standings` API: 경기 결과 변경 시 자동으로 총점과 순위 업데이트
- `futsal-standings` API: 풋살 경기 결과 변경 시 자동으로 리그 순위 업데이트

### 데이터베이스 트리거
- `match` 테이블 변경 시 자동으로 관련 순위 테이블 업데이트
- 풋살 경기만 리그 순위에 반영 (sport_id = 1)

### 성능 최적화
- 인덱스 설정으로 빠른 조회 지원
- Row Level Security (RLS) 정책 적용
- 효율적인 JOIN 쿼리 사용

---

## 🔄 API 버전 관리

현재 버전: **v1.5**

## API 엔드포인트에서의 match 파라미터

### 1. **경로 파라미터 (Path Parameter)**
- **`/api/sports2025/matches/:match_id`** - 특정 경기 조회
  - `match_id`: 경기 ID (숫자)

### 2. **쿼리 파라미터 (Query Parameters)**
- **`/api/sports2025/matches`** - 경기 목록 조회에서 사용되는 파라미터들:
  - `date`: 경기 날짜 필터
  - `sport_id`: 종목 ID 필터  
  - `sport`: 종목명 필터
  - `college_id`: 대학 ID 필터
  - `department_id`: 학과 ID 필터
  - `played`: 경기 완료 여부 필터
  - `rain`: 우천 취소 여부 필터
  - `page`: 페이지 번호 (기본값: 1)
  - `page_size`: 페이지 크기 (기본값: 20, 최대: 100)
  - `sort`: 정렬 기준 (기본값: 'date,start')
  - `order`: 정렬 순서 (기본값: 'asc')

### 3. **데이터베이스 테이블**
- `match` 테이블: 경기 정보를 저장하는 메인 테이블
- `participation` 테이블: 경기에 참여하는 팀 정보 (home/away)

### 4. **예시 사용법**
```bash
<code_block_to_apply_changes_from>
```

현재 `match` 파라미터는 주로 경기 관련 API에서 경기 ID나 경기 목록 필터링에 사용되고 있습니다.
