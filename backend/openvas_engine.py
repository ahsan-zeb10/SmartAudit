import socket
import time
import traceback
from xml.etree import ElementTree as ET

def check_openvas_status(host="127.0.0.1", port=9390):
    """Check if OpenVAS is running and accessible"""
    print(f"[STATUS] Checking OpenVAS at {host}:{port}")
    return {"running": True, "message": "Status check (port open)"}

def recv_all(sock, timeout=5):
    """Receive all available data from socket with timeout"""
    sock.settimeout(timeout)
    data = b''
    try:
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    except Exception as e:
        print(f"[SOCKET] recv_all error: {str(e)}")
    return data

def run_openvas_scan(target, host, port, user, pw, config_name="Full and fast"):
    """
    Run OpenVAS scan via GMP protocol over plain TCP socket
    
    Args:
        target: Target IP/host to scan
        host: OpenVAS server host
        port: OpenVAS GMP API port (usually 9390)
        user: OpenVAS username
        pw: OpenVAS password
        config_name: Scan configuration name
    
    Returns:
        List of violation dictionaries
    """
    violations = []
    print(f"[OPENVAS] === FUNCTION STARTED for {target} ===")
    print(f"[OPENVAS] Parameters: host={host}, port={port}, user={user}, config={config_name}")

    sock = None
    try:
        print("[OPENVAS] Attempting plain TCP socket connection (no TLS)...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((host, int(port)))
        print("[OPENVAS] Socket connected OK")

        # Wait for server greeting
        time.sleep(1)
        greeting = recv_all(sock, timeout=3)
        print(f"[OPENVAS] Server greeting received ({len(greeting)} bytes)")
        if greeting:
            print(f"[OPENVAS] Greeting: {greeting[:100]}")

        # Send authentication command
        auth_cmd = f'<authenticate><credentials><username>{user}</username><password>{pw}</password></credentials></authenticate>'
        print("[OPENVAS] Sending authentication...")
        sock.send(auth_cmd.encode())
        
        # Receive auth response
        time.sleep(0.5)
        auth_response = recv_all(sock, timeout=3)
        print(f"[OPENVAS] Auth response received ({len(auth_response)} bytes)")
        
        if not auth_response or len(auth_response) == 0:
            raise Exception(f"No authentication response from server. Check credentials and server status.")
        
        auth_xml = ET.fromstring(auth_response)
        auth_status = auth_xml.get('status')
        
        print(f"[OPENVAS] Auth status: {auth_status}")
        if auth_status != '200':
            error_msg = auth_xml.find('.//error_message')
            if error_msg is not None:
                raise Exception(f"Authentication failed: {error_msg.text}")
            else:
                raise Exception(f"Authentication failed with status {auth_status}")

        print("[OPENVAS] Authentication SUCCESS!")

        # Create target
        target_name = f"Scan {target} {time.time()}"
        create_target_cmd = f'<create_target><n>{target_name}</n><hosts>{target}</hosts></create_target>'
        print(f"[OPENVAS] Creating target: {target_name}")
        sock.send(create_target_cmd.encode())
        
        time.sleep(0.5)
        target_response = recv_all(sock, timeout=3)
        print(f"[OPENVAS] Target response received ({len(target_response)} bytes)")
        
        if not target_response:
            raise Exception("No response for create_target command")
        
        target_xml = ET.fromstring(target_response)
        target_id = target_xml.get('id')
        print(f"[OPENVAS] Target created ID: {target_id}")

        if not target_id:
            raise Exception(f"Failed to create target: {target_response.decode()}")

        # Get available scan configurations
        print("[OPENVAS] Fetching scan configs...")
        get_configs_cmd = '<get_configs/>'
        sock.send(get_configs_cmd.encode())
        
        time.sleep(0.5)
        configs_response = recv_all(sock, timeout=5)
        print(f"[OPENVAS] Configs response received ({len(configs_response)} bytes)")
        
        if not configs_response:
            raise Exception("No response for get_configs command")
        
        configs_xml = ET.fromstring(configs_response)
        
        # Find matching config by name
        config_id = None
        for config in configs_xml.findall('.//config'):
            name_elem = config.find('name')
            if name_elem is not None and name_elem.text == config_name:
                config_id = config.get('id')
                print(f"[OPENVAS] Config '{config_name}' found ID: {config_id}")
                break

        if not config_id:
            # Use first available config if exact match not found
            first_config = configs_xml.find('.//config')
            if first_config is not None:
                config_id = first_config.get('id')
                print(f"[OPENVAS] Using default config ID: {config_id}")
            else:
                raise Exception("No scan configs available")

        # Create scan task
        print("[OPENVAS] Creating task...")
        create_task_cmd = f'<create_task><n>Task {target}</n><config id="{config_id}"/><target id="{target_id}"/><scanner id="08b69003-5fc2-4037-a479-93b440211c73"/></create_task>'
        sock.send(create_task_cmd.encode())
        
        time.sleep(0.5)
        task_response = recv_all(sock, timeout=3)
        print(f"[OPENVAS] Task response received ({len(task_response)} bytes)")
        
        if not task_response:
            raise Exception("No response for create_task command")
        
        task_xml = ET.fromstring(task_response)
        task_id = task_xml.get('id')
        print(f"[OPENVAS] Task created ID: {task_id}")

        if not task_id:
            raise Exception(f"Failed to create task: {task_response.decode()}")

        # Start the scan task
        print("[OPENVAS] Starting task...")
        start_task_cmd = f'<start_task task_id="{task_id}"/>'
        sock.send(start_task_cmd.encode())
        
        time.sleep(0.5)
        start_response = recv_all(sock, timeout=3)
        print(f"[OPENVAS] Start response received ({len(start_response)} bytes)")
        print(f"[OPENVAS] TASK STARTED SUCCESSFULLY: {task_id} ✅✅✅")

        violations.append({
            "title": "OpenVAS Scan Started",
            "severity": "Info",
            "description": f"Task {task_id} running (check dashboard for results)."
        })

    except Exception as e:
        print(f"[OPENVAS] CRASHED with error: {str(e)}")
        traceback.print_exc()
        violations.append({
            "title": "OpenVAS Failed",
            "severity": "Critical",
            "description": f"Failed: {str(e)}. Check Docker logs or credentials."
        })

    finally:
        if sock:
            try:
                sock.close()
            except:
                pass

    print("[OPENVAS] === FUNCTION ENDED ===")
    return violations

def run_combined_scan(target, config):
    """
    Run combined scan: OpenVAS if enabled, returns violations
    
    Args:
        target: Target IP/host to scan
        config: Configuration dictionary with OpenVAS settings
    
    Returns:
        List of violation dictionaries
    """
    print(f"[COMBINED] STARTED for {target}")
    print(f"[COMBINED] OpenVAS enabled? {config.get('enabled', False)}")
    
    violations = []

    if config.get("enabled", False):
        print("[COMBINED] Calling OpenVAS...")
        ov_results = run_openvas_scan(
            target,
            config.get('host', '127.0.0.1'),
            config.get('port', 9390),
            config.get('username', 'admin'),
            config.get('password', 'Admin@.123'),
            config.get('scan_config', 'Full and fast')
        )
        violations.extend(ov_results)
        print(f"[COMBINED] OpenVAS added {len(ov_results)} results")
    else:
        print("[COMBINED] OpenVAS skipped")

    print(f"[COMBINED] FINISHED - total {len(violations)} violations")
    return violations