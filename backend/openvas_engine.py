from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform
import time

def run_openvas_scan(target, host, port, user, pw, config_name="Full and fast"):
    """OpenVAS Engine: Deep Vulnerability Scan."""
    violations = []
    try:
        # Connection setup (Socket ya TCP depend karta hy aapke docker setup pe)
        # Agar docker hy to aksar UnixSocket use hota hy
        connection = UnixSocketConnection()
        transform = EtreeCheckCommandTransform()
        
        with Gmp(connection=connection, transform=transform) as gmp:
            gmp.authenticate(user, pw)
            
            # 1. Create Target
            target_name = f"Scan Target {target} {time.time()}"
            res = gmp.create_target(name=target_name, hosts=[target])
            target_id = res.get('id')
            
            # 2. Find Config ID
            configs = gmp.get_scan_configs()
            config_id = None
            for c in configs.xpath('//config'):
                if c.xpath('name/text()')[0] == config_name:
                    config_id = c.get('id')
                    break
            
            if not config_id: config_id = configs.xpath('//config')[0].get('id')

            # 3. Create and Start Task
            task_res = gmp.create_task(name=f"Task {target}", config_id=config_id, target_id=target_id, scanner_id="08b69003-5fc2-4037-a479-93b440211c73")
            task_id = task_res.get('id')
            gmp.start_task(task_id)
            
            print(f"[*] OpenVAS Task Started: {task_id}")
            
            # Poll for results (Simplified for integration)
            # Asal scan lamba hota hy, isliye real-world me background task use hota hy
            # Yahan hum placeholder return kar rahay hain agar timeout ho
            return [{"title": "OpenVAS Scan Initiated", "severity": "Info", "description": f"Task ID {task_id} is running in background."}]

    except Exception as e:
        print(f"[-] OpenVAS Error: {e}")
        return [{"title": "OpenVAS Error", "severity": "Medium", "description": "Could not connect to OpenVAS scanner."}]

def run_combined_scan(target, config):
    """Main.py isi function ko call karti hy."""
    from scanner import run_security_audit
    
    # Run Nmap (Fast)
    results = run_security_audit(target)
    
    # Run OpenVAS (Deep)
    if config.get("enabled"):
        ov_results = run_openvas_scan(target, config['host'], config['port'], config['username'], config['password'], config['scan_config'])
        results.extend(ov_results)
        
    return results

def check_openvas_status(host, port):
    """OpenVAS ki health check ke liye."""
    # Placeholder logic
    return {"running": True, "message": "Service is responsive"}