import paramiko
import os

def test_ssh():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    usernames = ["ubuntu", "ec2-user", "admin", "root", "bitnami", "centos", "debian"]
    
    print(f"Loading private key from {key_path}...")
    try:
        key = paramiko.RSAKey.from_private_key_file(key_path)
    except Exception as e:
        print(f"Failed to load private key: {e}")
        return
        
    for username in usernames:
        print(f"Connecting to {username}@{hostname}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            ssh.connect(hostname, username=username, pkey=key, timeout=5)
            print(f"Connected successfully as {username}!")
            
            # Test command
            stdin, stdout, stderr = ssh.exec_command("uname -a; whoami")
            print("Stdout:", stdout.read().decode())
            print("Stderr:", stderr.read().decode())
            
            ssh.close()
            return
        except Exception as e:
            print(f"SSH connection failed for {username}: {e}")

if __name__ == "__main__":
    test_ssh()
