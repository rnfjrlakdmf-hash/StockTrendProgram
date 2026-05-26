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
        cmd_update = (
            "sed -i 's/GEMINI_API_KEY=AIzaSyDU5giE3iwE81iJqv7UQq2CAmtyAL73SnE/GEMINI_API_KEY=AIzaSyBqq9q7MwAFJonKzabpUbYQBKArKFofbX4/g' "
            "/home/ubuntu/StockTrendProgram/backend/.env"
        )
        print("Updating remote .env...")
        stdin, stdout, stderr = ssh.exec_command(cmd_update)
        err = stderr.read().decode('utf-8')
        if err:
            print("Error updating .env:", err)
        else:
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
