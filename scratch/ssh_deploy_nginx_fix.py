import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fix_nginx_and_deploy():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. Read existing nginx configuration
        print("\n=== Reading Current Nginx Configuration ===")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/default")
        config_content = stdout.read().decode('utf-8', 'ignore')
        
        # 2. Add Cache-Control headers to disable browser caching on root path HTML
        target_block = "location / {"
        header_line = '\n        # Disable HTML caching so users always see the latest build upon refresh\n        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";'
        
        if "no-store, no-cache" not in config_content:
            print("Injecting Cache-Control headers into Nginx location / block...")
            modified_config = config_content.replace(
                target_block,
                target_block + header_line
            )
            
            # Write modified config back via a temp file on server
            sftp = ssh.open_sftp()
            temp_path = "/tmp/nginx_default_temp"
            with sftp.file(temp_path, "w") as f:
                f.write(modified_config)
            sftp.close()
            
            # Copy temp file to active config path with sudo and reload nginx
            print("Applying new configuration and reloading Nginx...")
            stdin, stdout, stderr = ssh.exec_command("sudo cp /tmp/nginx_default_temp /etc/nginx/sites-available/default")
            stdout.read() # Wait for completion
            
            stdin, stdout, stderr = ssh.exec_command("sudo nginx -t")
            nginx_t_err = stderr.read().decode('utf-8', 'ignore')
            if "successful" in nginx_t_err or "ok" in nginx_t_err:
                stdin, stdout, stderr = ssh.exec_command("sudo systemctl reload nginx")
                print("Nginx reloaded successfully!")
            else:
                print(f"Nginx config test failed: {nginx_t_err}")
        else:
            print("Cache-Control header is already present in Nginx config.")
            
        # 3. Clean PM2 Next.js process and restart
        print("\n=== Restarting PM2 Next.js application ===")
        stdin, stdout, stderr = ssh.exec_command("bash -l -c 'pm2 reload 0 || pm2 restart 0'")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 4. Success Output
        print("\n=== Verification ===")
        stdin, stdout, stderr = ssh.exec_command("curl -I http://127.0.0.1:3000/")
        print("Local test headers (Next.js):")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        stdin, stdout, stderr = ssh.exec_command("curl -I http://127.0.0.1/")
        print("Local Nginx headers:")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
        print("Done!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    fix_nginx_and_deploy()
