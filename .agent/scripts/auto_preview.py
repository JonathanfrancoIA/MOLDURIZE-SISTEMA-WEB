#!/usr/bin/env python3
"""
Auto Preview - Antigravity Kit
==============================
Manages (start/stop/status) the local development server for previewing the application.

Usage:
    python .agent/scripts/auto_preview.py start [port]
    python .agent/scripts/auto_preview.py stop
    python .agent/scripts/auto_preview.py status
"""

import os
import sys
import time
import json
import signal
import argparse
import subprocess
from pathlib import Path

# Force UTF-8 encoding for stdout and stderr to prevent UnicodeEncodeError on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


AGENT_DIR = Path(".agent")
PID_FILE = AGENT_DIR / "preview.pid"
LOG_FILE = AGENT_DIR / "preview.log"

def get_project_root():
    return Path(".").resolve()

def is_running(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def is_port_in_use(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def get_running_pids():
    if not PID_FILE.exists():
        return {}
    try:
        data = json.loads(PID_FILE.read_text().strip())
        if isinstance(data, dict):
            return data
    except:
        pass
    try:
        content = PID_FILE.read_text().strip()
        if content.isdigit():
            return {"frontend": int(content)}
    except:
        pass
    return {}

def get_start_command(root):
    pkg_file = root / "package.json"
    if not pkg_file.exists():
        return None
    
    with open(pkg_file, 'r') as f:
        data = json.load(f)
    
    scripts = data.get("scripts", {})
    if "dev" in scripts:
        return ["npm", "run", "dev"]
    elif "start" in scripts:
        return ["npm", "start"]
    return None

def start_server(port=3000):
    pids = get_running_pids()
    active_pids = {name: pid for name, pid in pids.items() if is_running(pid)}
    
    if active_pids:
        print("⚠️  Preview already running:")
        for name, pid in active_pids.items():
            print(f"   - {name.capitalize()} (PID: {pid})")
        return

    root = get_project_root()
    env = os.environ.copy()
    new_pids = {}
    backend_log_file = None
    frontend_log_file = None

    try:
        # 1. Start Backend FastAPI
        backend_port = 8001
        if not is_port_in_use(backend_port):
            backend_venv_path = root / ".venv" / "Scripts" / "uvicorn.exe"
            if backend_venv_path.exists():
                backend_cmd = [str(backend_venv_path), "main:app", "--host", "127.0.0.1", "--port", str(backend_port), "--reload"]
            else:
                backend_cmd = ["uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(backend_port), "--reload"]
                
            print(f"🚀 Starting backend on port {backend_port}...")
            backend_log = AGENT_DIR / "preview_backend.log"
            backend_log_file = open(backend_log, "w")
            backend_process = subprocess.Popen(
                backend_cmd,
                cwd=str(root / "apps" / "api"),
                stdout=backend_log_file,
                stderr=backend_log_file,
                env=env,
                shell=False # Avoid space/quoting issues with shell=True on Windows
            )
            new_pids["backend"] = backend_process.pid
        else:
            print(f"ℹ️  Backend already running on port {backend_port}.")

        # 2. Start Frontend Next.js
        frontend_cmd = get_start_command(root)
        if not frontend_cmd:
            print("❌ No 'dev' or 'start' script found in package.json")
            if "backend" in new_pids:
                pid = new_pids["backend"]
                try:
                    if sys.platform != 'win32':
                        os.kill(pid, signal.SIGTERM)
                    else:
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(pid)])
                except:
                    pass
            sys.exit(1)
        
        env["PORT"] = str(port)
        print(f"🚀 Starting frontend on port {port}...")
        
        frontend_log_file = open(LOG_FILE, "w")
        frontend_process = subprocess.Popen(
            frontend_cmd,
            cwd=str(root),
            stdout=frontend_log_file,
            stderr=frontend_log_file,
            env=env,
            shell=True
        )
        new_pids["frontend"] = frontend_process.pid

        # Wait a moment to see if they crash immediately
        time.sleep(2.0)
        
        backend_failed = "backend" in new_pids and backend_process.poll() is not None
        frontend_failed = frontend_process.poll() is not None

        if backend_failed or frontend_failed:
            print("❌ Preview failed to start:")
            if backend_failed:
                print(f"   - Backend failed with exit code: {backend_process.returncode}")
            if frontend_failed:
                print(f"   - Frontend failed with exit code: {frontend_process.returncode}")
            
            # Clean up
            if "backend" in new_pids and backend_process.poll() is None:
                if sys.platform != 'win32':
                    os.kill(backend_process.pid, signal.SIGTERM)
                else:
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)])
            if frontend_process.poll() is None:
                if sys.platform != 'win32':
                    os.kill(frontend_process.pid, signal.SIGTERM)
                else:
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)])
            sys.exit(1)

        PID_FILE.write_text(json.dumps(new_pids))
        print("✅ Preview started successfully!")
        if "backend" in new_pids:
            print(f"   Backend PID: {new_pids['backend']} | Logs: {AGENT_DIR / 'preview_backend.log'}")
        print(f"   Frontend PID: {new_pids['frontend']} | Logs: {LOG_FILE}")
        print(f"   Frontend URL: http://localhost:{port}")
        print(f"   Backend URL: http://localhost:{backend_port}")
        print(f"   API Docs: http://localhost:{backend_port}/docs")

        # Keep running to keep child processes alive in sandbox environments
        print("\n🟢 Servers are running. Keep this task active to preview.")
        print("🟢 Press Ctrl+C to stop or run the stop command.")
        try:
            while True:
                time.sleep(1)
                backend_alive = "backend" not in new_pids or backend_process.poll() is None
                frontend_alive = frontend_process.poll() is None
                if not backend_alive or not frontend_alive:
                    print("\n⚠️ One of the servers stopped. Shutting down...")
                    break
        except KeyboardInterrupt:
            print("\n🛑 Stopping servers...")
            pass

        # Clean up processes if the loop exits
        if "backend" in new_pids and backend_process.poll() is None:
            try:
                if sys.platform != 'win32':
                    os.kill(backend_process.pid, signal.SIGTERM)
                else:
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)])
            except:
                pass
        if frontend_process.poll() is None:
            try:
                if sys.platform != 'win32':
                    os.kill(frontend_process.pid, signal.SIGTERM)
                else:
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)])
            except:
                pass
        if PID_FILE.exists():
            PID_FILE.unlink()
    finally:
        if backend_log_file:
            backend_log_file.close()
        if frontend_log_file:
            frontend_log_file.close()

def stop_server():
    pids = get_running_pids()
    if not pids:
        print("ℹ️  No preview server found.")
        return

    for name, pid in pids.items():
        try:
            if is_running(pid):
                if sys.platform != 'win32':
                    os.kill(pid, signal.SIGTERM)
                else:
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(pid)])
                print(f"🛑 Preview {name} stopped (PID: {pid})")
            else:
                print(f"ℹ️  {name.capitalize()} process (PID: {pid}) was not running.")
        except Exception as e:
            print(f"❌ Error stopping {name} server: {e}")
    
    if PID_FILE.exists():
        PID_FILE.unlink()

def status_server():
    pids = get_running_pids()
    running_info = {}
    for name, pid in pids.items():
        if is_running(pid):
            running_info[name] = pid
            
    print("\n=== Preview Status ===")
    if running_info:
        print("✅ Status: Running")
        for name, pid in running_info.items():
            print(f"🔢 {name.capitalize()} PID: {pid}")
        if "frontend" in running_info:
            print("🌐 Frontend URL: http://localhost:3000 (Likely)")
        if "backend" in running_info:
            print("🌐 Backend URL: http://localhost:8001")
            print("🌐 API Docs: http://localhost:8001/docs")
        print(f"📝 Logs: {LOG_FILE}")
    else:
        print("⚪ Status: Stopped")
    print("===================\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop", "status"])
    parser.add_argument("port", nargs="?", default="3000")
    
    args = parser.parse_args()
    
    if args.action == "start":
        start_server(int(args.port))
    elif args.action == "stop":
        stop_server()
    elif args.action == "status":
        status_server()

if __name__ == "__main__":
    main()
