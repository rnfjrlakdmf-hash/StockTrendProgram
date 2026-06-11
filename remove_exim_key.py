import os
env_path = '/home/ubuntu/StockTrendProgram/backend/.env'
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    with open(env_path, 'w') as f:
        for line in lines:
            if 'EXIM_AUTH_KEY' not in line:
                f.write(line)
