// api/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS (기존 화이트리스트 유지)
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
  allowedHeaders: ['Content-Type','X-Requested-With'],
});

app.use(express.json());
app.use(corsMiddleware);

// 헬스체크
app.get('/', (_, res) => res.send('OK'));

// ✅ 라우트 연결 (이미 구현됨)
app.use('/upload', require('./upload'));          // /upload 라우터
app.use('/announcements', require('./announcements')); // /announcements 라우터
app.use('/minutes', require('./minutes'));        // /minutes 라우터
app.use('/predictions', require('./predictions')); // /predictions 라우터

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
