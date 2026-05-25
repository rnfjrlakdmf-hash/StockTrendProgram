import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fix_nginx_cache():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # Clean up any lingering backup files in sites-enabled to prevent Nginx load issues
        ssh.exec_command("sudo rm -f /etc/nginx/sites-enabled/*.bak")
        
        # 1. Nginx 설정 파일 읽기
        # /etc/nginx/sites-enabled/ 디렉토리 내의 파일명을 찾아서 수정합시다.
        stdin, stdout, stderr = ssh.exec_command("ls /etc/nginx/sites-enabled/")
        files = stdout.read().decode('utf-8', 'ignore').strip().split()
        if not files:
            print("No nginx config file found in sites-enabled!")
            return
            
        config_file = f"/etc/nginx/sites-enabled/{files[0]}"
        print(f"Reading config from: {config_file}")
        
        # 만약 최초 백업본이 존재하면 우선 복원하여 깨끗한 상태에서 시작합니다.
        ssh.exec_command(f"sudo cp /tmp/{files[0]}.bak {config_file} 2>/dev/null || true")
        
        stdin, stdout, stderr = ssh.exec_command(f"cat {config_file}")
        config_content = stdout.read().decode('utf-8', 'ignore')
        
        # 2. 캐시 헤더 주입
        # Frontend pages (Next.js Application) location / 블록 내부에 헤더 추가
        target_location = "location / {"
        replacement_location = """location / {
        # Next.js의 기본 캐시 헤더를 무시하고 덮어씁니다 (v2.9.10 캐시 꼬임 방지)
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header X-Version "2.9.10-cache-busted" always;
        """
        
        if target_location in config_content:
            if "no-store" not in config_content:
                new_content = config_content.replace(target_location, replacement_location)
                
                # 원격 서버에 임시 파일로 작성 후 sudo mv로 교체
                sftp = ssh.open_sftp()
                temp_path = "/tmp/nginx_temp_config"
                with sftp.file(temp_path, 'w') as f:
                    f.write(new_content)
                sftp.close()
                
                # 백업본을 만들고 교체
                print("Updating Nginx configuration...")
                ssh.exec_command(f"sudo cp {config_file} /tmp/{files[0]}.bak")
                stdin, stdout, stderr = ssh.exec_command(f"sudo mv {temp_path} {config_file}")
                err = stderr.read().decode('utf-8')
                if err:
                    print("Error moving config:", err)
                    
                # 3. Nginx 설정 문법 테스트 및 리로드
                print("Testing Nginx config...")
                stdin, stdout, stderr = ssh.exec_command("sudo nginx -t")
                nginx_t_err = stderr.read().decode('utf-8')
                print(nginx_t_err)
                
                if "syntax is ok" in nginx_t_err and "test is successful" in nginx_t_err:
                    print("Reloading Nginx...")
                    stdin, stdout, stderr = ssh.exec_command("sudo systemctl reload nginx")
                    print(stdout.read().decode('utf-8'))
                    print("Nginx reloaded successfully with cache-busting headers!")
                else:
                    print("Nginx syntax test failed! Reverting back...")
                    ssh.exec_command(f"sudo cp /tmp/{files[0]}.bak {config_file}")
                    ssh.exec_command("sudo systemctl reload nginx")
            else:
                print("Cache-busting headers already present in Nginx config.")
        else:
            print("Could not find 'location / {' in config file.")
            
        # 4. 결과 curl 확인
        stdin, stdout, stderr = ssh.exec_command("curl -sI https://stock-trend-program.co.kr/settings")
        print("\n=== External Domain Curl Headers After Fix ===")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    fix_nginx_cache()
