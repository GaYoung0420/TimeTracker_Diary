# Render 배포 후 이미지 업로드 오류 해결 방법

## 문제
Render에 배포한 사이트에서 이미지를 업로드하면 "업로드 중 오류가 발생했습니다" 메시지가 표시됩니다.

## 원인
1. Supabase Storage 버킷 권한 설정 누락
2. CORS 설정 문제
3. 환경 변수 누락

## 해결 방법

### 1. Supabase Storage 설정 (필수! ⭐)

1. **Supabase Dashboard 접속**: https://app.supabase.com
2. 프로젝트 선택
3. 좌측 메뉴에서 **Storage** 클릭
4. **diary-images** 버킷 확인 (없으면 생성)

#### 버킷이 없는 경우:
- **Create bucket** 클릭
- Bucket name: `diary-images`
- **Public bucket** 체크 ✅ (중요!)
- Create 클릭

#### 버킷이 이미 있는 경우:
- `diary-images` 버킷 클릭
- 우측 상단 ⚙️ (Settings) 클릭
- **Public access** 확인
  - Public이 아니면 **Make public** 클릭

#### RLS (Row Level Security) 정책 설정:
1. Storage 페이지에서 **Policies** 탭 클릭
2. `diary-images` 버킷의 정책 확인
3. 다음 정책들이 필요합니다:

**INSERT 정책 (업로드 허용)**:
```sql
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'diary-images');
```

**SELECT 정책 (읽기 허용)**:
```sql
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diary-images');
```

**DELETE 정책 (삭제 허용)**:
```sql
CREATE POLICY "Anyone can delete images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'diary-images');
```

#### 간편한 방법:
Supabase Storage 페이지에서 `diary-images` 버킷 선택 후:
- **Policies** 탭 클릭
- **New Policy** 클릭
- **For full customization** 선택
- 또는 **Get started quickly** 에서 템플릿 선택

### 2. Render Backend 환경 변수 확인

Render Dashboard에서 Backend 서비스 선택 후:
1. **Environment** 탭 클릭
2. 다음 변수들이 설정되어 있는지 확인:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NODE_ENV=production`
   - (선택) `FRONTEND_URL=https://timetracker-diary.onrender.com`

### 3. 프론트엔드 재빌드 및 배포

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# Git 커밋 및 푸시
cd ..
git add .
git commit -m "Fix image upload - Add production env and update CORS"
git push
```

Render가 자동으로 재배포합니다.

### 4. 배포 후 테스트

1. 백엔드 서버 확인:
   - https://timetracker-backend.onrender.com/api/health
   - 결과: `{"status":"ok","message":"TimeTracker API is running"}`

2. Storage 테스트:
   - https://timetracker-backend.onrender.com/api/test/storage
   - `uploadTest.success: true` 확인

3. 프론트엔드에서 이미지 업로드 테스트

### 5. 여전히 문제가 있다면

#### 브라우저 개발자 도구 확인:
1. F12 (개발자 도구) 열기
2. **Console** 탭에서 에러 메시지 확인
3. **Network** 탭에서 실패한 요청 확인
   - `/api/images/upload` 요청의 상태 코드와 응답 확인

#### 일반적인 에러 메시지:

**"new row violates row-level security policy"**
→ Supabase Storage RLS 정책 설정 필요 (위 1번 참고)

**"CORS policy: No 'Access-Control-Allow-Origin' header"**
→ Backend CORS 설정 문제 (이미 수정됨)

**"Bucket not found"**
→ `diary-images` 버킷 생성 필요

**"413 Payload Too Large"**
→ 이미지 크기가 너무 큼 (5MB 제한)

## 중요 체크리스트

- [ ] Supabase Storage에 `diary-images` 버킷 생성
- [ ] 버킷을 **Public**으로 설정
- [ ] Storage RLS 정책 설정 (INSERT, SELECT, DELETE)
- [ ] Render Backend 환경 변수 설정
- [ ] 프론트엔드 `.env.production` 파일 생성
- [ ] Git push 후 Render 재배포
- [ ] 배포 후 Storage 테스트 API 확인
- [ ] 실제 이미지 업로드 테스트

## 추가 참고

- Supabase Storage 문서: https://supabase.com/docs/guides/storage
- Render 배포 로그: Render Dashboard > 서비스 선택 > Logs 탭
