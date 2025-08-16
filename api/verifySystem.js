// api/verifySystem.js
const fs = require('fs');
const path = require('path');

// 공통 JSON 로더
const loadData = (filename) => {
  const filePath = path.resolve(process.cwd(), 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

/**
 * 신입/재학생 상태 확인
 * @param {{name:string, birth_date?:string, student_id?:string}} param0
 * @returns {{ code:number, payload?:object, message?:string }}
 */
function checkStatus({ name, birth_date, student_id }) {
  // 기본 검증
  if (!name || (!birth_date && !student_id)) {
    return { code: 400, message: '이름과 필요한 정보를 입력해 주세요.' };
  }

  try {
    // 신입생 케이스 (birth_date 존재)
    if (birth_date) {
      const freshmenData = loadData('freshmen.json');
      const result = freshmenData.find(
        (f) => f.name === name && f.birth_date === birth_date
      );

      if (!result) {
        return { code: 404, message: '신입생 정보를 찾을 수 없습니다.' };
      }

      const payload = {
        is_form: result.is_form,
        is_cost: result.is_cost,
        result: !!(result.is_form && result.is_cost),
      };
      return { code: 200, payload };
    }

    // 재학생 케이스 (student_id 존재)
    if (student_id) {
      const studentsData = loadData('students.json');
      const result = studentsData.find(
        (s) => s.name === name && s.student_id === student_id
      );

      if (!result) {
        return { code: 404, message: '재학생 정보를 찾을 수 없습니다.' };
      }

      const payload = {
        is_form: result.is_form,
        is_cost: result.is_cost,
        result: !!(result.is_form && result.is_cost),
      };
      return { code: 200, payload };
    }

    // 여기는 보통 도달하지 않음
    return { code: 400, message: '요청이 올바르지 않습니다.' };
  } catch (e) {
    console.error('데이터 처리 오류:', e);
    return {
      code: 500,
      message: '데이터 처리 중 오류가 발생했습니다.',
    };
  }
}

module.exports = { checkStatus };
