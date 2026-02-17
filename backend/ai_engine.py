def get_ai_summary(violations):
    if not violations:
        return "System is fully secure and compliant. No action needed."
    
    crit = sum(1 for v in violations if v.get('severity') == 'Critical')
    high = sum(1 for v in violations if v.get('severity') == 'High')
    med  = sum(1 for v in violations if v.get('severity') == 'Medium')
    
    if crit >= 1:
        return f"CRITICAL ALERT: {crit} severe vulnerabilities found. Immediate action required!"
    elif high >= 2:
        return f"High risk detected. {high} major issues + {med} medium issues. Harden your system now."
    elif high == 1:
        return f"One high-risk service exposed. Review port {violations[0].get('port', 'N/A')}."
    else:
        return f"Minor issues found ({len(violations)} total). Good overall posture."