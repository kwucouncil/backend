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

/* ------------------------- 유틸 ------------------------- */
const S = (v) => (v == null ? '' : String(v).trim());

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normInput = (v) => {
  // 단일 선택이어도 프론트 설정에 따라 배열로 올 수 있음 → 첫값만 사용
  if (Array.isArray(v)) return v.length ? v[0] : '';
  return v;
};

/** 학과 이름/ID → department.id 정규화 */
async function resolveDepartmentId(raw) {
  const value = normInput(raw);
  if (value == null || value === '') return null;

  // 숫자 또는 숫자 문자열
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
  if (e1) throw new HttpError(500, e1.message);
  if (exact?.length) return exact[0].id;

  // 부분 일치 (ilike)
  const { data: fuzzy, error: e2 } = await supabase
    .from('department')
    .select('id,name,name_eng')
    .or(`name.ilike.%${q}%,name_eng.ilike.%${q}%`)
    .limit(1);
  if (e2) throw new HttpError(500, e2.message);
  if (!fuzzy?.length) throw new HttpError(400, `학과를 찾을 수 없습니다: "${q}"`);
  return fuzzy[0].id;
}

/* ------------------------- 목록(관리자) ------------------------- */
/** GET /predictions?page=1&limit=10 */
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
    console.error('[GET /predictions] error =', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/* ------------------------- 단건(관리자) ------------------------- */
/** GET /predictions/:id */
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
    console.error('[GET /predictions/:id] error =', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/* ------------------------- 제출(사용자) ------------------------- */
/** POST /predictions */
router.post('/', corsMiddleware, async (req, res) => {
  try {
    console.log('[POST /predictions] payload =', req.body);

    const errors = typeof validateCreate === 'function' ? (validateCreate(req.body) || []) : [];
    if (errors.length) {
      return res.status(400).json({ message: '유효성 오류', errors });
    }

    const {
      name,
      student_id,
      phone,
      first_place,   // 이름 또는 ID(숫자/문자열/배열 가능)
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

    // 학과값 → department.id 정규화 (배열/문자열/숫자 모두 허용)
    const [firstId, secondId, thirdId] = await Promise.all([
      resolveDepartmentId(first_place),
      resolveDepartmentId(second_place),
      resolveDepartmentId(third_place),
    ]);

    const insertPayload = {
      name: S(name),
      student_id: S(student_id),
      phone: S(phone),
      first_place: firstId,     // bigint FK (department.id)
      second_place: secondId,   // bigint FK
      third_place: thirdId,     // bigint FK
      created_at: new Date().toISOString(),
    };
    console.log('[POST /predictions] insertPayload =', insertPayload);

    const { data, error } = await supabase
      .from('predictions')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      // 에러 코드 매핑
      if (error.code === '23503') {
        // FK 위반: 존재하지 않는 department.id
        return res.status(400).json({ message: '존재하지 않는 학과 ID입니다.', detail: error.message });
      }
      if (error.code === '23505') {
        // unique 위반 (예: student_id 유니크 인덱스가 있다면)
        return res.status(409).json({ message: '이미 제출된 학번입니다.' });
      }
      if (error.code === '22P02') {
        // 타입 변환 오류 (예: TEXT 컬럼인데 숫자 넣으려는 경우)
        return res.status(400).json({ message: '잘못된 데이터 형식입니다.', detail: error.message });
      }
      throw error;
    }

    return res.status(201).json({
      message: '승부예측 제출 완료',
      data: {
        id: data.id,
        name: data.name,
        student_id: data.student_id,
        phone: data.phone,
        first_place: data.first_place,   // 저장된 department.id
        second_place: data.second_place,
        third_place: data.third_place,
        created_at: data.created_at,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[POST /predictions] error =', err);
    return res.status(status).json({
      message: status === 500 ? '서버 오류' : '요청 오류',
      error: err.message,
    });
  }
});

module.exports = router;
