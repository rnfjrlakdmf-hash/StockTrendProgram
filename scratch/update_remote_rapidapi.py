import paramiko
import sys
import re

def update_rapidapi():
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
        
        # RAPIDAPI_KEY value
        new_key = "d15cb3c123mshb546ba08534f905p1810cdjsnd64667220570"
        
        # Read the current env from EC2
        print("Reading current .env...")
        stdin, stdout, stderr = ssh.exec_command("cat /home/ubuntu/StockTrendProgram/backend/.env")
        current_env = stdout.read().decode('utf-8')
        
        updated_env = []
        found = False
        for line in current_env.split('\n'):
            line_strip = line.strip()
            if not line_strip: continue
            if line_strip.startswith("RAPIDAPI_KEY="):
                updated_env.append(f"RAPIDAPI_KEY={new_key}")
                found = True
            else:
                updated_env.append(line_strip)
        if not found:
            updated_env.append(f"RAPIDAPI_KEY={new_key}")
            
        new_env_content = '\n'.join(updated_env) + '\n'
        
        # Write back to EC2 via SFTP
        print("Writing updated .env to EC2...")
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/StockTrendProgram/backend/.env", "w") as f:
            f.write(new_env_content)
        sftp.close()
        print(".env updated successfully!")
            
        # Restart backend service
        print("Restarting backend service...")
        ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
        print("Restart command sent!")
        
        ssh.close()
        print("Disconnected.")
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    update_rapidapi()
