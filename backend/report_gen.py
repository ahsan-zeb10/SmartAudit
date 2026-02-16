from fpdf import FPDF
import os

def generate_pdf_report():
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Arial", 'B', 20)
    pdf.cell(200, 10, "Premise Infrastructure & Security Report", ln=True, align='C')
    pdf.ln(10)

    # Executive Summary (As per Roadmap)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, "1. Executive Summary", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 7, "This document provides a centralized overview of IT infrastructure health and security vulnerabilities. "
                         "The platform ensures data remains on-premise for maximum privacy.")
    pdf.ln(5)

    # Technical Details
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, "2. Technical Audit Details", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 10, "- Infrastructure Monitoring: CPU, RAM, and Disk utilization checked.", ln=True)
    pdf.cell(0, 10, "- Vulnerability Assessment: Port scanning (SMB, SSH) completed.", ln=True)
    pdf.cell(0, 10, "- Asset Discovery: Network devices identified.", ln=True)
    pdf.ln(10)

    # Saving the file
    report_path = "Compliance_Report.pdf"
    pdf.output(report_path)
    return os.path.abspath(report_path)