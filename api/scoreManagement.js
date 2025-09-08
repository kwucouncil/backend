// api/scoreManagement.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');

const router = express.Router();

const corsMiddleware = cors({
  origin: (origin, cb) => {
    const allow = [
      'https://kwucouncil.github.io',
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'https://www.kwu-studentcouncil52.com',
      'https://admin-kwu-2025-sports.onrender.com',
      'https://admin-kwu-2025-sports.onrender.com/score-management',
    ];
    if (!origin || allow.includes(origin)) return cb(null, true);
    cb(new Error('CORS 정책 위반'));
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
});

// CORS preflight 처리
router.options('*', corsMiddleware);

/**
 * 경기 목록 조회 (관리자용)
 * GET /api/scoreManagement/matches
 */
router.get('/matches', corsMiddleware, async (req, res) => {
  try {
    const { 
      date, 
      sport_id, 
      is_played, 
      page = 1, 
      page_size = 20 
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(page_size, 10) || 20, 1), 100);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('match')
      .select(`
        id,
        match_date,
        period_start,
        is_played,
        rain_canceled,
        admin_note,
        created_at,
        updated_at,
        sport:sport_id(id, name, name_eng),
        venue:venue_id(id, name, location_note),
        participations:participation(
          id,
          side,
          score,
          department:department(
            id,
            name,
            name_eng,
            logo_url
          )
        )
      `, { count: 'exact' })
      .order('match_date', { ascending: false })
      .order('period_start', { ascending: false });

    // 필터 적용
    if (date) query = query.eq('match_date', date);
    if (sport_id) query = query.eq('sport_id', parseInt(sport_id, 10));
    if (typeof is_played !== 'undefined') {
      query = query.eq('is_played', String(is_played) === 'true');
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    // 데이터 변환
    const matches = (data || []).map(match => {
      const homeTeam = match.participations?.find(p => p.side === 'home');
      const awayTeam = match.participations?.find(p => p.side === 'away');

      return {
        id: match.id,
        date: match.match_date,
        start: match.period_start,
        sport: match.sport?.name || '',
        venue: match.venue?.name || '',
        is_played: match.is_played,
        rain_canceled: match.rain_canceled,
        admin_note: match.admin_note,
        home_team: homeTeam ? {
          id: homeTeam.id,
          department_id: homeTeam.department?.id,
          name: homeTeam.department?.name || '',
          score: homeTeam.score || 0
        } : null,
        away_team: awayTeam ? {
          id: awayTeam.id,
          department_id: awayTeam.department?.id,
          name: awayTeam.department?.name || '',
          score: awayTeam.score || 0
        } : null,
        created_at: match.created_at,
        updated_at: match.updated_at
      };
    });

    res.json({
      page: pageNum,
      page_size: pageSize,
      total: count || 0,
      matches
    });

  } catch (err) {
    console.error('경기 목록 조회 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/**
 * 단일 경기 상세 조회 (관리자용)
 * GET /api/scoreManagement/matches/:match_id
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
        admin_note,
        created_at,
        updated_at,
        sport:sport_id(id, name, name_eng),
        venue:venue_id(id, name, location_note),
        participations:participation(
          id,
          side,
          score,
          department:department(
            id,
            name,
            name_eng,
            logo_url
          )
        )
      `)
      .eq('id', match_id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
    }
    if (error) throw error;

    const homeTeam = data.participations?.find(p => p.side === 'home');
    const awayTeam = data.participations?.find(p => p.side === 'away');

    const matchData = {
      id: data.id,
      date: data.match_date,
      start: data.period_start,
      sport: data.sport?.name || '',
      venue: data.venue?.name || '',
      is_played: data.is_played,
      rain_canceled: data.rain_canceled,
      admin_note: data.admin_note,
      home_team: homeTeam ? {
        id: homeTeam.id,
        department_id: homeTeam.department?.id,
        name: homeTeam.department?.name || '',
        score: homeTeam.score || 0
      } : null,
      away_team: awayTeam ? {
        id: awayTeam.id,
        department_id: awayTeam.department?.id,
        name: awayTeam.department?.name || '',
        score: awayTeam.score || 0
      } : null,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({ match: matchData });

  } catch (err) {
    console.error('경기 상세 조회 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/**
 * 경기 점수 업데이트
 * PUT /api/scoreManagement/matches/:match_id/scores
 */
router.put('/matches/:match_id/scores', corsMiddleware, async (req, res) => {
  try {
    const { match_id } = req.params;
    const { home_score, away_score, is_played, admin_note } = req.body;

    // 입력 검증
    if (typeof home_score !== 'number' || typeof away_score !== 'number') {
      return res.status(400).json({ message: '점수는 숫자여야 합니다.' });
    }

    if (home_score < 0 || away_score < 0) {
      return res.status(400).json({ message: '점수는 0 이상이어야 합니다.' });
    }

    // 고유 식별자 파싱 (날짜_시간_팀1ID_팀2ID)
    let actualMatchId = match_id;
    if (match_id.includes('_')) {
      const parts = match_id.split('_');
      if (parts.length >= 4) {
        const date = parts[0];
        const time = parseInt(parts[1]);
        const team1Id = parseInt(parts[2]);
        const team2Id = parseInt(parts[3]);
        
        console.log('파싱된 정보:', { date, time, team1Id, team2Id });
        
        // 실제 match ID 찾기
        const { data: matchData, error: matchError } = await supabase
          .from('match')
          .select(`
            id, 
            match_date, 
            period_start,
            participations:participation(id, side, department_id)
          `)
          .eq('match_date', date)
          .eq('period_start', time);
          
        if (matchError) {
          console.error('경기 조회 오류:', matchError);
          return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
        }
        
        if (!matchData || matchData.length === 0) {
          return res.status(404).json({ message: '해당 날짜와 시간의 경기를 찾을 수 없습니다.' });
        }
        
        // 여러 경기가 있을 수 있으므로 팀 ID로 필터링
        const targetMatch = matchData.find(match => {
          const homeTeam = match.participations?.find(p => p.side === 'home');
          const awayTeam = match.participations?.find(p => p.side === 'away');
          return homeTeam?.department_id === team1Id && awayTeam?.department_id === team2Id;
        });
        
        if (!targetMatch) {
          return res.status(404).json({ message: '해당 팀들의 경기를 찾을 수 없습니다.' });
        }
        
        actualMatchId = targetMatch.id;
        console.log('찾은 실제 match ID:', actualMatchId);
      }
    }

    // 경기 존재 확인
    const { data: matchData, error: matchError } = await supabase
      .from('match')
      .select('id, participations:participation(id, side)')
      .eq('id', actualMatchId)
      .single();

    if (matchError && matchError.code === 'PGRST116') {
      return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
    }
    if (matchError) throw matchError;

    // participation 업데이트
    const homeParticipation = matchData.participations?.find(p => p.side === 'home');
    const awayParticipation = matchData.participations?.find(p => p.side === 'away');

    if (!homeParticipation || !awayParticipation) {
      return res.status(400).json({ message: '홈팀 또는 어웨이팀 정보가 없습니다.' });
    }

    // 트랜잭션으로 업데이트
    const updates = [];

    // 홈팀 점수 업데이트
    updates.push(
      supabase
        .from('participation')
        .update({ score: home_score })
        .eq('id', homeParticipation.id)
    );

    // 어웨이팀 점수 업데이트
    updates.push(
      supabase
        .from('participation')
        .update({ score: away_score })
        .eq('id', awayParticipation.id)
    );

    // 경기 상태 업데이트
    const matchUpdateData = {
      updated_at: new Date().toISOString()
    };

    if (typeof is_played !== 'undefined') {
      matchUpdateData.is_played = is_played;
    }

    if (admin_note !== undefined) {
      matchUpdateData.admin_note = admin_note;
    }

    updates.push(
      supabase
        .from('match')
        .update(matchUpdateData)
        .eq('id', match_id)
    );

    // 모든 업데이트 실행
    const results = await Promise.all(updates);
    
    // 에러 확인
    for (const result of results) {
      if (result.error) throw result.error;
    }

    res.json({ 
      message: '점수가 성공적으로 업데이트되었습니다.',
      match_id: parseInt(match_id),
      home_score,
      away_score,
      is_played: is_played !== undefined ? is_played : matchData.is_played
    });

  } catch (err) {
    console.error('점수 업데이트 오류:', err);
    console.error('요청 데이터:', { match_id, home_score, away_score, is_played, admin_note });
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message,
      details: err.stack,
      request_data: { match_id, home_score, away_score, is_played, admin_note }
    });
  }
});

/**
 * 경기 상태 업데이트 (경기 완료/미완료)
 * PUT /api/scoreManagement/matches/:match_id/status
 */
router.put('/matches/:match_id/status', corsMiddleware, async (req, res) => {
  try {
    const { match_id } = req.params;
    const { is_played, rain_canceled, admin_note } = req.body;

    // 고유 식별자 파싱 (날짜_시간_팀1ID_팀2ID)
    let actualMatchId = match_id;
    if (match_id.includes('_')) {
      const parts = match_id.split('_');
      if (parts.length >= 4) {
        const date = parts[0];
        const time = parts[1];
        const team1Id = parts[2];
        const team2Id = parts[3];
        
        // 실제 match ID 찾기
        const { data: matchData, error: matchError } = await supabase
          .from('match')
          .select('id, participations:participation(id, side, department_id)')
          .eq('match_date', date)
          .eq('period_start', parseInt(time))
          .single();
          
        if (matchError) {
          return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
        }
        
        // 팀 ID 확인
        const homeTeam = matchData.participations?.find(p => p.side === 'home');
        const awayTeam = matchData.participations?.find(p => p.side === 'away');
        
        if (homeTeam?.department_id != team1Id || awayTeam?.department_id != team2Id) {
          return res.status(404).json({ message: '경기 정보가 일치하지 않습니다.' });
        }
        
        actualMatchId = matchData.id;
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (typeof is_played !== 'undefined') {
      updateData.is_played = is_played;
    }

    if (typeof rain_canceled !== 'undefined') {
      updateData.rain_canceled = rain_canceled;
    }

    if (admin_note !== undefined) {
      updateData.admin_note = admin_note;
    }

    const { data, error } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', actualMatchId)
      .select('id, is_played, rain_canceled, admin_note')
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: '경기를 찾을 수 없습니다.' });
    }
    if (error) throw error;

    res.json({ 
      message: '경기 상태가 성공적으로 업데이트되었습니다.',
      match_id: parseInt(match_id),
      is_played: data.is_played,
      rain_canceled: data.rain_canceled,
      admin_note: data.admin_note
    });

  } catch (err) {
    console.error('경기 상태 업데이트 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/**
 * 종목 목록 조회
 * GET /api/scoreManagement/sports
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
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/**
 * 학과 목록 조회
 * GET /api/scoreManagement/departments
 */
router.get('/departments', corsMiddleware, async (req, res) => {
  try {
    const { college_id, search } = req.query;

    let query = supabase
      .from('department')
      .select(`
        id,
        name,
        name_eng,
        logo_url,
        college:college_id(name, name_eng)
      `)
      .order('name');

    if (college_id) {
      query = query.eq('college_id', parseInt(college_id, 10));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_eng.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ departments: data || [] });

  } catch (err) {
    console.error('학과 목록 조회 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;

