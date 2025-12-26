// 인증 확인 미들웨어
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
  next();
}

// 선택적 인증 미들웨어 (로그인 여부만 확인, 에러는 발생시키지 않음)
export function optionalAuth(req, res, next) {
  // 세션에 userId가 있으면 인증된 것으로 간주
  req.isAuthenticated = !!req.session.userId;
  next();
}
