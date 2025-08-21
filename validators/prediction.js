// validators/prediction.js
exports.validateCreate = (body) => {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('잘못된 요청 본문입니다.');
    return errors;
  }
  
  const { name, student_id, phone, first_place, second_place, third_place } = body || {};
  
  // 이름 검증
  if (!name || !String(name).trim()) {
    errors.push('name은(는) 필수입니다.');
  }
  
  // 학번 검증 (10자리 숫자)
  if (!student_id || !String(student_id).trim()) {
    errors.push('student_id는(은) 필수입니다.');
  } else if (!/^\d{10}$/.test(String(student_id).trim())) {
    errors.push('student_id는 10자리 숫자여야 합니다.');
  }
  
  // 전화번호 검증 (010-0000-0000 형식)
  if (!phone || !String(phone).trim()) {
    errors.push('phone은(는) 필수입니다.');
  } else if (!/^010-\d{4}-\d{4}$/.test(String(phone).trim())) {
    errors.push('phone 형식이 올바르지 않습니다. (예: 010-1234-5678)');
  }
  
  // 1등 학과 검증
  if (!first_place || !String(first_place).trim()) {
    errors.push('first_place는(은) 필수입니다.');
  }
  
  // 2등 학과 검증
  if (!second_place || !String(second_place).trim()) {
    errors.push('second_place는(은) 필수입니다.');
  }
  
  // 3등 학과 검증
  if (!third_place || !String(third_place).trim()) {
    errors.push('third_place는(은) 필수입니다.');
  }
  
  // 중복 학과 검증
  if (first_place && second_place && third_place) {
    const places = [first_place.trim(), second_place.trim(), third_place.trim()];
    const uniquePlaces = [...new Set(places)];
    if (uniquePlaces.length !== 3) {
      errors.push('1등, 2등, 3등 학과는 모두 달라야 합니다.');
    }
  }
  
  return errors;
};
