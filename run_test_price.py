import paramiko
k=paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('13.209.99.170', username='ubuntu', pkey=k)
script = '''
import asyncio
import sys
sys.path.append('/home/ubuntu/StockTrendProgram/backend')
from auto_price_alerts import auto_price_monitor
from db_manager import get_db_connection

async def test_price():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT user_id FROM fcm_tokens LIMIT 5")
    users = [r[0] for r in cursor.fetchall()]
    conn.close()

    print("Users to send to:", users)
    await auto_price_monitor.send_auto_push(
        symbol="005930",
        title_prefix="🚀 급등 포착",
        body="[삼성전자] 주식 가격이 12.3% 올랐어요!",
        users=users
    )

if __name__ == "__main__":
    asyncio.run(test_price())
'''
stdin, stdout, stderr = s.exec_command(f"cat << 'EOF' > /home/ubuntu/StockTrendProgram/test_price.py\n{script}\nEOF\n/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/test_price.py")
print('OUT:', stdout.read().decode('utf-8'))
print('ERR:', stderr.read().decode('utf-8'))
s.close()
