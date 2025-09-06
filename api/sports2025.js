// api/sports2025.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');


// Google Drive 공유 URL → googleusercontent 직링크로 변환
function toEmbedUrl(url) {
  if (!url) return '';

  // 이미 googleusercontent 링크면 그대로 사용
  if (/^https?:\/\/lh\d+\.googleusercontent\.com\/d\//i.test(url)) {
    return url;
  }

  // 여러 형태의 Drive 링크에서 파일 ID 추출
  //  - https://drive.google.com/file/d/{ID}/view?...
  //  - https://drive.google.com/open?id={ID}
  //  - https://drive.google.com/uc?id={ID}&export=...
  //  - ...?id={ID}
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i
  ];

  let id = null;
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) { id = m[1]; break; }
  }

  // URL 자체가 ID만 들어온 경우도 허용 (선택)
  if (!id && /^[a-zA-Z0-9_-]{10,}$/.test(url)) {
    id = url;
  }

  if (!id) {
    // 드라이브 링크가 아니면 원본 그대로 반환
    return url;
  }

  // googleusercontent 직링크로 변환
  // 필요하면 원본 해상도 유지용 파라미터(=s0)나 리사이즈(=w1600 등) 붙여도 됨.
  // return `https://lh3.googleusercontent.com/d/${id}=s0`;
  return `https://lh3.googleusercontent.com/d/${id}`;
}



const router = express.Router();

const corsMiddleware = cors({
  origin: (origin, cb) => {
    const allow = [
      'https://kwucouncil.github.io',
      'http://localhost:8080',
      'https://www.kwu-studentcouncil52.com',
    ];
    if (!origin || allow.includes(origin)) return cb(null, true);
    cb(new Error('CORS 정책 위반'));
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
});

// CORS preflight 처리
router.options('*', corsMiddleware);

/**
 * 경기 일정 목록 조회
 * GET /api/sports2025/matches
 */
router.get('/matches', corsMiddleware, async (req, res) => {
  try {
    const {
      date,
      sport_id,
      sport,
      college_id,
      department_id,
      played,
      rain,
      page = 1,
      page_size = 20,
      sort = 'date,start',
      order = 'asc'
    } = req.query;

    // 페이지네이션
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(page_size, 10) || 20, 1), 100);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // ⚠️ 포인트: 필터용 participation과 조회용 participation을 분리
    let query = supabase
      .from('match')
      .select(`
        id,
        match_date,
        period_start,
        is_played,
        rain_canceled,
        updated_at,
        sport:sport_id(name, name_eng, is_team_sport),
        venue:venue_id(name, location_note),

        -- 필터 전용 (INNER JOIN)
        filter_participation:participation!inner(
          department:department(
            id,
            name,
            name_eng,
            logo_url,
            college:college(
              id,
              name,
              name_eng
            )
          ),
          side,
          score
        ),

        -- 응답용: 같은 경기의 모든 팀을 가져오기
        participations:participation(
          side,
          score,
          department:department(
            id,
            name,
            name_eng,
            logo_url,
            college:college(
              id,
              name,
              name_eng
            )
          )
        )
      `, { count: 'exact' });

    // 기본 정렬(교시 오름차순)
    query = query.order('match_date', { ascending: true })
                 .order('period_start', { ascending: true });

    // 필터 적용
    if (date) {
      query = query.eq('match_date', date);
    }

    if (sport_id) {
      query = query.eq('sport_id', parseInt(sport_id, 10));
    } else if (sport) {
      // 관계 필드에 대한 필터
      query = query.eq('sport.name', sport);
    }

    if (typeof played !== 'undefined') {
      query = query.eq('is_played', String(played) === 'true');
    }

    if (typeof rain !== 'undefined') {
      query = query.eq('rain_canceled', String(rain) === 'true');
    }

    // ✅ 중요한 부분: 학과/단과대 필터는 "filter_participation"에 건다
    if (department_id) {
      query = query.eq('filter_participation.department.id', parseInt(department_id, 10));
    }
    if (college_id) {
      query = query.eq('filter_participation.department.college.id', parseInt(college_id, 10));
    }

    // 추가 정렬 옵션 처리 (요청 파라미터로 커스텀 정렬 허용)
    const sortFields = String(sort).split(',').map(s => s.trim()).filter(Boolean);
    const orderFields = String(order).split(',').map(s => s.trim().toLowerCase());
    const fieldMapping = { date: 'match_date', start: 'period_start' };

    sortFields.forEach((field, i) => {
      const dbField = fieldMapping[field] || field;
      const asc = (orderFields[i] || 'asc') === 'asc';
      query = query.order(dbField, { ascending: asc });
    });

    // 페이지네이션
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    // 중복 제거(INNER JOIN으로 인해 동일 match가 중복될 수 있음)
    const uniq = new Map();
    (data || []).forEach(row => {
      if (!uniq.has(row.id)) uniq.set(row.id, row);
    });
    const rows = Array.from(uniq.values());

    // 응답 변환: team1=home, team2=away
    const items = rows.map(match => {
      const teams = (match.participations || [])
        .filter(p => p?.department?.id)
        .map(p => ({
          side: p.side,
          score: p.score ?? 0,
          id: p.department.id,
          name: p.department.name || '',
          name_eng: p.department.name_eng || '',
          logo: toEmbedUrl(p.department.logo_url || ''),
          logo_raw: p.department.logo_url || '',
        }));

      const home = teams.find(t => t.side === 'home') || { id: null, name: '', name_eng: '', logo: '', logo_raw: '', score: 0 };
      const away = teams.find(t => t.side === 'away') || { id: null, name: '', name_eng: '', logo: '', logo_raw: '', score: 0 };

      let win = null;
      if (match.is_played && home.id && away.id && home.score !== away.score) {
        win = home.score > away.score ? 'team1' : 'team2';
      }

      return {
        date: match.match_date,
        start: match.period_start,
        place: match.venue?.name || '',
        sport: match.sport?.name || '',
        team1: { id: home.id, name: home.name, name_eng: home.name_eng, logo: home.logo, logo_raw: home.logo_raw, score: home.score },
        team2: { id: away.id, name: away.name, name_eng: away.name_eng, logo: away.logo, logo_raw: away.logo_raw, score: away.score },
        rain: !!match.rain_canceled,
        result: !!match.is_played,
        win
      };
    });

    res.json({
      page: pageNum,
      page_size: pageSize,
      total: count || 0,
      items
    });

  } catch (err) {
    console.error('경기 일정 조회 오류:', err);
    res.status(500).json({
      message: '서버 오류',
      error: err.message
    });
  }
});


/**
 * 단일 경기 상세 조회
 * GET /api/sports2025/matches/{match_id}
 */
router.get('/matches/:match_id', corsMiddleware, async (req, res) => {
  try {
    const { match_id } = req.params;

    const { data, error } = await supabase
      .from('match')
      .select(`
        id,
        match_date,
        period_start,
        is_played,
        rain_canceled,
        updated_at,
        sport:sport_id(name, name_eng, is_team_sport),
        venue:venue_id(name, location_note),
        participation(
          side,
          score,
          department:department(
            id,
            name,
            name_eng,
            logo_url,
            college:college(id, name, name_eng)
          )
        )
      `)
      .eq('id', match_id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
    }
    if (error) throw error;

    const teams = (data.participation || [])
      .filter(p => p?.department?.id)
      .map(p => ({
        side: p.side,
        score: p.score ?? 0,
        id: p.department.id,
        name: p.department.name || '',
        name_eng: p.department.name_eng || '',
        logo: toEmbedUrl(p.department.logo_url || ''),
        logo_raw: p.department.logo_url || '',
      }));

    const home = teams.find(t => t.side === 'home') || { id: null, name: '', name_eng: '', logo: '', logo_raw: '', score: 0 };
    const away = teams.find(t => t.side === 'away') || { id: null, name: '', name_eng: '', logo: '', logo_raw: '', score: 0 };

    let win = null;
    if (data.is_played && home.id && away.id && home.score !== away.score) {
      win = home.score > away.score ? 'team1' : 'team2';
    }

    const transformedData = {
      date: data.match_date,
      start: data.period_start,
      place: data.venue?.name || '',
      sport: data.sport?.name || '',
      team1: { id: home.id, name: home.name, name_eng: home.name_eng, logo: home.logo, logo_raw: home.logo_raw, score: home.score },
      team2: { id: away.id, name: away.name, name_eng: away.name_eng, logo: away.logo, logo_raw: away.logo_raw, score: away.score },
      rain: !!data.rain_canceled,
      result: !!data.is_played,
      win
    };

    res.json({ data: transformedData });

  } catch (err) {
    console.error('경기 상세 조회 오류:', err);
    res.status(500).json({
      message: '서버 오류',
      error: err.message
    });
  }
});


/**
 * 순위 조회 (종목별 또는 종합)
 * GET /api/sports2025/standings
 */
router.get('/standings', corsMiddleware, async (req, res) => {
  try {
    const { sport_id } = req.query;

    // department에서 점수 가져오기
    let query = supabase
      .from('department')
      .select('id, name, name_eng, logo_url, score, updated_at');

    // 특정 종목만 필터링하고 싶으면 department <-> sport 매핑 필요
    // (지금 스키마엔 department가 sport_id 직접 안 갖고 있을 수도 있음)
    // sport_id 조건은 participation join을 써야 하지만,
    // 요청하신 건 department.score 기준이므로 일단 무시하거나 전체 출력
    
    const { data, error } = await query;

    if (error) throw error;

    // 최신 업데이트 시간 추적
    let latestUpdateTime = null;
    (data || []).forEach(dept => {
      if (dept.updated_at) {
        const updateTime = new Date(dept.updated_at);
        if (!latestUpdateTime || updateTime > latestUpdateTime) {
          latestUpdateTime = updateTime;
        }
      }
    });

    // 점수순으로 정렬
    const sortedStandings = (data || []).sort((a, b) => (b.score || 0) - (a.score || 0));

    // 순위 데이터 변환
    const transformedStandings = sortedStandings.map((dept, index) => ({
      rank: index + 1,
      name: dept.name || '',
      name_eng: dept.name_eng || '',
      logo: toEmbedUrl(dept.logo_url || ''),
      logo_raw: dept.logo_url || '',
      score: dept.score || 0
    }));

    // 한국 시간으로 포맷팅
    const formatKoreanTime = (date) => {
      if (!date) return null;
      const koreanTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      const year = koreanTime.getFullYear();
      const month = koreanTime.getMonth() + 1;
      const day = koreanTime.getDate();
      const hour = koreanTime.getHours();
      const ampm = hour < 12 ? '오전' : '오후';
      const displayHour = hour < 12 ? hour : hour - 12;
      return `${year}년 ${month.toString().padStart(2, '0')}월 ${day.toString().padStart(2, '0')}일 ${ampm} ${displayHour}시 기준`;
    };

    res.json({
      sport_id: sport_id ? parseInt(sport_id) : null,
      updated_at: latestUpdateTime ? formatKoreanTime(latestUpdateTime) : null,
      standings: transformedStandings
    });

  } catch (err) {
    console.error('순위 조회 오류:', err);
    res.status(500).json({
      message: '서버 오류',
      error: err.message
    });
  }
});


/**
 * 학과 목록 조회
 * GET /api/sports2025/departments
 */
// GET /api/sports2025/departments
router.get('/departments', corsMiddleware, async (req, res) => {
  try {
    const { college_id, search, embed } = req.query;

    let query = supabase
      .from('department')
      .select(`
        *,
        college:college(name, name_eng)
      `)
      .order('name', { ascending: true });

    if (college_id) {
      query = query.eq('college_id', parseInt(college_id, 10));
    }

    if (search) {
      // name 또는 name_eng 부분 일치 (대소문자 무시)
      query = query.or(`name.ilike.%${search}%,name_eng.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const useEmbedOnLogoField =
      String(embed).toLowerCase() === 'true' || String(embed) === '1';

    // 임베드 URL 필드 추가 (+ 필요 시 logo_url 자체도 임베드로 교체)
    const departments = (data || []).map((d) => {
      const embedUrl = toEmbedUrl(d.logo_url || '');
      return useEmbedOnLogoField
        ? {
            ...d,
            logo_url: embedUrl,          // 요청 시 원본 필드도 임베드로 교체
            logo_url_embed: embedUrl,    // 항상 별도 임베드 필드 제공
          }
        : {
            ...d,
            logo_url_embed: embedUrl,    // 기본은 원본 유지 + 임베드 추가
          };
    });

    res.json({
      college_id: college_id ? parseInt(college_id, 10) : null,
      search: search || null,
      departments
    });
  } catch (err) {
    console.error('학과 목록 조회 오류:', err);
    res.status(500).json({
      message: '서버 오류',
      error: err.message
    });
  }
});


/**
 * 단과대학 목록 조회
 * GET /api/sports2025/colleges
 */
router.get('/colleges', corsMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('college')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({ colleges: data || [] });

  } catch (err) {
    console.error('단과대학 목록 조회 오류:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

/**
 * 종목 목록 조회
 * GET /api/sports2025/sports
 */
router.get('/sports', corsMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sport')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({ sports: data || [] });

  } catch (err) {
    console.error('종목 목록 조회 오류:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

/**
 * 풋살 리그전 순위 조회
 * GET /api/sports2025/futsal-standings
 */
router.get('/futsal-standings', corsMiddleware, async (req, res) => {
  try {
    // futsal_standings 테이블에서 데이터 조회
    let query = supabase
      .from('futsal_standings')
      .select(`
        *,
        department:department(id, name, name_eng, logo_url)
      `)
      .order('group_name', { ascending: true })
      .order('points', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // 그룹별로 정렬
    const groupedStandings = {};
    (data || []).forEach(standing => {
      const groupName = standing.group_name || 'A조';
      
      if (!groupedStandings[groupName]) {
        groupedStandings[groupName] = [];
      }
      
      groupedStandings[groupName].push({
        rank: standing.rank || 0,
        name: standing.department?.name || '',
        name_eng: standing.department?.name_eng || '',
        logo: toEmbedUrl(standing.department?.logo_url || ''),
        logo_raw: standing.department?.logo_url || '',
        group: standing.group_name || 'A조',
        matches: standing.matches || 0,
        wins: standing.wins || 0,
        draws: standing.draws || 0,
        losses: standing.losses || 0,
        goals_for: standing.goals_for || 0,
        goals_against: standing.goals_against || 0,
        goal_difference: (standing.goals_for || 0) - (standing.goals_against || 0),
        points: standing.points || 0,
        wildcard: standing.wildcard || false
      });
    });

    // 각 그룹 내에서 순위 재계산
    Object.keys(groupedStandings).forEach(groupName => {
      const group = groupedStandings[groupName];
      group.sort((a, b) => {
        // 1차: 승점
        if (b.points !== a.points) return b.points - a.points;
        // 2차: 득실차
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        // 3차: 다득점
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        // 4차: 승수
        return b.wins - a.wins;
      });
      
      // 순위 부여
      group.forEach((standing, index) => {
        standing.rank = index + 1;
      });
    });

    res.json({ 
      standings: groupedStandings,
      total_teams: Object.values(groupedStandings).flat().length
    });

  } catch (err) {
    console.error('풋살 리그전 순위 조회 오류:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

/**
 * 경기장 목록 조회
 * GET /api/sports2025/venues
 */
router.get('/venues', corsMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('venue')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({ venues: data || [] });

  } catch (err) {
    console.error('경기장 목록 조회 오류:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

/**
 * 종목별 경기장 정보 조회
 * GET /api/sports2025/sport-venues
 */
router.get('/sport-venues', corsMiddleware, async (req, res) => {
  try {
    // 종목별 경기장 매핑 정보
    const sportVenues = {
      "풋살": {
        name: "교내 풋살장",
        location_note: "체육관 1층",
        description: "실내 풋살 경기장"
      },
      "농구": {
        name: "교내 농구장",
        location_note: "체육관 2층",
        description: "실내 농구 경기장"
      },
      "피구": {
        name: "교내 농구장",
        location_note: "체육관 2층",
        description: "농구장에서 피구 경기 진행"
      },
      "족구": {
        name: "교내 농구장",
        location_note: "체육관 2층",
        description: "농구장에서 족구 경기 진행"
      },
      "탁구": {
        name: "교내 탁구장",
        location_note: "체육관 3층",
        description: "실내 탁구 경기장"
      },
      "줄다리기": {
        name: "광운스퀘어",
        location_note: "교내 중앙 광장",
        description: "야외 줄다리기 경기장"
      },
      "LOL": {
        name: "레드포스 광운대점",
        location_note: "교내 PC방",
        description: "리그 오브 레전드 e스포츠 경기장"
      },
      "FC온라인": {
        name: "레드포스 광운대점",
        location_note: "교내 PC방",
        description: "피파 온라인 e스포츠 경기장"
      }
    };

    res.json({ 
      sport_venues: sportVenues,
      total_sports: Object.keys(sportVenues).length
    });

  } catch (err) {
    console.error('종목별 경기장 정보 조회 오류:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

module.exports = router;
