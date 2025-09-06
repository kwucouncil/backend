// api/sports2025.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');

// Google Drive 공유 URL → 임베드 가능한 URL로 변환
function toEmbedUrl(url) {
  if (!url) return '';

  // 이미 uc?export=view 혹은 /preview 형태면 그대로 사용
  if (/drive\.google\.com\/uc\?/.test(url) || /drive\.google\.com\/file\/d\/[^/]+\/preview/.test(url)) {
    return url;
  }

  // /file/d/{id}/... 패턴
  const m1 = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m1 && m1[1]) {
    const id = m1[1];
    // 이미지 <img>에 적합 (CORS/캐시 무난)
    return `https://drive.google.com/uc?export=view&id=${id}`;
    // iframe이 필요하면 아래를 사용:
    // return `https://drive.google.com/file/d/${id}/preview`;
  }

  // open?id= 패턴
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2 && m2[1]) {
    const id = m2[1];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  // 기타: 원본 그대로
  return url;
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

    // 페이지네이션 설정
    const pageNum = Math.max(parseInt(page), 1);
    const pageSize = Math.min(Math.max(parseInt(page_size), 1), 100);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('match')
      .select(`
        *,
        sport:sport(name, name_eng, is_team_sport),
        venue:venue(name, location_note),
        participation!inner(
          department:department(
            id, name, name_eng, logo_url,
            college:college(name, name_eng)
          ),
          side, score
        )
      `, { count: 'exact' });

    // 필터 적용
    if (date) {
      query = query.eq('match_date', date);
    }

    if (sport_id) {
      query = query.eq('sport_id', parseInt(sport_id));
    } else if (sport) {
      query = query.eq('sport.name', sport);
    }

    if (college_id) {
      query = query.eq('participation.department.college_id', parseInt(college_id));
    }

    if (department_id) {
      query = query.eq('participation.department_id', parseInt(department_id));
    }

    if (played !== undefined) {
      query = query.eq('is_played', played === 'true');
    }

    if (rain !== undefined) {
      query = query.eq('rain_canceled', rain === 'true');
    }

    // 정렬 설정
    const sortFields = sort.split(',');
    const orderFields = order.split(',');
    
    sortFields.forEach((field, index) => {
      const orderDirection = orderFields[index] || 'asc';
      // 필드명 매핑 (API 필드명 -> DB 컬럼명)
      const fieldMapping = {
        'date': 'match_date',
        'start': 'period_start'
      };
      const dbField = fieldMapping[field] || field;
      query = query.order(dbField, { ascending: orderDirection === 'asc' });
    });

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    // 응답 데이터 변환
    const transformedItems = (data || []).map(match => {
      // participation에서 home/away 팀 찾기
      const homeTeam = match.participation?.find(p => p.side === 'home') || {};
      const awayTeam = match.participation?.find(p => p.side === 'away') || {};
      
      let win = null;
      if (match.is_played && homeTeam.score !== awayTeam.score) {
        win = homeTeam.score > awayTeam.score ? 'team1' : 'team2';
      }

      return {
        date: match.match_date,
        start: match.period_start,
        place: match.venue?.name || '',
        sport: match.sport?.name || '',
        team1: {
          id: homeTeam.department?.id,
          name: homeTeam.department?.name || '',
          name_eng: homeTeam.department?.name_eng || '',
          logo: toEmbedUrl(homeTeam.department?.logo_url || ''),
          logo_raw: homeTeam.department?.logo_url || '',
          score: homeTeam.score || 0
        },
        team2: {
          id: awayTeam.department?.id,
          name: awayTeam.department?.name || '',
          name_eng: awayTeam.department?.name_eng || '',
          logo: toEmbedUrl(awayTeam.department?.logo_url || ''),
          logo_raw: awayTeam.department?.logo_url || '',
          score: awayTeam.score || 0
        },
        rain: match.rain_canceled || false,
        result: match.is_played || false,
        win: win
      };
    });

    res.json({
      page: pageNum,
      page_size: pageSize,
      total: count || 0,
      items: transformedItems
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
        *,
        sport:sport(name, name_eng, is_team_sport),
        venue:venue(name, location_note),
        participation(
          department:department(
            id, name, name_eng, logo_url,
            college:college(id, name, name_eng)
          ),
          side, score
        )
      `)
      .eq('id', match_id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
    }
    if (error) throw error;

    // 상세 데이터 변환
    const homeTeam = data.participation?.find(p => p.side === 'home') || {};
    const awayTeam = data.participation?.find(p => p.side === 'away') || {};
    
    let win = null;
    if (data.is_played && homeTeam.score !== awayTeam.score) {
      win = homeTeam.score > awayTeam.score ? 'team1' : 'team2';
    }

    const transformedData = {
      date: data.match_date,
      start: data.period_start,
      place: data.venue?.name || '',
      sport: data.sport?.name || '',
      team1: {
        id: homeTeam.department?.id,
        name: homeTeam.department?.name || '',
        name_eng: homeTeam.department?.name_eng || '',
        logo: toEmbedUrl(homeTeam.department?.logo_url || ''),
        logo_raw: homeTeam.department?.logo_url || '',
        score: homeTeam.score || 0
      },
      team2: {
        id: awayTeam.department?.id,
        name: awayTeam.department?.name || '',
        name_eng: awayTeam.department?.name_eng || '',
        logo: toEmbedUrl(awayTeam.department?.logo_url || ''),
        logo_raw: awayTeam.department?.logo_url || '',
        score: awayTeam.score || 0
      },
      rain: data.rain_canceled || false,
      result: data.is_played || false,
      win: win
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

    // standings 테이블이 없으므로 participation에서 집계
    let query = supabase
      .from('participation')
      .select(`
        department:department(id, name, name_eng, logo_url),
        match!inner(
          sport:sport(id, name, name_eng),
          is_played,
          updated_at
        ),
        score
      `)
      .eq('match.is_played', true);

    if (sport_id) {
      query = query.eq('match.sport_id', parseInt(sport_id));
    }

    const { data, error } = await query;

    if (error) throw error;

    // 부서별 점수 집계 및 최신 업데이트 시간 추적
    const departmentScores = {};
    let latestUpdateTime = null;
    
    (data || []).forEach(participation => {
      const deptId = participation.department?.id;
      if (deptId) {
        if (!departmentScores[deptId]) {
          departmentScores[deptId] = {
            department: participation.department,
            totalScore: 0,
            wins: 0,
            matches: 0
          };
        }
        departmentScores[deptId].totalScore += participation.score || 0;
        departmentScores[deptId].matches += 1;
        
        // 최신 업데이트 시간 추적
        if (participation.match?.updated_at) {
          const updateTime = new Date(participation.match.updated_at);
          if (!latestUpdateTime || updateTime > latestUpdateTime) {
            latestUpdateTime = updateTime;
          }
        }
      }
    });

    // 점수순으로 정렬 (모든 학과 포함)
    const sortedStandings = Object.values(departmentScores)
      .sort((a, b) => b.totalScore - a.totalScore);

    // 순위 데이터 변환
    const transformedStandings = sortedStandings.map((standing, index) => ({
      rank: index + 1,
      name: standing.department?.name || '',
      name_eng: standing.department?.name_eng || '',
      logo: toEmbedUrl(standing.department?.logo_url || ''),
      logo_raw: standing.department?.logo_url || '',
      score: standing.totalScore
    }));

    // 한국 시간으로 포맷팅
    const formatKoreanTime = (date) => {
      if (!date) return null;
      
      const koreanTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
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
