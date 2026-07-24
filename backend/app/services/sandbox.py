import asyncio
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from asyncio.subprocess import Process

class SandboxManager:
    def __init__(self):
        self.active_sandboxes: dict[str, dict] = {}
        
    async def start(self, code: str, lang: str) -> dict:
        sandbox_id = str(uuid.uuid4())
        # Create temp dir
        temp_dir = tempfile.mkdtemp(prefix=f"sandbox_{sandbox_id}_")
        
        # Determine file name and logic
        file_name = "index.html"
        if lang in ("html", "js", "css"):
            file_name = "index.html"
        else:
            file_name = f"main.{lang}"
            
        with open(os.path.join(temp_dir, file_name), "w") as f:
            f.write(code)
            
        # Start python http server on a random port (port 0 lets OS choose, but we need to know the port for cloudflared)
        # So let's pick a random port or let python pick and then read it.
        # Actually, if we just use a specific port range, we can try until one is free.
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        port = s.getsockname()[1]
        s.close()
        
        server_proc = await asyncio.create_subprocess_exec(
            "python3", "-m", "http.server", str(port),
            cwd=temp_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Start cloudflared tunnel
        tunnel_proc = await asyncio.create_subprocess_exec(
            "cloudflared", "tunnel", "--url", f"http://localhost:{port}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        url = None
        async def read_until_url():
            while True:
                line = await tunnel_proc.stderr.readline()
                if not line:
                    break
                line_str = line.decode('utf-8', errors='ignore')
                if "trycloudflare.com" in line_str:
                    import re
                    match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line_str)
                    if match:
                        return match.group(1)
            return None

        try:
            url = await asyncio.wait_for(read_until_url(), timeout=15.0)
        except asyncio.TimeoutError:
            pass
        
        if not url:
            # Cleanup
            server_proc.terminate()
            tunnel_proc.terminate()
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise RuntimeError("Failed to start Cloudflare tunnel")
            
        self.active_sandboxes[sandbox_id] = {
            "temp_dir": temp_dir,
            "server_proc": server_proc,
            "tunnel_proc": tunnel_proc,
            "url": url
        }
        
        return {"id": sandbox_id, "url": url}
        
    async def stop(self, sandbox_id: str):
        sandbox = self.active_sandboxes.get(sandbox_id)
        if sandbox:
            try:
                sandbox["server_proc"].terminate()
            except Exception:
                pass
            try:
                sandbox["tunnel_proc"].terminate()
            except Exception:
                pass
            shutil.rmtree(sandbox["temp_dir"], ignore_errors=True)
            del self.active_sandboxes[sandbox_id]

sandbox_manager = SandboxManager()
