import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', key_filename='StockAI-Server.pem')

# Add the Discord Webhook URL to the remote .env
webhook_url = "https://discord.com/api/webhooks/1514788883488047117/QVz7iIkI-nv40n8anXKIiy8Rmj8erbfoydOWt4hmzteNmXqlWE0SC5azreZs4XTu0tEa"
commands = [
    f"grep -q 'DISCORD_WEBHOOK_URL' /home/ubuntu/StockTrendProgram/backend/.env || echo '\nDISCORD_WEBHOOK_URL=\"{webhook_url}\"' >> /home/ubuntu/StockTrendProgram/backend/.env",
    f"sed -i 's|DISCORD_WEBHOOK_URL=.*|DISCORD_WEBHOOK_URL=\"{webhook_url}\"|' /home/ubuntu/StockTrendProgram/backend/.env",
    "sudo systemctl restart stocktrend-backend.service",
    "sudo systemctl status stocktrend-backend.service | grep Active"
]

for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

print("Completed updating remote .env and restarted backend!")
