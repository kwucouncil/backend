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

/* ------------------------- Util ------------------------- */
const S = (v) => (v == null ? '' : String(v).trim());

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const pickFirst = (v) => (Array.isArray(v) ? (v[0] ?? '') : v);

/** 학과 이름/ID → department.id 정규화 */
async function resolveDepartmentId(raw) {
  const value = S(pickFirst(raw));
  if (value === '') return null;

  // 숫자/숫자문자열이면 그대로
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) return asNum;

  // 정확 일치 (한/영)
  let { data: exact, error: e1 } = await supabase
    .from('department')
    .select('id,name,name_eng')
    .or(`name.eq.${value},name_eng.eq.${value}`)
    .limit(1);
  if (e1) throw new HttpError(500, e1.message);
  if (exact?.length) return exact[0].id;

  // 부분 일치
  const { data: fuzzy, error: e2 } = await supabase
    .from('department')
    .select('id,name,name_eng')
    .or(`name.ilike.%${value}%,name_eng.ilike.%${value}%`)
    .limit(1);
  if (e2) throw new HttpError(500, e2.message);
  if (!fuzzy?.length) throw new HttpError(400, `학과를 찾을 수 없습니다: "${value}"`);
  return fuzzy[0].id;
}

/* ------------------------- 목록(관리자) ------------------------- */
/** GET /predictions?page=1&limit=10 */
router.get('/', corsMiddleware, async (req, res) => {
  try {
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

    if (error && error.code === 'PGRST116') return res.status(404).json({ message: '존재하지 않습니다.' });
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
    console.log('[POST /predictions] raw payload =', req.body);

    // 1) validator가 .trim()을 써도 안전하도록 문자열로 정규화
    const body = {
      name:        S(req.body?.name),
      student_id:  S(req.body?.student_id),
      phone:       S(req.body?.phone),
      first_place: S(pickFirst(req.body?.first_place)),
      second_place:S(pickFirst(req.body?.second_place)),
      third_place: S(pickFirst(req.body?.third_place)),
    };

    const errors = typeof validateCreate === 'function' ? (validateCreate(body) || []) : [];
    if (errors.length) {
      return res.status(400).json({ message: '유효성 오류', errors });
    }

    // 2) 중복 제출 방지
    const { data: existing, error: checkError } = await supabase
      .from('predictions').select('id').eq('student_id', body.student_id).single();
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existing) return res.status(409).json({ message: '이미 제출된 학번입니다. 한 번만 제출 가능합니다.' });

    // 3) 학과값 → department.id 정규화
    const [firstId, secondId, thirdId] = await Promise.all([
      resolveDepartmentId(body.first_place),
      resolveDepartmentId(body.second_place),
      resolveDepartmentId(body.third_place),
    ]);

    // 4) 저장 (predictions.first/second/third_place = bigint FK)
    const insertPayload = {
      name: body.name,
      student_id: body.student_id,
      phone: body.phone,
      first_place: firstId,
      second_place: secondId,
      third_place: thirdId,
      created_at: new Date().toISOString(),
    };
    console.log('[POST /predictions] insertPayload =', insertPayload);

    const { data, error } = await supabase
      .from('predictions')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      if (error.code === '23503') return res.status(400).json({ message: '존재하지 않는 학과 ID입니다.', detail: error.message });
      if (error.code === '23505') return res.status(409).json({ message: '이미 제출된 학번입니다.' });
      if (error.code === '22P02') return res.status(400).json({ message: '잘못된 데이터 형식입니다.', detail: error.message });
      if (error.code === '42501' || error.code === 'PGRST301') return res.status(403).json({ message: '권한이 없습니다. (RLS/권한 설정)', detail: error.message });
      throw error;
    }

    return res.status(201).json({
      message: '승부예측 제출 완료',
      data: {
        id: data.id,
        name: data.name,
        student_id: data.student_id,
        phone: data.phone,
        first_place: data.first_place,   // department.id
        second_place: data.second_place,
        third_place: data.third_place,
        created_at: data.created_at,
      },
    });
  } catch (err) {
    // .trim 타입 에러를 400으로 매핑
    if (typeof err?.message === 'string' && err.message.includes('trim is not a function')) {
      console.error('[POST /predictions] trim-type error:', err);
      return res.status(400).json({
        message: '요청 형식 오류',
        error: 'first_place/second_place/third_place는 문자열 또는 숫자여야 합니다.',
      });
    }
    const status = err.status || 500;
    console.error('[POST /predictions] error =', err);
    return res.status(status).json({ message: status === 500 ? '서버 오류' : '요청 오류', error: err.message, code: err.code });
  }
});

module.exports = router;
