def run_combined_scan(target, config):
    from scanner import run_security_audit
    import threading
    
    print(f"[COMBINED] STARTED for {target}")
    print(f"[COMBINED] OpenVAS enabled? {config.get('enabled', False)}")
    
    # Run Nmap with timeout (30 seconds max)
    violations = []
    nmap_result = [None]
    
    def run_nmap():
        nmap_result[0] = run_security_audit(target)
    
    nmap_thread = threading.Thread(target=run_nmap, daemon=True)
    nmap_thread.start()
    nmap_thread.join(timeout=30)  # 30 second timeout
    
    if nmap_result[0] is not None:
        violations = nmap_result[0] or []
    
    print(f"[COMBINED] Nmap finished - {len(violations)} issues")

    if config.get("enabled", False):
        print("[COMBINED] Calling OpenVAS...")
        ov_results = run_openvas_scan(
            target,
            config.get('host', '127.0.0.1'),
            config.get('port', 9390),
            config.get('username', 'admin'),
            config.get('password', 'ahsan.123'),
            config.get('scan_config', 'Full and fast')
        )
        violations.extend(ov_results)
        print(f"[COMBINED] OpenVAS added {len(ov_results)} results")
    else:
        print("[COMBINED] OpenVAS skipped")

    print(f"[COMBINED] FINISHED - total {len(violations)} violations")
    return violations