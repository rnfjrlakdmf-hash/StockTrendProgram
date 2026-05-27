import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def read_remote_file():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # getChartData() 함수 부분의 코드를 봅니다.
        cmd = "grep -A 20 'const getChartData = ()' /home/ubuntu/StockTrendProgram/frontend/src/components/TurboQuantIndicators.tsx"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("=== getChartData ===")
        print(stdout.read().decode('utf-8'))
        
        # filteredRows 부분의 코드를 봅니다.
        cmd2 = "grep -A 10 'const filteredRows =' /home/ubuntu/StockTrendProgram/frontend/src/components/TurboQuantIndicators.tsx"
        stdin, stdout, stderr = ssh.exec_command(cmd2)
        print("=== filteredRows ===")
        print(stdout.read().decode('utf-8'))
        
    except Exception as e:
        print("Error:", e)
    finally:
        ssh.close()

if __name__ == "__main__":
    read_remote_file()
