import psycopg2
from datetime import datetime

DB_CONFIG = {
    "dbname": "smartaudit_db",  # pgAdmin mein jo DB banaya tha
    "user": "postgres",        # Default user
    "password": "ahsan.123",  # Apna PostgreSQL password yahan likhein
    "host": "localhost",
    "port": "5432"
}

def get_connection():
    """PostgreSQL se connection banata hai"""
    return psycopg2.connect(**DB_CONFIG)

def init_db():
    """Tables create karne wala function (main.py startup pe call karega)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Table 1: Servers List (Assets)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS servers (
                id SERIAL PRIMARY KEY,
                host TEXT UNIQUE NOT NULL,
                last_scan TIMESTAMP
            );
        ''')
        
        # Table 2: Audit Logs (Smart Insights)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                server_host TEXT REFERENCES servers(host),
                scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                violations_count INTEGER,
                ai_analysis TEXT
            );
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Smart Audit Database Initialized Successfully!")
    except Exception as e:
        print(f"❌ Database Initialization Error: {e}")

def save_audit_result(host, violations, ai_text):
    """Scan ka data save karne wala function"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Server ka 'last_scan' update ya insert karein
        cursor.execute('''
            INSERT INTO servers (host, last_scan) 
            VALUES (%s, %s) 
            ON CONFLICT (host) DO UPDATE SET last_scan = EXCLUDED.last_scan
        ''', (host, datetime.now()))
        
        # 2. Audit history save karein
        cursor.execute('''
            INSERT INTO audit_logs (server_host, scan_date, violations_count, ai_analysis)
            VALUES (%s, %s, %s, %s)
        ''', (host, datetime.now(), len(violations), ai_text))
        
        conn.commit()
        cursor.close()
        conn.close()
        print(f"💾 Audit for {host} saved to database.")
    except Exception as e:
        print(f"❌ Database Save Error: {e}")