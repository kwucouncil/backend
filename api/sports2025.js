// api/sports2025.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');

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
      query = query.eq('date', date);
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
      query = query.order(field, { ascending: orderDirection === 'asc' });
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
          name_eng: homeTeam.department?.name_en || '',
          logo: homeTeam.department?.logo_url || '',
          score: homeTeam.score || 0
        },
        team2: {
          id: awayTeam.department?.id,
          name: awayTeam.department?.name || '',
          name_eng: awayTeam.department?.name_en || '',
          logo: awayTeam.department?.logo_url || '',
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
        logo: homeTeam.department?.logo_url || '',
        score: homeTeam.score || 0
      },
      team2: {
        id: awayTeam.department?.id,
        name: awayTeam.department?.name || '',
        name_eng: awayTeam.department?.name_eng || '',
        logo: awayTeam.department?.logo_url || '',
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
    const { sport_id, limit = 20 } = req.query;

    // standings 테이블이 없으므로 participation에서 집계
    let query = supabase
      .from('participation')
      .select(`
        department:department(id, name, name_eng, logo_url),
        match!inner(
          sport:sport(id, name, name_eng),
          is_played
        ),
        score
      `)
      .eq('match.is_played', true);

    if (sport_id) {
      query = query.eq('match.sport_id', parseInt(sport_id));
    }

    const { data, error } = await query;

    if (error) throw error;

    // 부서별 점수 집계
    const departmentScores = {};
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
      }
    });

    // 점수순으로 정렬
    const sortedStandings = Object.values(departmentScores)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, parseInt(limit));

    // 순위 데이터 변환
    const transformedStandings = sortedStandings.map((standing, index) => ({
      rank: index + 1,
      name: standing.department?.name || '',
      name_eng: standing.department?.name_eng || '',
      logo: standing.department?.logo_url || '',
      score: standing.totalScore
    }));

    res.json({ 
      sport_id: sport_id ? parseInt(sport_id) : null,
      limit: parseInt(limit),
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
router.get('/departments', corsMiddleware, async (req, res) => {
  try {
    const { college_id, search } = req.query;

    let query = supabase
      .from('department')
      .select(`
        *,
        college:college(name, name_eng)
      `)
      .order('name');

    if (college_id) {
      query = query.eq('college_id', parseInt(college_id));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_eng.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ 
      college_id: college_id ? parseInt(college_id) : null,
      search: search || null,
      departments: data || [] 
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

module.exports = router;
