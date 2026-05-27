import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def build_frontend():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("Connecting to remote EC2 server...")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. Run npm run build & pm2 restart
        print("\n=== Building Frontend on EC2 (Next.js) ===")
        # Next.js build uses memory, swap is already configured so it should be fine.
        build_cmd = (
            "cd /home/ubuntu/StockTrendProgram/frontend && "
            "npm run build"
        )
        stdin, stdout, stderr = ssh.exec_command(build_cmd)
        
        # We need to wait for build to complete. Build output will print progress.
        for line in iter(stdout.readline, ""):
            print(line, end="")
            
        err = stderr.read().decode('utf-8')
        if err:
            print("\nBuild Stderr/Warnings:")
            print(err)
            
        print("\n=== Restarting PM2 frontend service ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart stocktrend-frontend")
        print(stdout.read().decode('utf-8'))
        
        ssh.close()
        print("\n=== Frontend Build and Deployment Completed! ===")
    except Exception as e:
        print("Failed to deploy frontend:", e)

if __name__ == "__main__":
    build_frontend()
