from fpdf import FPDF
from database import SessionLocal, Asset, Violation
import datetime

def generate_pdf_report():
    db = SessionLocal()
    try:
        # DB se latest assets aur violations uthana
        assets = db.query(Asset).all()
        violations = db.query(Violation).order_by(Violation.timestamp.desc()).limit(10).all()
        
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Arial", 'B', 20)
        pdf.set_text_color(40, 53, 147) # Professional Blue
        pdf.cell(190, 15, "Premise IT Security Report", ln=True, align='C')
        
        # Sub-header
        pdf.set_font("Arial", size=10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(190, 10, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='C')
        pdf.ln(10)
        
        # Section 1: Executive Summary
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(190, 10, "1. Executive Summary", ln=True)
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(0, 10, f"Total Assets Monitored: {len(assets)}\nCritical Issues Found: {len(violations)}")
        pdf.ln(5)
        
        # Section 2: Latest Security Violations & AI Fixes
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(190, 10, "2. Top Security Violations & AI Recommendations", ln=True)
        
        for v in violations:
            pdf.set_font("Arial", 'B', 11)
            pdf.set_text_color(200, 0, 0) # Red for violations
            pdf.cell(0, 10, f"- {v.policy_name}", ln=True)
            
            pdf.set_font("Arial", size=10)
            pdf.set_text_color(0, 0, 0)
            pdf.multi_cell(0, 7, f"Details: {v.details}")
            
            pdf.set_font("Arial", 'I', 10)
            pdf.set_text_color(0, 100, 0) # Green for AI fix
            pdf.multi_cell(0, 7, f"AI Remediation: {v.ai_remediation}")
            pdf.ln(3)
            
        # Save PDF
        report_name = "latest_security_report.pdf"
        pdf.output(report_name)
        return report_name
    finally:
        db.close()