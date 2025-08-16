// validators/announcement.js
exports.validateCreate = (body) => {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('잘못된 요청 본문입니다.');
  const { title, published_at, content, image } = body || {};
  if (!title || !String(title).trim()) errors.push('title은(는) 필수입니다.');
  if (!content || !String(content).trim()) errors.push('content는(은) 필수입니다.');
  if (!image || !String(image).trim()) errors.push('image는(은) 필수(URL)입니다.');
  if (published_at && isNaN(Date.parse(published_at))) errors.push('published_at 형식이 올바르지 않습니다.');
  return errors;
};
