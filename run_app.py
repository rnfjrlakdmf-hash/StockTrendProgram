import os
import sys
import subprocess
import time
import webview
import socket
import requests

# Global handles
backend_process = None
frontend_process = None

def get_base_path():
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    else:
        return os.path.dirname(os.path.abspath(__file__))

def kill_process(process):
    if process:
        try:
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)], creationflags=subprocess.CREATE_NO_WINDOW)
        except Exception:
            pass

def wait_for_server(url, timeout=60):
    """Wait for the server to be responsive"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            # Increased timeout to 2s to allow for slow responses during compile
            requests.get(url, timeout=2)
            return True
        except (requests.ConnectionError, requests.Timeout, requests.RequestException):
            time.sleep(1)
            continue
        except Exception:
            time.sleep(1)
            continue
    return False

def main():
    global backend_process, frontend_process
    
    base_dir = get_base_path()
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    
    # Locate Python in venv
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        # Fallback to system python if venv not found
        venv_python = "python"

    # Determine Local IP
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        print("Could not determine local IP, defaulting to localhost")
        pass
    
    print(f"DEBUG: Local IP determined as {local_ip}")

    # 1. Start Backend (FastAPI) - Listen on All Interfaces (0.0.0.0)
    print(f"Starting Backend Server (Availability: http://{local_ip}:8000)...")
    
    # Open log file
    log_file = open(os.path.join(base_dir, "app_startup.log"), "w")

    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"], 
        cwd=backend_dir, 
        stdout=log_file,
        stderr=log_file,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # 2. Start Frontend (Next.js) - Listen on All Interfaces
    print(f"Starting Frontend Server (Availability: http://{local_ip}:3000)...")
    # Using 'npm run dev -- -H 0.0.0.0' to expose Next.js
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev", "--", "-H", "0.0.0.0"], 
        cwd=frontend_dir, 
        shell=True,
        stdout=log_file,
        stderr=log_file,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # Show IP info to user
    print(f"\n[INFO] You can access this app from another computer at: http://{local_ip}:3000\n")

    # 3. Wait for Frontend
    print("Waiting for application to start (this may take a minute)...")
    
    try:
        # Check Backend first (Wait max 30s)
        print("Checking backend status...")
        wait_for_server('http://localhost:8000/docs', timeout=60)
        
        # Wait for frontend
        print("Checking frontend status...")
        if wait_for_server('http://localhost:3000', timeout=120):
            print("Application started!")
            webview.create_window(
                title=f'Stock Trend AI - (External Access: http://{local_ip}:3000)', 
                url='http://localhost:3000',
                width=1280, 
                height=900,
                resizable=True
            )
            webview.start()
        else:
            webview.create_window('Error', html='<h1>Timeout: Server took too long to start.</h1><p>Please check the log file (app_startup.log) and restart.</p>')
            webview.start()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        # 4. Cleanup on Exit
        print("Shutting down processes...")
        try:
            kill_process(frontend_process)
            kill_process(backend_process)
        except:
            pass
        if log_file:
            log_file.close()

if __name__ == '__main__':
    main()
