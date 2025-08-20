// validators/minutes.js
exports.validateCreate = (body) => {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('잘못된 요청 본문입니다.');
    return errors;
  }
  
  const { title, file_url, date } = body || {};
  
  // title 검증 (non-empty)
  if (!title || !String(title).trim()) {
    errors.push('title은(는) 필수입니다.');
  }
  
  // file_url 검증 (non-empty URL string)
  if (!file_url || !String(file_url).trim()) {
    errors.push('file_url은(는) 필수입니다.');
  } else {
    try {
      const url = new URL(file_url);
      if (!url.protocol.startsWith('http')) {
        errors.push('file_url은(는) 유효한 HTTP/HTTPS URL이어야 합니다.');
      }
    } catch (e) {
      errors.push('file_url은(는) 유효한 URL 형식이어야 합니다.');
    }
  }
  
  // date 검증 (YYYY-MM-DD 유효)
  if (!date || !String(date).trim()) {
    errors.push('date은(는) 필수입니다.');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      errors.push('date은(는) YYYY-MM-DD 형식이어야 합니다.');
    } else {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('date은(는) 유효한 날짜여야 합니다.');
      }
    }
  }
  
  return errors;
};
