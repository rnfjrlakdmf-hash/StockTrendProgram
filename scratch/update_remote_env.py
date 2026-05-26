import paramiko
import sys

def update_env():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("Connecting to remote EC2 server...")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. Update .env
        import sys
        if len(sys.argv) < 2:
            print("Usage: python update_remote_env.py <NEW_GEMINI_API_KEY>")
            return
        new_key = sys.argv[1]
        
        # Read the current key from EC2 .env to replace it dynamically
        print("Reading current .env...")
        stdin, stdout, stderr = ssh.exec_command("cat /home/ubuntu/StockTrendProgram/backend/.env")
        current_env = stdout.read().decode('utf-8')
        
        # Find current GEMINI_API_KEY line
        import re
        updated_env = []
        found = False
        for line in current_env.split('\n'):
            if line.startswith("GEMINI_API_KEY="):
                updated_env.append(f"GEMINI_API_KEY={new_key}")
                found = True
            else:
                updated_env.append(line)
        if not found:
            updated_env.append(f"GEMINI_API_KEY={new_key}")
            
        new_env_content = '\n'.join(updated_env)
        
        # Write back to EC2
        print("Writing updated .env to EC2...")
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/StockTrendProgram/backend/.env", "w") as f:
            f.write(new_env_content)
        sftp.close()
        print(".env updated successfully!")
            
        # 2. Restart backend service to apply env changes
        print("Restarting backend service...")
        ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
        print("Restart command sent!")
        
        ssh.close()
        print("Disconnected.")
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    update_env()
