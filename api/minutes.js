// api/minutes.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');
const { validateCreate } = require('../validators/minutes');

const router = express.Router();

// CORS 미들웨어 (기존 화이트리스트 사용)
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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

router.options('*', corsMiddleware);

// GET /minutes - 회의록 목록 조회
router.get('/', corsMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    
    // 페이지네이션 검증
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    // 쿼리 빌더
    let query = supabase
      .from('minutes')
      .select('*', { count: 'exact' });
    
    // 제목 검색 (부분 일치)
    if (q && q.trim()) {
      query = query.ilike('title', `%${q.trim()}%`);
    }
    
    // 정렬: 최신 date desc, created_at desc
    query = query.order('date', { ascending: false })
                 .order('created_at', { ascending: false });
    
    // 페이지네이션 적용
    const { data: items, error, count } = await query
      .range(offset, offset + limitNum - 1);
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ 
        message: '데이터 조회 실패', 
        error: error.message 
      });
    }
    
    res.json({
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      items: items || []
    });
    
  } catch (err) {
    console.error('GET /minutes error:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

// GET /minutes/:id - 단건 조회
router.get('/:id', corsMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        message: 'ID가 필요합니다.' 
      });
    }
    
    const { data: minutes, error } = await supabase
      .from('minutes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          message: '회의록을 찾을 수 없습니다.' 
        });
      }
      console.error('Supabase query error:', error);
      return res.status(500).json({ 
        message: '데이터 조회 실패', 
        error: error.message 
      });
    }
    
    res.json(minutes);
    
  } catch (err) {
    console.error('GET /minutes/:id error:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

// POST /minutes - 회의록 생성
router.post('/', corsMiddleware, async (req, res) => {
  try {
    const body = req.body;
    
    // 유효성 검사
    const errors = validateCreate(body);
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: '유효성 검사 실패', 
        errors 
      });
    }
    
    const { title, file_url, date } = body;
    
    // 데이터 삽입
    const { data: newMinutes, error } = await supabase
      .from('minutes')
      .insert([{ title, file_url, date }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ 
        message: '데이터 생성 실패', 
        error: error.message 
      });
    }
    
    res.status(201).json(newMinutes);
    
  } catch (err) {
    console.error('POST /minutes error:', err);
    res.status(500).json({ 
      message: '서버 오류', 
      error: err.message 
    });
  }
});

module.exports = router;
