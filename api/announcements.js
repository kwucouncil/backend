// api/announcements.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');
const { validateCreate } = require('../validators/announcement');

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
  allowedHeaders: ['Content-Type'],
});

router.options('/', corsMiddleware);
router.options('/:id', corsMiddleware);

/** 목록 조회: GET /announcements?page=1&limit=10&q=검색어 */
router.get('/', corsMiddleware, async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const from = (page - 1) * limit;
    const to   = from + limit - 1;
    const q    = (req.query.q || '').trim();

    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(from, to);

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ page, limit, total: count || 0, items: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

/** 단건 조회: GET /announcements/:id */
router.get('/:id', corsMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
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

/** 생성(게시): POST /announcements  — 누구나 가능 */
router.post('/', corsMiddleware, async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ message: '유효성 오류', errors });

    const title = String(req.body.title).trim();
    const content = String(req.body.content).trim();
    const image = String(req.body.image).trim();
    const publishedAtIso = req.body.published_at && !isNaN(Date.parse(req.body.published_at))
      ? new Date(req.body.published_at).toISOString()
      : new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .insert([{ title, content, image, published_at: publishedAtIso }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: '게시 완료', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
