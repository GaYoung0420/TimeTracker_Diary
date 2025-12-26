# HTTPS 설정 가이드 - timetrackerdiary.duckdns.org

## 개요

DuckDNS 도메인 `timetrackerdiary.duckdns.org`에 Let's Encrypt SSL 인증서를 설정하여 HTTPS를 활성화합니다.

---

## 사전 준비

### 1. DuckDNS 토큰 확인

1. https://www.duckdns.org 접속 (로그인)
2. 페이지 상단에서 **Token** 복사 (나중에 사용)

### 2. DuckDNS IP 설정 확인

DuckDNS 페이지에서:
- 도메인: `timetrackerdiary`
- IP: `140.238.17.14` (서버 IP와 일치해야 함)

---

## 자동 설정 (추천)

### 1단계: 스크립트를 서버로 복사

로컬 컴퓨터에서:

```bash
# 스크립트 파일을 서버로 복사
scp -i ~/.ssh/oracle_key https-setup.sh ubuntu@140.238.17.14:~/
scp -i ~/.ssh/oracle_key duckdns-update.sh ubuntu@140.238.17.14:~/
```

### 2단계: 서버에 접속

```bash
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14
```

### 3단계: DuckDNS 자동 업데이트 설정

```bash
# DuckDNS 업데이트 스크립트 설정
mkdir -p ~/duckdns
cd ~/duckdns

# 에디터로 스크립트 생성
nano duck.sh
```

다음 내용 입력 (YOUR_TOKEN을 실제 토큰으로 변경):

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=timetrackerdiary&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

실행 권한 부여:

```bash
chmod 700 duck.sh
```

크론탭 설정 (5분마다 IP 업데이트):

```bash
crontab -e

# 다음 라인 추가
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

### 4단계: HTTPS 설정 스크립트 실행

```bash
# 스크립트 실행 권한 부여
chmod +x ~/https-setup.sh

# 스크립트 실행 (sudo 필요)
sudo ./https-setup.sh
```

스크립트가 자동으로 다음을 수행합니다:
1. ✅ Nginx 설치
2. ✅ Certbot (Let's Encrypt) 설치
3. ✅ Nginx 설정 파일 생성
4. ✅ SSL 인증서 발급
5. ✅ 자동 갱신 설정
6. ✅ 방화벽 설정

### 5단계: 백엔드 시작 (PM2 사용)

```bash
# PM2 설치
sudo npm install -g pm2

# 백엔드 시작
cd ~/TimeTracker_Diary/backend
pm2 start src/index.js --name timetracker-backend

# 서버 재부팅 시 자동 시작
pm2 startup
pm2 save

# 상태 확인
pm2 status
```

---

## 수동 설정 (단계별)

자동 스크립트를 사용하지 않는 경우:

### 1. Nginx 설치

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Certbot 설치

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 3. Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/timetracker
```

설정 내용은 `https-setup.sh` 스크립트 참조

### 4. SSL 인증서 발급

```bash
sudo certbot --nginx -d timetrackerdiary.duckdns.org
```

---

## 배포 후 확인

### 1. HTTPS 접속 테스트

브라우저에서:
```
https://timetrackerdiary.duckdns.org
```

### 2. SSL 인증서 확인

```bash
sudo certbot certificates
```

출력 예시:
```
Found the following certs:
  Certificate Name: timetrackerdiary.duckdns.org
    Domains: timetrackerdiary.duckdns.org
    Expiry Date: 2025-03-26 (VALID: 89 days)
```

### 3. 서비스 상태 확인

```bash
# Nginx 상태
sudo systemctl status nginx

# 백엔드 상태
pm2 status

# 백엔드 로그
pm2 logs timetracker-backend
```

---

## 코드 업데이트 배포

코드 수정 후 서버에 반영:

```bash
# 로컬에서 (Git push)
git add .
git commit -m "Update code"
git push

# 서버에서 (자동 배포 스크립트)
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 << 'EOF'
cd ~/TimeTracker_Diary
git pull
cd frontend
npm run build
pm2 restart timetracker-backend
EOF
```

또는 간단하게:

```bash
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "cd TimeTracker_Diary && git pull && cd frontend && npm run build && pm2 restart timetracker-backend"
```

---

## 트러블슈팅

### 1. SSL 인증서 발급 실패

**원인:**
- 도메인이 서버 IP를 가리키지 않음
- 포트 80/443이 막혀 있음

**해결:**
```bash
# DNS 확인
nslookup timetrackerdiary.duckdns.org

# 포트 확인
sudo netstat -tlnp | grep -E ':(80|443)'

# 방화벽 확인 (Oracle Cloud)
# 웹 콘솔에서 Security List에서 80, 443 포트 열기
```

### 2. 502 Bad Gateway 오류

**원인:** 백엔드가 실행되지 않음

**해결:**
```bash
# 백엔드 확인
curl http://localhost:5000/api/health

# 백엔드 재시작
pm2 restart timetracker-backend

# 로그 확인
pm2 logs
```

### 3. Mixed Content 오류 (콘솔)

**원인:** 프론트엔드에서 HTTP API 호출

**해결:**
`frontend/src/utils/api.js` 파일이 이미 상대 URL을 사용하므로 문제없음

### 4. 인증서 갱신 실패

```bash
# 수동 갱신 시도
sudo certbot renew --dry-run

# 강제 갱신
sudo certbot renew --force-renewal
```

---

## SSL 인증서 자동 갱신

Let's Encrypt 인증서는 90일마다 갱신이 필요합니다.

Certbot이 자동으로 크론탭에 등록되어 있습니다:

```bash
# 크론탭 확인
sudo systemctl status certbot.timer

# 수동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 방화벽 설정 (Oracle Cloud)

Oracle Cloud에서는 인스턴스 방화벽과 별도로 Security List 설정이 필요합니다:

### 1. Oracle Cloud Console 접속

1. https://cloud.oracle.com 로그인
2. **Compute** → **Instances** 클릭
3. 인스턴스 선택
4. **Primary VNIC** 클릭
5. **Subnet** 클릭
6. **Security Lists** 클릭

### 2. Ingress Rules 추가

**Rule 1 - HTTP:**
```
Source: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 80
```

**Rule 2 - HTTPS:**
```
Source: 0.0.0.0/0
IP Protocol: TCP
Destination Port: 443
```

### 3. 인스턴스 방화벽 설정

```bash
# UFW 설정
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# 또는 iptables 직접 설정
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 성능 최적화 (선택사항)

### 1. Nginx 캐싱

이미 스크립트에 포함됨:
- Gzip 압축
- 정적 파일 캐싱 (1년)

### 2. PM2 클러스터 모드

```bash
# 멀티코어 활용
pm2 start src/index.js -i max --name timetracker-backend
pm2 save
```

### 3. 로그 로테이션

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 최종 체크리스트

- [x] DuckDNS 도메인 생성 (`timetrackerdiary.duckdns.org`)
- [ ] DuckDNS IP 업데이트 스크립트 실행
- [ ] `https-setup.sh` 스크립트 실행
- [ ] SSL 인증서 발급 확인
- [ ] 백엔드 PM2로 실행
- [ ] https://timetrackerdiary.duckdns.org 접속 확인
- [ ] 자동 갱신 설정 확인

---

## 비용

**모두 무료입니다!**
- DuckDNS: 무료
- Let's Encrypt SSL: 무료
- Nginx: 무료
- PM2: 무료

---

## 다음 단계

1. ✅ HTTPS 설정 완료
2. ✅ 도메인으로 접속 가능
3. 선택사항:
   - Google OAuth callback URL 업데이트
   - Analytics 추가
   - 모니터링 설정

---

## 지원

질문이 있으면 언제든지 물어보세요!
