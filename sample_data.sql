-- =====================================================
-- 스포츠 대회 2025 예시 데이터 삽입 (기존 데이터 제외)
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 참고: 단과대학(college)과 학과(department) 데이터는 이미 존재합니다.
-- 풋살 리그전 순위 데이터만 업데이트합니다.

-- 2. 종목 데이터
INSERT INTO sport (id, name, name_eng, is_team_sport) VALUES
  (1, '풋살', 'futsal', true),
  (2, '농구', 'basketball', true),
  (3, '피구', 'dodgeball', true),
  (4, '족구', 'footvolley', true),
  (5, '탁구', 'table_tennis', false),
  (6, '줄다리기', 'tug_of_war', true),
  (7, 'LOL', 'league_of_legends', true),
  (8, 'FC온라인', 'fifa_online', true)
ON CONFLICT (id) DO NOTHING;

-- 3. 경기장 데이터
INSERT INTO venue (id, name, location_note) VALUES
  (1, '교내 풋살장', '체육관 1층'),
  (2, '교내 농구장', '체육관 2층'),
  (3, '교내 탁구장', '체육관 3층'),
  (4, '광운스퀘어', '교내 중앙 광장'),
  (5, '레드포스 광운대점', '교내 PC방')
ON CONFLICT (id) DO NOTHING;

-- 1. 풋살 리그전 순위 데이터 (A조 ~ G조)
INSERT INTO futsal_standings (department_id, group_name, matches, wins, draws, losses, goals_for, goals_against, goal_difference, points, rank, wildcard) VALUES
  -- A조
  (1, 'A조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (2, 'A조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (3, 'A조', 0, 0, 0, 0, 0, 0, 0, 0, 0, true),
  (4, 'A조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- B조
  (5, 'B조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (6, 'B조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (7, 'B조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (8, 'B조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- C조
  (9, 'C조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (10, 'C조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (11, 'C조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (12, 'C조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- D조
  (13, 'D조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (14, 'D조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (15, 'D조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (16, 'D조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- E조
  (17, 'E조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (18, 'E조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (19, 'E조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (20, 'E조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- F조
  (21, 'F조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (22, 'F조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (23, 'F조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (24, 'F조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  
  -- G조
  (25, 'G조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (26, 'G조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (27, 'G조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (28, 'G조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false),
  (29, 'G조', 0, 0, 0, 0, 0, 0, 0, 0, 0, false)
ON CONFLICT (department_id) DO NOTHING;

-- 4. 경기 데이터 (풋살 리그전 + 16강 토너먼트, 나머지 29강 토너먼트)
INSERT INTO match (id, match_date, period_start, sport_id, venue_id, is_played, rain_canceled) VALUES
  -- 8월 30일 경기들 (리그전 + 토너먼트 1라운드)
  (1, '2025-08-30', 1, 1, 1, false, false),   -- 풋살 리그전: A조 vs B조
  (2, '2025-08-30', 2, 1, 1, false, false),   -- 풋살 리그전: C조 vs D조
  (3, '2025-08-30', 3, 2, 2, false, false),   -- 농구 29강 1라운드
  (4, '2025-08-30', 4, 3, 2, false, false),   -- 피구 29강 1라운드
  (5, '2025-08-30', 5, 5, 3, false, false),   -- 탁구 29강 1라운드
  
  -- 8월 31일 경기들
  (6, '2025-08-31', 1, 1, 1, false, false),   -- 풋살 리그전: E조 vs F조
  (7, '2025-08-31', 2, 1, 1, false, false),   -- 풋살 리그전: G조 vs A조
  (8, '2025-08-31', 3, 2, 2, false, false),   -- 농구 29강 2라운드
  (9, '2025-08-31', 4, 4, 2, false, false),   -- 족구 29강 1라운드
  (10, '2025-08-31', 5, 6, 4, false, false),  -- 줄다리기 29강 1라운드
  
  -- 9월 1일 경기들
  (11, '2025-09-01', 1, 7, 5, false, false),  -- LOL 29강 1라운드
  (12, '2025-09-01', 2, 8, 5, false, false),  -- FC온라인 29강 1라운드
  (13, '2025-09-01', 3, 1, 1, false, false),  -- 풋살 리그전: B조 vs C조
  (14, '2025-09-01', 4, 1, 1, false, false),  -- 풋살 리그전: D조 vs E조
  
  -- 9월 2일 경기들
  (15, '2025-09-02', 1, 2, 2, false, false),  -- 농구 29강 3라운드
  (16, '2025-09-02', 2, 3, 2, false, false),  -- 피구 29강 2라운드
  (17, '2025-09-02', 3, 5, 3, false, false),  -- 탁구 29강 2라운드
  (18, '2025-09-02', 4, 4, 2, false, false),  -- 족구 29강 2라운드
  
  -- 9월 3일 경기들
  (19, '2025-09-03', 1, 6, 4, false, false),  -- 줄다리기 29강 2라운드
  (20, '2025-09-03', 2, 7, 5, false, false),  -- LOL 29강 2라운드
  (21, '2025-09-03', 3, 8, 5, false, false),  -- FC온라인 29강 2라운드
  (22, '2025-09-03', 4, 1, 1, false, false),  -- 풋살 리그전: F조 vs G조
  
  -- 9월 4일 경기들 (풋살 16강 토너먼트 시작)
  (23, '2025-09-04', 1, 1, 1, false, false),  -- 풋살 16강 1경기
  (24, '2025-09-04', 2, 1, 1, false, false),  -- 풋살 16강 2경기
  (25, '2025-09-04', 3, 1, 1, false, false),  -- 풋살 16강 3경기
  (26, '2025-09-04', 4, 1, 1, false, false),  -- 풋살 16강 4경기
  
  -- 9월 5일 경기들 (풋살 16강 계속 + 8강)
  (27, '2025-09-05', 1, 1, 1, false, false),  -- 풋살 16강 5경기
  (28, '2025-09-05', 2, 1, 1, false, false),  -- 풋살 16강 6경기
  (29, '2025-09-05', 3, 1, 1, false, false),  -- 풋살 16강 7경기
  (30, '2025-09-05', 4, 1, 1, false, false),  -- 풋살 16강 8경기
  (31, '2025-09-05', 5, 1, 1, false, false),  -- 풋살 8강 1경기
  (32, '2025-09-05', 6, 1, 1, false, false),  -- 풋살 8강 2경기
  (33, '2025-09-05', 7, 1, 1, false, false),  -- 풋살 8강 3경기
  (34, '2025-09-05', 8, 1, 1, false, false),  -- 풋살 8강 4경기
  
  -- 9월 6일 경기들 (풋살 4강 + 결승, 나머지 종목 결승)
  (35, '2025-09-06', 1, 1, 1, false, false),  -- 풋살 4강 1경기
  (36, '2025-09-06', 2, 1, 1, false, false),  -- 풋살 4강 2경기
  (37, '2025-09-06', 3, 1, 1, false, false),  -- 풋살 결승
  (38, '2025-09-06', 4, 2, 2, false, false),  -- 농구 결승
  (39, '2025-09-06', 5, 3, 2, false, false),  -- 피구 결승
  (40, '2025-09-06', 6, 5, 3, false, false),  -- 탁구 결승
  (41, '2025-09-06', 7, 6, 4, false, false),  -- 줄다리기 결승
  (42, '2025-09-06', 1, 7, 5, false, false),  -- LOL 결승 (1교시)
  (43, '2025-09-06', 2, 8, 5, false, false);  -- FC온라인 결승 (2교시)

-- 5. 참가 데이터 (풋살 리그전 + 16강 토너먼트, 나머지 29강 토너먼트)
INSERT INTO participation (match_id, department_id, side, score) VALUES
  -- 8월 30일 경기들 (리그전 + 토너먼트 1라운드)
  (1, 1, 'home', 0),    -- 풋살 리그전: A조 vs B조
  (1, 5, 'away', 0),
  (2, 9, 'home', 0),    -- 풋살 리그전: C조 vs D조
  (2, 13, 'away', 0),
  (3, 1, 'home', 0),    -- 농구 29강 1라운드: A조 vs B조
  (3, 5, 'away', 0),
  (4, 9, 'home', 0),    -- 피구 29강 1라운드: C조 vs D조
  (4, 13, 'away', 0),
  (5, 17, 'home', 0),   -- 탁구 29강 1라운드: E조 vs F조
  (5, 21, 'away', 0),
  
  -- 8월 31일 경기들
  (6, 17, 'home', 0),   -- 풋살 리그전: E조 vs F조
  (6, 21, 'away', 0),
  (7, 25, 'home', 0),   -- 풋살 리그전: G조 vs A조
  (7, 1, 'away', 0),
  (8, 2, 'home', 0),    -- 농구 29강 2라운드: A조 vs C조
  (8, 9, 'away', 0),
  (9, 14, 'home', 0),   -- 족구 29강 1라운드: D조 vs E조
  (9, 17, 'away', 0),
  (10, 22, 'home', 0),  -- 줄다리기 29강 1라운드: F조 vs G조
  (10, 25, 'away', 0),
  
  -- 9월 1일 경기들
  (11, 23, 'home', 0),  -- LOL 29강 1라운드: F조 vs G조
  (11, 26, 'away', 0),
  (12, 27, 'home', 0),  -- FC온라인 29강 1라운드: G조 vs A조
  (12, 2, 'away', 0),
  (13, 5, 'home', 0),   -- 풋살 리그전: B조 vs C조
  (13, 9, 'away', 0),
  (14, 13, 'home', 0),  -- 풋살 리그전: D조 vs E조
  (14, 17, 'away', 0),
  
  -- 9월 2일 경기들
  (15, 6, 'home', 0),   -- 농구 29강 3라운드: B조 vs D조
  (15, 13, 'away', 0),
  (16, 10, 'home', 0),  -- 피구 29강 2라운드: C조 vs E조
  (16, 17, 'away', 0),
  (17, 18, 'home', 0),  -- 탁구 29강 2라운드: E조 vs F조
  (17, 21, 'away', 0),
  (18, 15, 'home', 0),  -- 족구 29강 2라운드: D조 vs F조
  (18, 21, 'away', 0),
  
  -- 9월 3일 경기들
  (19, 23, 'home', 0),  -- 줄다리기 29강 2라운드: F조 vs G조
  (19, 25, 'away', 0),
  (20, 24, 'home', 0),  -- LOL 29강 2라운드: F조 vs G조
  (20, 26, 'away', 0),
  (21, 28, 'home', 0),  -- FC온라인 29강 2라운드: G조 vs A조
  (21, 3, 'away', 0),
  (22, 21, 'home', 0),  -- 풋살 리그전: F조 vs G조
  (22, 25, 'away', 0),
  
  -- 9월 4일 경기들 (풋살 16강 토너먼트 시작)
  (23, 1, 'home', 0),   -- 풋살 16강 1경기: A조 vs C조
  (23, 9, 'away', 0),
  (24, 5, 'home', 0),   -- 풋살 16강 2경기: B조 vs D조
  (24, 13, 'away', 0),
  (25, 17, 'home', 0),  -- 풋살 16강 3경기: E조 vs G조
  (25, 25, 'away', 0),
  (26, 2, 'home', 0),   -- 풋살 16강 4경기: A조 vs F조
  (26, 21, 'away', 0),
  
  -- 9월 5일 경기들 (풋살 16강 계속 + 8강)
  (27, 3, 'home', 0),   -- 풋살 16강 5경기: A조 vs E조
  (27, 17, 'away', 0),
  (28, 6, 'home', 0),   -- 풋살 16강 6경기: B조 vs F조
  (28, 22, 'away', 0),
  (29, 7, 'home', 0),   -- 풋살 16강 7경기: B조 vs G조
  (29, 26, 'away', 0),
  (30, 4, 'home', 0),   -- 풋살 16강 8경기: A조 vs D조
  (30, 14, 'away', 0),
  (31, 1, 'home', 0),   -- 풋살 8강 1경기: 16강 승자들
  (31, 5, 'away', 0),
  (32, 9, 'home', 0),   -- 풋살 8강 2경기: 16강 승자들
  (32, 13, 'away', 0),
  (33, 17, 'home', 0),  -- 풋살 8강 3경기: 16강 승자들
  (33, 21, 'away', 0),
  (34, 25, 'home', 0),  -- 풋살 8강 4경기: 16강 승자들
  (34, 2, 'away', 0),
  
  -- 9월 6일 경기들 (풋살 4강 + 결승, 나머지 종목 결승)
  (35, 1, 'home', 0),   -- 풋살 4강 1경기: 8강 승자들
  (35, 9, 'away', 0),
  (36, 17, 'home', 0),  -- 풋살 4강 2경기: 8강 승자들
  (36, 25, 'away', 0),
  (37, 1, 'home', 0),   -- 풋살 결승: 4강 승자들
  (37, 17, 'away', 0),
  (38, 1, 'home', 0),   -- 농구 결승: 29강 승자들
  (38, 5, 'away', 0),
  (39, 9, 'home', 0),   -- 피구 결승: 29강 승자들
  (39, 13, 'away', 0),
  (40, 17, 'home', 0),  -- 탁구 결승: 29강 승자들
  (40, 21, 'away', 0),
  (41, 22, 'home', 0),  -- 줄다리기 결승: 29강 승자들
  (41, 25, 'away', 0),
  (42, 23, 'home', 0),  -- LOL 결승: 29강 승자들
  (42, 26, 'away', 0),
  (43, 27, 'home', 0),  -- FC온라인 결승: 29강 승자들
  (43, 2, 'away', 0);

-- 6. 예측 데이터 (예시)
INSERT INTO predictions (id, user_id, match_id, predicted_winner, predicted_score_home, predicted_score_away, created_at) VALUES
  (1, 'user123', 1, 'home', 3, 1, NOW()),
  (2, 'user456', 1, 'away', 1, 2, NOW()),
  (3, 'user789', 2, 'home', 2, 0, NOW()),
  (4, 'user123', 3, 'home', 85, 72, NOW()),
  (5, 'user456', 4, 'away', 15, 18, NOW()),
  (6, 'user789', 5, 'home', 11, 9, NOW()),
  (7, 'user123', 6, 'home', 2, 1, NOW()),
  (8, 'user456', 7, 'home', 78, 65, NOW()),
  (9, 'user789', 8, 'away', 12, 15, NOW()),
  (10, 'user123', 9, 'home', 1, 0, NOW()),
  (11, 'user456', 10, 'away', 0, 1, NOW()),
  (12, 'user789', 11, 'home', 2, 1, NOW()),
  (13, 'user123', 12, 'home', 1, 0, NOW());

-- 7. 공지사항 데이터 (예시)
INSERT INTO announcements (id, title, content, author, created_at, updated_at) VALUES
  (1, '2025년 스포츠 대회 일정 안내', '2025년 8월 30일부터 9월 5일까지 진행되는 스포츠 대회 일정을 안내드립니다.', '학생회', NOW(), NOW()),
  (2, '풋살 리그전 조편성 결과', 'A조, B조, C조, D조, E조, F조, G조로 나누어 진행되는 풋살 리그전 조편성 결과입니다.', '체육부', NOW(), NOW()),
  (3, '우천 시 경기 연기 안내', '우천 시 경기는 다음 날로 연기될 수 있습니다. 자세한 사항은 당일 오전에 공지됩니다.', '운영위원회', NOW(), NOW()),
  (4, 'e스포츠 경기장 이용 안내', '레드포스 광운대점에서 진행되는 LOL, FC온라인 경기장 이용 방법을 안내드립니다.', 'e스포츠부', NOW(), NOW()),
  (5, '경기 결과 실시간 업데이트', '모든 경기 결과는 실시간으로 업데이트되며, 순위는 자동으로 계산됩니다.', '기술지원팀', NOW(), NOW());

-- 8. 회의록 데이터 (예시)
INSERT INTO minutes (id, title, content, meeting_date, attendees, created_at, updated_at) VALUES
  (1, '2025년 스포츠 대회 기획 회의', '스포츠 대회 종목 선정 및 일정 조율에 대한 논의', '2025-07-15', '학생회장, 체육부장, 각종목 담당자', NOW(), NOW()),
  (2, '경기장 배정 및 운영 방안', '각 종목별 경기장 배정과 운영 방안에 대한 논의', '2025-07-20', '운영위원회, 체육관 관리자', NOW(), NOW()),
  (3, 'e스포츠 경기 운영 협의', 'PC방과의 협의를 통한 e스포츠 경기 운영 방안', '2025-07-25', 'e스포츠부, 레드포스 매니저', NOW(), NOW()),
  (4, '최종 점검 및 준비상황', '대회 전 최종 점검 및 준비상황 점검', '2025-08-25', '전체 운영위원회', NOW(), NOW());

-- =====================================================
-- 데이터 확인 쿼리
-- =====================================================

-- 1. 풋살 리그전 조별 팀 수 확인 (A조 ~ G조)
SELECT 
  group_name,
  COUNT(*) as team_count
FROM futsal_standings
GROUP BY group_name
ORDER BY group_name;

-- 2. 종목별 팀 스포츠 여부 확인
SELECT 
  name,
  name_eng,
  CASE WHEN is_team_sport THEN '팀 스포츠' ELSE '개인 스포츠' END as sport_type
FROM sport
ORDER BY id;

-- 3. 경기장별 종목 매핑 확인
SELECT 
  v.name as venue_name,
  v.location_note,
  STRING_AGG(s.name, ', ') as available_sports
FROM venue v
LEFT JOIN sport s ON (
  (v.name = '교내 풋살장' AND s.name = '풋살') OR
  (v.name = '교내 농구장' AND s.name IN ('농구', '피구', '족구')) OR
  (v.name = '교내 탁구장' AND s.name = '탁구') OR
  (v.name = '광운스퀘어' AND s.name = '줄다리기') OR
  (v.name = '레드포스 광운대점' AND s.name IN ('LOL', 'FC온라인'))
)
GROUP BY v.id, v.name, v.location_note
ORDER BY v.id;

-- 4. 풋살 리그전 전체 팀 수 확인
SELECT 
  COUNT(*) as total_teams,
  COUNT(DISTINCT group_name) as total_groups
FROM futsal_standings;

-- 5. 전체 데이터 요약 (새로 추가된 테이블만)
SELECT 
  'sport' as table_name,
  COUNT(*) as record_count
FROM sport
UNION ALL
SELECT 
  'venue' as table_name,
  COUNT(*) as record_count
FROM venue
UNION ALL
SELECT 
  'futsal_standings' as table_name,
  COUNT(*) as record_count
FROM futsal_standings
UNION ALL
SELECT 
  'match' as table_name,
  COUNT(*) as record_count
FROM match
UNION ALL
SELECT 
  'participation' as table_name,
  COUNT(*) as record_count
FROM participation
UNION ALL
SELECT 
  'predictions' as table_name,
  COUNT(*) as record_count
FROM predictions
UNION ALL
SELECT 
  'announcements' as table_name,
  COUNT(*) as record_count
FROM announcements
UNION ALL
SELECT 
  'minutes' as table_name,
  COUNT(*) as record_count
FROM minutes
ORDER BY table_name;
