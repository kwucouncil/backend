const fs = require('fs');
const path = require('path');
const cors = require('cors');

const loadData = (filename) => {
  const filePath = path.resolve(process.cwd(), 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// CORS 설정
const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:8080', 'https://kwucouncil.github.io'];
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`CORS 허용된 요청: ${origin}`);
      callback(null, true);
    } else {
      console.error(`CORS 차단된 요청: ${origin}`);
      callback(new Error('CORS 정책 위반'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],  // ✅ 헤더 허용
  credentials: false,
});

export default async (req, res) => {
  try {
    console.log(`요청 메서드: ${req.method}, 요청 URL: ${req.url}`);

    // CORS 처리
    await new Promise((resolve, reject) => corsMiddleware(req, res, (err) => {
      if (err) {
        console.error('CORS 미들웨어 오류:', err);
        res.status(403).json({ message: 'CORS 오류: 요청이 차단되었습니다.' });
        return reject(err);  // 흐름 종료
      }
      resolve();
    }));

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS 요청 성공');
      return res.status(200).end();
    }

    // POST 메서드 이외의 요청 거부
    if (req.method !== 'POST') {
      console.warn('허용되지 않은 메서드 요청');
      return res.status(405).json({ message: 'POST 메서드만 허용됩니다.' });
    }

    // 요청 데이터 검증
    const { name, birth_date, student_id } = req.body;
    if (!name || (!birth_date && !student_id)) {
      console.warn('필수 데이터 누락');
      return res.status(400).json({ message: '이름과 필요한 정보를 입력해 주세요.' });
    }

    // 비즈니스 로직 (신입생 및 재학생 확인)
    try {
      if (birth_date) {
        console.log('신입생 데이터 확인 시작');
        const freshmenData = loadData('freshmen.json');
        const result = freshmenData.find(freshman => freshman.name === name && freshman.birth_date === birth_date);
        if (result) {
          return res.status(200).json({ found: true, message: '신입생 정보가 확인되었습니다.' });
        } else {
          return res.status(404).json({ found: false, message: '신입생 정보를 찾을 수 없습니다.' });
        }
      } else if (student_id) {
        console.log('재학생 데이터 확인 시작');
        const studentsData = loadData('students.json');
        const result = studentsData.find(student => student.name === name && student.student_id === student_id);
        if (result) {
          return res.status(200).json({ found: true, message: '재학생 정보가 확인되었습니다.' });
        } else {
          return res.status(404).json({ found: false, message: '재학생 정보를 찾을 수 없습니다.' });
        }
      }
    } catch (dataError) {
      console.error('데이터 처리 오류:', dataError);
      return res.status(500).json({ message: '데이터 처리 중 오류가 발생했습니다.', error: dataError.message });
    }
  } catch (serverError) {
    console.error('서버 오류:', serverError);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: serverError.message });
  }
};
