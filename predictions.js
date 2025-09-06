// api/predictions.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');
const { validateCreate } = require('../validators/prediction');

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
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
});

router.options('/', corsMiddleware);
router.options('/:id', corsMiddleware);

/** 목록 조회: GET /predictions?page=1&limit=10 (관리자만 접근 가능) */
router.get('/', corsMiddleware, async (req, res) => {
  try {
    // 관리자 인증 확인 (API 키 방식)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: '관리자 인증이 필요합니다.' });
    }

    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await supabase
      .from('predictions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({ page, limit, total: count || 0, items: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/** 단건 조회: GET /predictions/:id (관리자만 접근 가능) */
router.get('/:id', corsMiddleware, async (req, res) => {
  try {
    // 관리자 인증 확인
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: '관리자 인증이 필요합니다.' });
    }

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error && error.code === 'PGRST116') return res.status(404).json({ message: '존재하지 않습니다.' });
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/** 승부예측 제출: POST /predictions */
router.post('/', corsMiddleware, async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ message: '유효성 오류', errors });

    const {
      name,
      student_id,
      phone,
      first_place,
      second_place,
      third_place
    } = req.body;

    // 중복 제출 방지 (같은 학번으로 이미 제출했는지 확인)
    const { data: existingPrediction, error: checkError } = await supabase
      .from('predictions')
      .select('id')
      .eq('student_id', String(student_id).trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existingPrediction) {
      return res.status(409).json({ 
        message: '이미 제출된 학번입니다. 한 번만 제출 가능합니다.' 
      });
    }

    const { data, error } = await supabase
      .from('predictions')
      .insert([{
        name: String(name).trim(),
        student_id: String(student_id).trim(),
        phone: String(phone).trim(),
        first_place: String(first_place).trim(),
        second_place: String(second_place).trim(),
        third_place: String(third_place).trim(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json({ 
      message: '승부예측 제출 완료', 
      data: {
        id: data.id,
        name: data.name,
        student_id: data.student_id,
        first_place: data.first_place,
        second_place: data.second_place,
        third_place: data.third_place,
        created_at: data.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
