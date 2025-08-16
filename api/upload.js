// api/upload.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { supabase } = require('../lib/supabaseClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
  methods: ['POST','OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

router.options('/', corsMiddleware);

router.post('/', corsMiddleware, upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: '파일이 없습니다.' });

    const filename = `${Date.now()}_${file.originalname}`;
    const path = `images/${filename}`;
    const bucket = process.env.STORAGE_BUCKET || 'announcements';

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ message: 'Storage 업로드 실패' });
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return res.status(200).json({ message: '업로드 성공', url: pub.publicUrl, path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
