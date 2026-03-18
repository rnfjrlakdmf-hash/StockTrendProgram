import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.main import app

for route in app.routes:
    if hasattr(route, 'path'):
        print(f"Path: {route.path}, Methods: {route.methods}")
