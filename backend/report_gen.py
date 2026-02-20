from fpdf import FPDF
import os
import tempfile

def generate_pdf_report(report_data):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="TECHIFY Compliance Report", ln=1, align='C')
    pdf.ln(10)

    # Host & Score
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt=f"Host: {report_data.get('host', 'Unknown')}", ln=1)
    pdf.cell(200, 10, txt=f"Compliance Score: {report_data.get('compliance_score', 0)}%", ln=1)
    pdf.ln(5)

    # AI Insight
    pdf.set_font("Arial", 'I', 11)
    pdf.multi_cell(0, 10, txt=f"AI Insight: {report_data.get('ai_analysis', 'No insight available')}")
    pdf.ln(10)

    # Violations
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt="Violations Found:", ln=1)
    pdf.ln(5)

    violations = report_data.get('violations', [])
    if not violations:
        pdf.set_font("Arial", '', 11)
        pdf.cell(200, 10, txt="No violations found - System is secure.", ln=1)
    else:
        pdf.set_font("Arial", 'B', 11)
        pdf.cell(40, 10, "Severity", border=1)
        pdf.cell(80, 10, "Title", border=1)
        pdf.cell(70, 10, "Description", border=1)
        pdf.ln()

        pdf.set_font("Arial", '', 10)
        for v in violations:
            severity = v.get('severity', 'Low')
            title = v.get('title', 'N/A')
            desc = v.get('description', 'No description')[:60] + "..." if len(v.get('description', '')) > 60 else v.get('description', 'N/A')
            pdf.cell(40, 10, severity, border=1)
            pdf.cell(80, 10, title, border=1)
            pdf.cell(70, 10, desc, border=1)
            pdf.ln()

    # Save
    temp_dir = tempfile.gettempdir()
    filename = os.path.join(temp_dir, "TECHIFY_Compliance_Report.pdf")
    pdf.output(filename)
    return filename