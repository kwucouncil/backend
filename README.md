# KWU 학생회 홈페이지 Backend

광운대학교 학생회 홈페이지의 백엔드 API 서버입니다.

## 🚀 주요 기능

- **공지사항 관리**: CRUD API
- **파일 업로드**: 이미지 및 문서 파일 업로드
- **회의록 관리**: 회의록 CRUD API
- **승부예측 관리**: 학생 승부예측 제출 및 관리 API
- **스포츠 대회 관리**: 경기 일정, 순위, 학과/종목 정보 API
- **시스템 검증**: 시스템 상태 확인

## 📁 프로젝트 구조

```
backend-main/
├── api/
│   ├── index.js          # 메인 서버 및 라우터 연결
│   ├── announcements.js  # 공지사항 API
│   ├── upload.js         # 파일 업로드 API
│   ├── minutes.js        # 회의록 API
│   ├── predictions.js    # 승부예측 API
│   ├── sports2025.js     # 스포츠 대회 API
│   └── verifySystem.js   # 시스템 검증 API
├── lib/
│   └── supabaseClient.js # Supabase 클라이언트
├── validators/
│   ├── announcement.js    # 공지사항 유효성 검사
│   ├── minutes.js        # 회의록 유효성 검사
│   └── prediction.js     # 승부예측 유효성 검사
├── supabase_setup.sql     # 데이터베이스 테이블 생성 스크립트
├── PREDICTIONS_API_README.md # 승부예측 API 상세 문서
├── SPORTS2025_API_SPEC.md # 스포츠 대회 API 명세서
└── package.json
```

### 📚 문서
- **README.md**: 프로젝트 전체 개요 및 기본 사용법
- **PREDICTIONS_API_README.md**: 승부예측 API 상세 명세 및 사용법

## 🛠️ 기술 스택

- **Node.js** + **Express.js**
- **Supabase** (PostgreSQL + Storage)
- **Multer** (파일 업로드)
- **CORS** (Cross-Origin Resource Sharing)

## 📋 API 스펙

### 1. 공지사항 API (`/announcements`)

#### GET /announcements
- **Query Parameters**: `page`, `limit`, `q` (제목 검색)
- **응답**: `{ page, limit, total, items }`

#### GET /announcements/:id
- **응답**: 단일 공지사항 정보

#### POST /announcements
- **Body**: `{ title, content, image, published_at }`

### 2. 파일 업로드 API (`/upload`)

#### POST /upload
- **Body**: `file` (multipart/form-data)
- **응답**: `{ url, path }`
- **설명**: 기존 STORAGE_BUCKET 사용 또는 MINUTES_BUCKET 환경변수로 별도 버킷 지정 가능

### 3. 회의록 API (`/minutes`)

#### GET /minutes
- **Query Parameters**:
  - `page` (기본값: 1, 최소값: 1)
  - `limit` (기본값: 10, 범위: 1~50)
  - `q` (제목 검색, 부분 일치)
- **응답**: `{ page, limit, total, items }`
- **정렬**: 최신 `date` desc, `created_at` desc

**응답 예시**:
```json
{
  "page": 1,
  "limit": 10,
  "total": 25,
  "items": [
    {
      "id": 1,
      "title": "2025학년도 제1차 학생대표자회의",
      "file_url": "https://.../storage/v1/object/public/minutes/2025-03-02.pdf",
      "date": "2025-03-02",
      "created_at": "2025-03-02T10:00:00Z"
    }
  ]
}
```

#### GET /minutes/:id
- **응답**: 단일 회의록 정보
- **404**: 회의록을 찾을 수 없을 때

**응답 예시**:
```json
{
  "id": 1,
  "title": "2025학년도 제1차 학생대표자회의",
  "file_url": "https://.../storage/v1/object/public/minutes/2025-03-02.pdf",
  "date": "2025-03-02",
      "created_at": "2025-03-02T10:00:00Z"
}
```

#### POST /minutes
- **Body**: `{ title, file_url, date }`
- **유효성 검사**: 
  - `title`: non-empty
  - `file_url`: non-empty URL string
  - `date`: YYYY-MM-DD 형식 유효성
- **응답**: 생성된 회의록 정보

**요청 예시**:
```json
{
  "title": "2025학년도 제1차 학생대표자회의",
  "file_url": "https://.../storage/v1/object/public/minutes/2025-03-02.pdf",
  "date": "2025-03-02"
}
```

### 4. 승부예측 API (`/predictions`)

#### POST /predictions
- **Body**: `{ name, student_id, phone, first_place, second_place, third_place }`
- **유효성 검사**: 
  - `name`: 필수, 공백 제거 후 1자 이상
  - `student_id`: 필수, 정확히 10자리 숫자, 중복 제출 불가
  - `phone`: 필수, 전화번호 형식 (010-XXXX-XXXX)
  - `first_place`, `second_place`, `third_place`: 필수, 모두 다른 학과
- **응답**: 생성된 승부예측 정보

**요청 예시**:
```json
{
  "name": "홍길동",
  "student_id": "2024200072",
  "phone": "010-1234-5678",
  "first_place": "컴퓨터공학과",
  "second_place": "전자공학과",
  "third_place": "기계공학과"
}
```

#### GET /predictions (관리자 전용)
- **Headers**: `X-API-Key` (관리자 API 키)
- **Query Parameters**: `page`, `limit`
- **응답**: 승부예측 목록 (페이지네이션)

#### GET /predictions/:id (관리자 전용)
- **Headers**: `X-API-Key` (관리자 API 키)
- **응답**: 단일 승부예측 정보

**상세 문서**: [PREDICTIONS_API_README.md](./PREDICTIONS_API_README.md)

## 🔧 환경 설정

### 필수 환경변수
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
STORAGE_BUCKET=announcements
ADMIN_API_KEY=your_secure_admin_api_key  # 승부예측 관리자 API 키
```

### 선택적 환경변수
```env
MINUTES_BUCKET=minutes  # 회의록 전용 파일 버킷 (선택사항)
PORT=3000              # 서버 포트 (기본값: 3000)
```

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 또는 직접 실행
node api/index.js
```

## 📊 데이터베이스 스키마

### minutes 테이블
```sql
CREATE TABLE minutes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### predictions 테이블
```sql
CREATE TABLE predictions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  student_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  first_place TEXT NOT NULL,
  second_place TEXT NOT NULL,
  third_place TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**전체 스키마**: [supabase_setup.sql](./supabase_setup.sql) 파일 참조

## 🔒 CORS 설정

허용된 도메인:
- `https://kwucouncil.github.io`
- `http://localhost:8080`
- `https://www.kwu-studentcouncil52.com`

## 🔐 보안

- **승부예측 조회**: 관리자 API 키 인증 필요 (`X-API-Key` 헤더)
- **API 키 관리**: 환경변수로 관리, 정기적 변경 권장
- **데이터 보호**: 개인정보는 관리자만 조회 가능

## 📝 에러 처리

모든 API는 에러 발생 시 다음 형식으로 응답:
```json
{
  "message": "에러 메시지",
  "error": "상세 에러 정보"
}
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
