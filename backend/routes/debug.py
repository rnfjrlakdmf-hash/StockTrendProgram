
from fastapi import APIRouter
import os
import sys
import platform

router = APIRouter()

@router.get("/debug/env")
def read_env():
    try:
        import pandas as pd
        pandas_ver = pd.__version__
    except Exception as e:
        pandas_ver = f"Error: {e}"
        
    try:
        import numpy as np
        numpy_ver = np.__version__
    except Exception as e:
        numpy_ver = f"Error: {e}"

    git_log = "Unknown"
    try:
        import subprocess
        git_log = subprocess.check_output(["git", "log", "-1", "--oneline"]).decode().strip()
    except Exception as e:
        git_log = f"Error: {e}"

    return {
        "os": platform.system(),
        "python": sys.version,
        "pandas": pandas_ver,
        "numpy": numpy_ver,
        "cwd": os.getcwd(),
        "env_keys": list(os.environ.keys()),
        "db_path_exists": os.path.exists("/tmp/stock_app.db"),
        "git_log": git_log,
        "test_timestamp": "2026-05-20 23:38:00"
    }
