import bcrypt from 'bcryptjs';

export function setupAuthAPI(app, supabaseClient) {
  const supabase = supabaseClient;

  // 회원가입
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, username } = req.body;

    // 입력값 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일 형식이 아닙니다.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.'
      });
    }

    // 비밀번호 해싱
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          username: username || null
        }
      ])
      .select('id, email, username, created_at')
      .single();

    if (error) {
      console.error('User creation error:', error);
      return res.status(500).json({
        success: false,
        message: '회원가입 중 오류가 발생했습니다.'
      });
    }

    // 세션 생성
    req.session.userId = newUser.id;
    req.session.userEmail = newUser.email;

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  });

  // 로그인
  app.post('/api/auth/login', async (req, res) => {
    try {
    const { email, password } = req.body;

    // 입력값 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 세션 생성
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  });

  // 로그아웃
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: '로그아웃 중 오류가 발생했습니다.'
        });
      }
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: '로그아웃 되었습니다.'
      });
    });
  });

  // 현재 사용자 정보 조회
  app.get('/api/auth/me', async (req, res) => {
    try {
    console.log('=== /api/auth/me Debug ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    console.log('Session userId:', req.session?.userId);
    console.log('Cookie:', req.headers.cookie);

    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, created_at')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      }
    });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  });
}
