const fs = require('fs');
const path = require('path');

const loadData = (filename) => {
  const filePath = path.resolve(process.cwd(), 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};


// 서버리스 함수로 API 정의
export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST 메서드만 허용됩니다.' });
  }

  const { name, birth_date, student_id } = req.body;
  if (!name || (!birth_date && !student_id)) {
    return res.status(400).json({ message: '이름과 필요한 정보를 입력해 주세요.' });
  }

  try {
    if (birth_date) {
      // 신입생 확인
      const freshmenData = loadData('freshmen.json');
      const result = freshmenData.find(freshman => freshman.name === name && freshman.birth_date === birth_date);
      if (result) {
        return res.status(200).json({ found: true, message: '신입생 정보가 확인되었습니다.' });
      } else {
        return res.status(404).json({ found: false, message: '신입생 정보를 찾을 수 없습니다.' });
      }
    } else if (student_id) {
      // 재학생 확인
      const studentsData = loadData('students.json');
      const result = studentsData.find(student => student.name === name && student.student_id === student_id);
      if (result) {
        return res.status(200).json({ found: true, message: '재학생 정보가 확인되었습니다.' });
      } else {
        return res.status(404).json({ found: false, message: '재학생 정보를 찾을 수 없습니다.' });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
