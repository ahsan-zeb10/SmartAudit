import ollama

def get_ai_summary(violations):
    # Ab hum AI ko "Professional Consultant" ka role de rahe hain
    system_instruction = (
        "You are a Senior Cyber Security Consultant. Your tone must be professional, "
        "formal, and concise. Avoid slang, informal greetings, or casual language. "
        "Provide responses in clear English suitable for an executive board meeting."
    )

    prompt = f"""
    Project Name: GovenAI Infrastructure Audit
    
    The following IT policy violations were detected during a routine automated scan:
    {violations}
    
    Please provide a formal report including:
    1. Executive Summary: A high-level overview of the security posture.
    2. Risk Analysis: Technical implications of each violation.
    3. Remediation Plan: Professional step-by-step instructions to resolve these issues.
    4. Compliance Impact: Which policies (Policy 2, Policy 4) are currently non-compliant.
    """
    
    try:
        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': system_instruction},
            {'role': 'user', 'content': prompt},
        ])
        return response['message']['content']
    except Exception as e:
        return f"AI Error: Connection to Local LLM failed. {str(e)}"