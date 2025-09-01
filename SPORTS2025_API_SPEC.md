# 스포츠 대회 2025 API 명세서

## 기본 정보

- **Base URL**: `/api/sports2025`
- **응답 포맷**: `application/json; charset=utf-8`
- **타임존**: `Asia/Seoul`
- **날짜 표기**: `YYYY-MM-DD` (프론트에서 `YYYY.MM.DD`로 포맷 가능)

---

## 1. 경기 일정 목록 조회

### 엔드포인트
```
GET /api/sports2025/matches
```

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `date` | string | x | 특정 날짜 (YYYY-MM-DD) | `2025-08-30` |
| `sport_id` | int | x | 종목 ID | `1` |
| `sport` | string | x | 종목명 | `풋살` |
| `college_id` | int | x | 단과대학 ID (참가 학과 중 하나가 소속) | `4` |
| `department_id` | int | x | 특정 학과가 참여한 경기 | `10` |
| `played` | bool | x | 경기 진행/종료 여부 | `true` |
| `rain` | bool | x | 우천 취소 여부 | `false` |
| `page` | int | x | 페이지 번호 (기본값: 1) | `1` |
| `page_size` | int | x | 페이지 크기 (기본값: 20, 최대: 100) | `20` |
| `sort` | string | x | 정렬 필드 (기본값: date,start) | `date,start` |
| `order` | string | x | 정렬 순서 (asc\|desc) | `asc` |

### 응답 스키마

```json
{
  "page": 1,
  "page_size": 20,
  "total": 50,
  "items": [
    {
      "date": "2025-08-30",
      "start": 2,
      "place": "풋살장",
      "sport": "풋살",
      "team1": {
        "id": 10,
        "name": "소프트웨어학부",
        "name_eng": "software",
        "logo": "https://example.com/logo1.png",
        "score": 6
      },
      "team2": {
        "id": 21,
        "name": "건축공학과",
        "name_eng": "architecture",
        "logo": "https://example.com/logo2.png",
        "score": 4
      },
      "rain": false,
      "result": true,
      "win": "team1"
    }
  ]
}
```

### 예시 요청

```bash
# 8월 30일 풋살 일정
GET /api/sports2025/matches?date=2025-08-30&sport=풋살

# 소프트웨어학부 경기가 포함된 일정
GET /api/sports2025/matches?department_id=10

# 오늘 진행된 경기만 조회
GET /api/sports2025/matches?played=true&date=2025-08-30
```

---

## 2. 단일 경기 상세 조회

### 엔드포인트
```
GET /api/sports2025/matches/{match_id}
```

### 경로 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `match_id` | int | ✅ | 경기 ID |

### 응답 스키마

```json
{
  "data": {
    "date": "2025-08-30",
    "start": 2,
    "place": "풋살장",
    "sport": "풋살",
    "team1": {
      "id": 10,
      "name": "소프트웨어학부",
      "name_eng": "software",
      "logo": "https://example.com/logo1.png",
      "score": 6
    },
    "team2": {
      "id": 21,
      "name": "건축공학과",
      "name_eng": "architecture",
      "logo": "https://example.com/logo2.png",
      "score": 4
    },
    "rain": false,
    "result": true,
    "win": "team1"
  }
}
```

### 예시 요청

```bash
GET /api/sports2025/matches/123
```

---

## 3. 순위 조회

### 엔드포인트
```
GET /api/sports2025/standings
```

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `sport_id` | int | ❌ | 종목별 순위 (미지정 시 종합 순위) | `1` |
| `limit` | int | ❌ | 조회 개수 (기본값: 20) | `10` |

### 응답 스키마

```json
{
  "sport_id": null,
  "limit": 10,
  "standings": [
    {
      "rank": 1,
      "name": "소프트웨어학부",
      "name_eng": "software",
      "logo": "https://example.com/logo1.png",
      "score": 250
    },
    {
      "rank": 2,
      "name": "건축공학과",
      "name_eng": "architecture",
      "logo": "https://example.com/logo2.png",
      "score": 220
    }
  ]
}
```

### 예시 요청

```bash
# 종합 순위 Top 10
GET /api/sports2025/standings?limit=10

# 풋살 종목별 순위
GET /api/sports2025/standings?sport_id=1&limit=20
```

---

## 4. 학과 목록 조회

### 엔드포인트
```
GET /api/sports2025/departments
```

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `college_id` | int | ❌ | 단과대학별 필터 | `4` |
| `search` | string | ❌ | 한/영 이름 부분검색 | `소프트` |

### 응답 스키마

```json
{
  "college_id": 4,
  "search": null,
  "departments": [
    {
      "id": 10,
      "name": "소프트웨어학부",
      "name_en": "software",
      "logo": "https://example.com/logo1.png",
      "college_id": 4,
      "college": {
        "name": "공과대학"
      }
    }
  ]
}
```

### 예시 요청

```bash
# 단과별 학과
GET /api/sports2025/departments?college_id=4

# 학과명 검색
GET /api/sports2025/departments?search=소프트
```

---

## 5. 단과대학 목록 조회

### 엔드포인트
```
GET /api/sports2025/colleges
```

### 응답 스키마

```json
{
  "colleges": [
    {
      "id": 1,
      "name": "인문대학",
      "name_en": "humanities"
    },
    {
      "id": 4,
      "name": "공과대학",
      "name_en": "engineering"
    }
  ]
}
```

### 예시 요청

```bash
GET /api/sports2025/colleges
```

---

## 6. 종목 목록 조회

### 엔드포인트
```
GET /api/sports2025/sports
```

### 응답 스키마

```json
{
  "sports": [
    {
      "id": 1,
      "name": "풋살",
      "name_eng": "futsal",
      "is_team_sport": true
    },
    {
      "id": 2,
      "name": "농구",
      "name_eng": "basketball",
      "is_team_sport": true
    }
  ]
}
```

### 예시 요청

```bash
GET /api/sports2025/sports
```

---

## 7. 경기장 목록 조회

### 엔드포인트
```
GET /api/sports2025/venues
```

### 응답 스키마

```json
{
  "venues": [
    {
      "id": 1,
      "name": "풋살장",
      "location_note": "체육관 1층"
    },
    {
      "id": 2,
      "name": "농구장",
      "location_note": "체육관 2층"
    }
  ]
}
```

### 예시 요청

```bash
GET /api/sports2025/venues
```

---

## 에러 응답

### 공통 에러 스키마

```json
{
  "message": "에러 메시지",
  "error": "상세 에러 정보"
}
```

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| `200` | 성공 |
| `400` | 잘못된 요청 |
| `404` | 리소스를 찾을 수 없음 |
| `500` | 서버 내부 오류 |

### 예시 에러 응답

```json
{
  "message": "경기를 찾을 수 없습니다.",
  "error": "PGRST116"
}
```

---

## 사용 예시

### 1. 오늘 경기 일정 조회
```bash
curl "https://api.example.com/api/sports2025/matches?date=2025-08-30"
```

### 2. 특정 학과 경기 조회
```bash
curl "https://api.example.com/api/sports2025/matches?department_id=10&played=true"
```

### 3. 종합 순위 Top 5
```bash
curl "https://api.example.com/api/sports2025/standings?limit=5"
```

### 4. 공과대학 학과 목록
```bash
curl "https://api.example.com/api/sports2025/departments?college_id=4"
```

---

## 주의사항

1. **페이지네이션**: `page_size`는 최대 100개로 제한됩니다.
2. **정렬**: `sort` 파라미터는 쉼표로 구분된 다중 필드를 지원합니다.
3. **검색**: `search` 파라미터는 한글과 영문 이름 모두에서 검색합니다.
4. **점수**: 경기 결과가 없는 경우 `score`는 0으로 표시됩니다.
5. **승리 판정**: 경기가 진행되지 않았거나 무승부인 경우 `win`은 `null`입니다.
