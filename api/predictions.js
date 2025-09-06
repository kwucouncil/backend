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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
});

// CORS preflight
router.options('/', corsMiddleware);
router.options('/:id', corsMiddleware);

/** 공용: 안전 문자열 변환 */
const S = (v) => (v === null || v === undefined ? '' : String(v).trim());

/** 공용: 학과 이름/ID → department.id 정규화 */
async function resolveDepartmentId(value, res) {
  // null/빈문자열이면 null 허용(선택사항에 맞게 변경 가능)
  if (value === null || value === undefined || value === '') return null;

  // 이미 숫자/숫자문자열인 경우
  const asNum = Number(String(value).trim());
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) return asNum;

  // 문자열(학과명) 매칭: 정확 → 부분
  const q = String(value).trim();

  // 정확 일치 (한/영)
  let { data: exact, error: e1 } = await supabase
    .from('department')
    .select('id,name,name_eng')
    .or(`name.eq.${q},name_eng.eq.${q}`)
    .limit(1);
  if (e1) throw e1;
  if (exact && exact.length) return exact[0].id;

  // 부분 일치 (ilike)
  const { data: fuzzy, error: e2 } = await supabase
    .from('department')
    .select('id,name,name_eng')
    .or(`name.ilike.%${q}%,name_eng.ilike.%${q}%`)
    .limit(1);
  if (e2) throw e2;
  if (!fuzzy || !fuzzy.length) {
    // 400: 사용자가 보낸 학과를 못 찾음
    res.status(400).json({ message: `학과를 찾을 수 없습니다: "${q}"` });
    // throw가 아닌 조기 반환을 위해 특별 키워드 사용
    return '__EARLY_RETURN__';
  }
  return fuzzy[0].id;
}

/** 목록 조회: GET /predictions?page=1&limit=10 (관리자만) */
router.get('/', corsMiddleware, async (req, res) => {
  try {
    // 관리자 인증 (API 키)
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

/** 단건 조회: GET /predictions/:id (관리자만) */
router.get('/:id', corsMiddleware, async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: '관리자 인증이 필요합니다.' });
    }

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: '존재하지 않습니다.' });
    }
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
    if (errors.length) {
      return res.status(400).json({ message: '유효성 오류', errors });
    }

    const {
      name,
      student_id,
      phone,
      first_place,   // 이름 또는 ID(숫자/문자열)
      second_place,
      third_place
    } = req.body;

    // 중복 제출 방지 (같은 학번)
    const { data: existing, error: checkError } = await supabase
      .from('predictions')
      .select('id')
      .eq('student_id', S(student_id))
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existing) {
      return res.status(409).json({ message: '이미 제출된 학번입니다. 한 번만 제출 가능합니다.' });
    }

    // 학과값 → department.id 정규화
    const firstId  = await resolveDepartmentId(first_place, res);
    if (firstId === '__EARLY_RETURN__') return;
    const secondId = await resolveDepartmentId(second_place, res);
    if (secondId === '__EARLY_RETURN__') return;
    const thirdId  = await resolveDepartmentId(third_place, res);
    if (thirdId === '__EARLY_RETURN__') return;

    // 저장 (bigint FK로 저장)
    const { data, error } = await supabase
      .from('predictions')
      .insert([{
        name: S(name),
        student_id: S(student_id),
        phone: S(phone),
        first_place: firstId,     // department.id
        second_place: secondId,   // department.id
        third_place: thirdId,     // department.id
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
        phone: data.phone,
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
