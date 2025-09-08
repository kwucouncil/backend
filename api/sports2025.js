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
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'https://www.kwu-studentcouncil52.com',
      'https://kwu-hoempage-backend.onrender.com',
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

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(page_size, 10) || 20, 1), 100);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // 핵심: 필터용 participation 과 전체 팀 조회용 participation 을 분리
    let query = supabase
      .from('match')
      .select(`
        id,
        match_date,
        period_start,
        is_played,
        rain_canceled,
        updated_at,
        sport:sport_id(name,name_eng,is_team_sport),
        venue:venue_id(name,location_note),
        filter_participation:participation!inner(
          department_id,
          department:department(
            id,name,name_eng,logo_url,
            college_id,
            college:college(id,name,name_eng)
          ),
          side,
          score
        ),
        participations:participation(
          side,
          score,
          department:department(
            id,name,name_eng,logo_url,
            college_id,
            college:college(id,name,name_eng)
          )
        )
      `, { count: 'exact' });

    // 기본 정렬
    query = query.order('match_date', { ascending: true })
                 .order('period_start', { ascending: true });

    // 날짜 / 종목
    if (date)      query = query.eq('match_date', date);
    if (sport_id)  query = query.eq('sport_id', parseInt(sport_id, 10));
    else if (sport) query = query.eq('sport.name', sport);

    // 경기 상태
    if (typeof played !== 'undefined') query = query.eq('is_played', String(played) === 'true');
    if (typeof rain   !== 'undefined') query = query.eq('rain_canceled', String(rain) === 'true');

    // 학과/단과대 필터는 "filter_participation" 경로에 건다
    if (department_id) {
      query = query.eq('filter_participation.department_id', parseInt(department_id, 10));
    }
    if (college_id) {
      // department의 FK 컬럼(college_id) 기준으로 필터
      query = query.eq('filter_participation.department.college_id', parseInt(college_id, 10));
    }

    // 추가 정렬 옵션
    const sortFields  = String(sort).split(',').map(s => s.trim()).filter(Boolean);
    const orderFields = String(order).split(',').map(s => s.trim().toLowerCase());
    const fieldMap = { date: 'match_date', start: 'period_start' };
    sortFields.forEach((f, i) => {
      const dbField = fieldMap[f] || f;
      const asc = (orderFields[i] || 'asc') === 'asc';
      query = query.order(dbField, { ascending: asc });
    });

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    // INNER JOIN로 인한 중복 제거
    const uniq = new Map();
    (data || []).forEach(row => { if (!uniq.has(row.id)) uniq.set(row.id, row); });
    const rows = Array.from(uniq.values());

    // team1/home, team2/away 채우기
    const items = rows.map(m => {
      const teams = (m.participations || [])
        .filter(p => p?.department?.id)
        .map(p => ({
          side: p.side,
          score: p.score ?? 0,
          id: p.department.id,
          name: p.department.name || '',
          name_eng: p.department.name_eng || '',
          logo: toEmbedUrl(p.department.logo_url || ''),
          logo_raw: p.department.logo_url || ''
        }));

      const home = teams.find(t => t.side === 'home') || { id:null,name:'',name_eng:'',logo:'',logo_raw:'',score:0 };
      const away = teams.find(t => t.side === 'away') || { id:null,name:'',name_eng:'',logo:'',logo_raw:'',score:0 };

      let win = null;
      if (m.is_played && home.id && away.id && home.score !== away.score) {
        win = home.score > away.score ? 'team1' : 'team2';
      }

      return {
        date: m.match_date,
        start: m.period_start,
        place: m.venue?.name || '',
        sport: m.sport?.name || '',
        team1: { id: home.id, name: home.name, name_eng: home.name_eng, logo: home.logo, logo_raw: home.logo_raw, score: home.score },
        team2: { id: away.id, name: away.name, name_eng: away.name_eng, logo: away.logo, logo_raw: away.logo_raw, score: away.score },
        rain: !!m.rain_canceled,
        result: !!m.is_played,
        win
      };
    });

    res.json({ page: pageNum, page_size: pageSize, total: count || 0, items });
  } catch (err) {
    console.error('경기 일정 조회 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
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
    const sportIdNum = sport_id ? parseInt(sport_id, 10) : null;

    // 1) department의 점수/정보 읽기
    const { data: departments, error: deptErr } = await supabase
      .from('department')
      .select('id, name, name_eng, logo_url, score');
    if (deptErr) throw deptErr;

    // 2) sport_id가 온 경우: 해당 종목에 "참가 기록"이 있는 학과만 필터
    let filteredDeptIds = null;
    if (sportIdNum) {
      const { data: partRows, error: partErr } = await supabase
        .from('participation')
        .select('department_id, match:match_id(sport_id)')
        .eq('match.sport_id', sportIdNum);
      if (partErr) throw partErr;

      filteredDeptIds = Array.from(new Set((partRows || []).map(r => r.department_id)));
    }

    const depts = (departments || [])
      .filter(d => (filteredDeptIds ? filteredDeptIds.includes(d.id) : true))
      .map(d => ({
        department_id: d.id,
        name: d.name,
        name_eng: d.name_eng || '',
        logo: toEmbedUrl(d.logo_url || ''),
        logo_raw: d.logo_url || '',
        score: d.score ?? 0
      }));

    // 3) 최신 업데이트 시간은 match.updated_at에서 가져오기
    //    - sport_id가 있다면 해당 종목 내에서, 없으면 전체에서 최신 1건
    let updQuery = supabase
      .from('match')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sportIdNum) updQuery = updQuery.eq('sport_id', sportIdNum);

    const { data: updRow, error: updErr } = await updQuery;
    if (updErr) throw updErr;

    const latestUpdateTime = updRow?.[0]?.updated_at ? new Date(updRow[0].updated_at) : null;

    // 4) 점수순 정렬
    depts.sort((a, b) => b.score - a.score);

    // 5) 순위 매기기
    const standings = depts.map((d, idx) => ({
      rank: idx + 1,
      name: d.name,
      name_eng: d.name_eng,
      logo: d.logo,
      logo_raw: d.logo_raw,
      score: d.score
    }));

    // 6) 한국시간 포맷
    const formatKoreanTime = (date) => {
      if (!date) return null;
      const koreanTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const y = koreanTime.getFullYear();
      const m = String(koreanTime.getMonth() + 1).padStart(2, '0');
      const d = String(koreanTime.getDate()).padStart(2, '0');
      const h = koreanTime.getHours();
      const ampm = h < 12 ? '오전' : '오후';
      const hh = h % 12 === 0 ? 12 : h % 12;
      return `${y}년 ${m}월 ${d}일 ${ampm} ${hh}시 기준`;
    };

    res.json({
      sport_id: sportIdNum ?? null,
      updated_at: latestUpdateTime ? formatKoreanTime(latestUpdateTime) : null,
      standings
    });

  } catch (err) {
    console.error('standings 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
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
 * 최근 경기 결과
 * GET /api/sports2025/recent-results
 * 예) /api/sports2025/recent-results?limit=10&sport_id=1
 */
router.get('/recent-results', corsMiddleware, async (req, res) => {
  try {
    const {
      limit = 10,
      sport_id,
      date_to // 선택, YYYY-MM-DD
    } = req.query;

    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    let query = supabase
      .from('match')
      .select(`
        id,
        match_date,
        period_start,
        is_played,
        rain_canceled,
        updated_at,
        sport:sport_id(id, name, name_eng, is_team_sport),
        venue:venue_id(id, name, location_note),
        participations:participation(
          side,
          score,
          department:department(id, name, name_eng, logo_url)
        )
      `)
      .eq('is_played', true);

    // 날짜 제한 (오늘 이전까지)
    const toDate = date_to || new Date().toISOString().slice(0, 10);
    query = query.lte('match_date', toDate);

    // 종목 필터
    if (sport_id) {
      query = query.eq('sport_id', parseInt(sport_id, 10));
    }

    // 최신순 정렬
    query = query
      .order('match_date', { ascending: false })
      .order('period_start', { ascending: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(lim);

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map(m => {
      const teams = (m.participations || [])
        .filter(p => p?.department?.id)
        .map(p => ({
          side: p.side,
          score: p.score ?? 0,
          id: p.department.id,
          name: p.department.name || '',
          name_eng: p.department.name_eng || '',
          logo: toEmbedUrl(p.department.logo_url || ''),
          logo_raw: p.department.logo_url || ''
        }));

      const home = teams.find(t => t.side === 'home') || { id:null,name:'',name_eng:'',logo:'',logo_raw:'',score:0 };
      const away = teams.find(t => t.side === 'away') || { id:null,name:'',name_eng:'',logo:'',logo_raw:'',score:0 };

      let win = null;
      if (home.id && away.id && home.score !== away.score) {
        win = home.score > away.score ? 'team1' : 'team2';
      }

      return {
        id: m.id,
        date: m.match_date,
        start: m.period_start,
        place: m.venue?.name || '',
        sport: m.sport?.name || '',
        team1: { id: home.id, name: home.name, name_eng: home.name_eng, logo: home.logo, logo_raw: home.logo_raw, score: home.score },
        team2: { id: away.id, name: away.name, name_eng: away.name_eng, logo: away.logo, logo_raw: away.logo_raw, score: away.score },
        rain: !!m.rain_canceled,
        result: true,
        win
      };
    });

    res.json({ count: items.length, items });
  } catch (err) {
    console.error('최근 경기 결과 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
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
