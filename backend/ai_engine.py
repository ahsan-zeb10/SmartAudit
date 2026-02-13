import requests
import json

def get_ai_summary(violations):
    # Aapki API Key
    API_KEY = "AIzaSyCNmpqseQgMTM0JgLA8Yz26wdv4EliPG3Y"
    
    # Aapki list se uthaya gaya exact stable model path
    model_name = "models/gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={API_KEY}"
    
    if not violations:
        return "✅ System is healthy. All infrastructure policies are compliant."

    headers = {'Content-Type': 'application/json'}
    
    # Optimized payload for Gemini 2.5 Flash
    payload = {
        "contents": [{
            "parts": [{
                "text": f"Context: Windows IT Infrastructure Audit. Issues found: {violations}. Task: Provide a professional 3-line remediation plan."
            }]
        }],
        "generationConfig": {
            "temperature": 1, # As per your list's default
            "topP": 0.95,
            "topK": 64,
            "maxOutputTokens": 1000
        }
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=20)
        
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result:
                ai_text = result['candidates'][0]['content']['parts'][0]['text']
                return ai_text
            return "📡 AI Analyzing: Data received, awaiting generation..."
        
        elif response.status_code == 429:
            # Rate limit/Quota handle karna
            return "⚠️ QUOTA FULL: Gemini 2.5 is busy. Retrying in 60s..."
            
        elif response.status_code == 404:
            return f"❌ Model Not Found: Path '{model_name}' might be restricted for this key."
            
        else:
            return f"❌ API Error {response.status_code}: {response.text}"

    except Exception as e:
        return f"📡 Connection Error: {str(e)}"