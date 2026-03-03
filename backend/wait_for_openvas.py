#!/usr/bin/env python3
"""
Wait for OpenVAS container to be fully ready
Checks if GMP protocol is responding
"""
import socket
import time
import sys

def check_gmp_ready(host="127.0.0.1", port=9390, timeout=300):
    """
    Wait for GMP protocol to respond with proper greeting
    timeout: seconds to wait
    """
    start_time = time.time()
    
    print(f"Waiting for OpenVAS GMP protocol to be ready on {host}:{port}")
    print(f"Timeout: {timeout} seconds (~{timeout/60:.1f} minutes)")
    print("-" * 60)
    
    while True:
        elapsed = time.time() - start_time
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((host, port))
            
            # Try to receive greeting
            time.sleep(2)
            try:
                greeting = sock.recv(1024)
                if greeting and len(greeting) > 100:
                    print(f"\n✅ SUCCESS! OpenVAS GMP is ready after {elapsed:.0f} seconds")
                    print(f"Greeting received: {len(greeting)} bytes")
                    print(f"First 100 chars: {greeting[:100]}")
                    sock.close()
                    return True
                else:
                    print(f"⏳ {elapsed:.0f}s: Connected but greeting empty ({len(greeting)} bytes) - still initializing...")
                    sock.close()
            except socket.timeout:
                print(f"⏳ {elapsed:.0f}s: Connected but no greeting - server initializing...")
                sock.close()
            except Exception as e:
                print(f"⏳ {elapsed:.0f}s: Connection issue - {str(e)}")
                sock.close()
        
        except ConnectionRefusedError:
            print(f"⏳ {elapsed:.0f}s: Port not yet accepting connections...")
        except Exception as e:
            print(f"⏳ {elapsed:.0f}s: {str(e)}")
        
        if elapsed > timeout:
            print(f"\n❌ TIMEOUT! OpenVAS did not become ready in {timeout} seconds")
            print("Suggestions:")
            print("1. Check container is running: docker ps")
            print("2. Check logs: docker logs openvas | tail -50")
            print("3. Restart container: docker restart openvas")
            return False
        
        time.sleep(5)

if __name__ == "__main__":
    if check_gmp_ready():
        sys.exit(0)
    else:
        sys.exit(1)