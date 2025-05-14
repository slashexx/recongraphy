from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import socket
import re
from attack.ipapi import ipapi
from attack.talos import talos
from attack.threatfox import threatfox
from attack.tor import tor
from attack.tranco import tranco
from osint.internetdb import internetdb
from osint.xposedornot import checkEmail
from osint.phone import validate_phone_number
from osint.username import sagemode_wrapper
import tempfile
import os
import pefile
import yara
from dotenv import load_dotenv
import time
import networkx as nx

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"],  # Your frontend URL
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

IP_REGEX = r'^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
URL_REGEX = r'^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$'

EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PHONE_REGEX = r'^\+?[0-9]\d{1,14}$' 


# ipapi -> ipinfo
# talos -> blacklisted ip

@app.route('/')
def home():
    return "Welcome to the ReconGraph"

def safe_get(d, key, default):
    if d is None:
        return default
    return d.get(key, default)

def calculate_risk_score(results):
    score = 0
    details = []
    # Open ports (each open port adds risk)
    ports = safe_get(results.get('internetdb', {}), 'ports', [])
    if ports:
        score += min(len(ports) * 5, 30)  # up to 30 points
        details.append(f"Open ports: {len(ports)}")
    # CVEs (each CVE adds risk)
    cves = safe_get(results.get('internetdb', {}), 'cves', [])
    if cves:
        score += min(len(cves) * 10, 30)  # up to 30 points
        details.append(f"CVEs: {len(cves)}")
    # Blacklist (high risk)
    if safe_get(results.get('talos', {}), 'blacklisted', False):
        score += 25
        details.append("Blacklisted by Talos")
    # Malware (high risk)
    if safe_get(results.get('threatfox', {}), 'malware', None):
        score += 25
        details.append("Malware detected by ThreatFox")
    # Tags (certain tags add risk)
    tags = safe_get(results.get('internetdb', {}), 'tags', [])
    risky_tags = {'honeypot', 'malware', 'botnet', 'spam', 'proxy'}
    tag_risk = len(set(tags) & risky_tags) * 5
    score += tag_risk
    if tag_risk:
        details.append(f"Risky tags: {', '.join(set(tags) & risky_tags)}")
    # Clamp score to 0-100
    score = min(score, 100)
    # Risk level
    if score >= 70:
        level = 'High'
    elif score >= 40:
        level = 'Medium'
    else:
        level = 'Low'
    return {"score": score, "level": level, "details": details}

@app.route('/scan', methods=['POST'])
def scan():
    try:
        # Get the input query from the request body
        body = request.get_json()
        if not body or 'query' not in body:
            return jsonify({"error": "No query provided in request body"}), 400
            
        ip_or_domain = body.get('query')
        if not ip_or_domain:
            return jsonify({"error": "Empty query provided"}), 400

        if re.match(IP_REGEX, ip_or_domain):
            input_type = 'ip'
            ip_to_scan = ip_or_domain
            url_to_scan = None
        elif re.match(URL_REGEX, ip_or_domain):
            input_type = 'domain'
            try:
                ip_to_scan = socket.gethostbyname(ip_or_domain)  # Resolve domain to IP
                url_to_scan = ip_or_domain  # Keep the URL as it is
            except socket.gaierror:
                return jsonify({"error": f"Unable to resolve domain: {ip_or_domain}"}), 400
        else:
            return jsonify({"error": "Invalid IP or domain format"}), 400

        results = {}

        if ip_to_scan:
            try:
                results["ipapi"] = ipapi(ip_to_scan)
                results["talos"] = talos(ip_to_scan)
                results["tor"] = tor(ip_to_scan)
                results["internetdb"] = internetdb(ip_to_scan)
            except Exception as e:
                print(f"Error during IP scanning: {str(e)}")
                results["error"] = f"Error during IP scanning: {str(e)}"

        if url_to_scan:
            try:
                results["tranco"] = tranco(url_to_scan)
                results["threatfox"] = threatfox(url_to_scan)
            except Exception as e:
                print(f"Error during URL scanning: {str(e)}")
                results["error"] = f"Error during URL scanning: {str(e)}"

        # Add risk score
        results["risk"] = calculate_risk_score(results)

        return jsonify(results)

    except Exception as e:
        print(f"Unexpected error in scan endpoint: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/footprint', methods=['POST'])
def footprint():
    body = request.get_json()
    query = body.get('query')

    if not query:
        return jsonify({"error": "No IP or domain provided."}), 400
    
    if re.match(EMAIL_REGEX, query):
        input_type = 'email'
        email_to_scan = query
    elif re.match(PHONE_REGEX, query):
        input_type = 'phone'
        phone_to_scan = query
    else:
        username_to_scan = query

    results = {}

    if 'email_to_scan' in locals():
        results["email_scan"] = checkEmail(email_to_scan)  # Replace with your email scan function

    if 'phone_to_scan' in locals():
        results["phone_scan"] = validate_phone_number(phone_to_scan)  # Replace with your phone scan function

    if 'username_to_scan' in locals():
        results["username_scan"] = sagemode_wrapper(username_to_scan)  # Replace with your username scan function

    return jsonify(results)


@app.route("/capa_analyze", methods=["POST", "OPTIONS"])
def upload_file():
    if request.method == "OPTIONS":
        return "", 200
        
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    temp_file_path = None
    try:
        # Create a temporary file with a unique name
        temp_file_path = os.path.join(tempfile.gettempdir(), f"analysis_{os.urandom(8).hex()}")
        
        # Save the uploaded file directly to the temp path
        file.save(temp_file_path)

        # Initialize analysis results
        analysis_result = {
            "file_info": {
                "name": file.filename,
                "size": os.path.getsize(temp_file_path)
            },
            "pe_info": {},
            "risk_level": "Low",
            "categories": {
                "Defense Evasion": [],
                "Execution": [],
                "Discovery": [],
                "Persistence": []
            }
        }

        # Try to analyze as PE file
        try:
            pe = pefile.PE(temp_file_path)
            
            # Get PE information
            analysis_result["pe_info"] = {
                "machine_type": hex(pe.FILE_HEADER.Machine),
                "timestamp": pe.FILE_HEADER.TimeDateStamp,
                "sections": [section.Name.decode().rstrip('\x00') for section in pe.sections],
                "imports": []
            }

            # Get imports
            if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
                for entry in pe.DIRECTORY_ENTRY_IMPORT:
                    dll_name = entry.dll.decode()
                    imports = [imp.name.decode() for imp in entry.imports if imp.name]
                    analysis_result["pe_info"]["imports"].append({
                        "dll": dll_name,
                        "functions": imports
                    })

                    # Categorize imports
                    if any(x in dll_name.lower() for x in ['kernel32', 'ntdll']):
                        analysis_result["categories"]["Execution"].extend(imports)
                    if any(x in dll_name.lower() for x in ['advapi32', 'user32']):
                        analysis_result["categories"]["Persistence"].extend(imports)
                    if any(x in dll_name.lower() for x in ['ws2_32', 'wininet']):
                        analysis_result["categories"]["Discovery"].extend(imports)

        except pefile.PEFormatError:
            analysis_result["pe_info"]["error"] = "Not a valid PE file"
        except Exception as e:
            analysis_result["pe_info"]["error"] = str(e)

        return jsonify(analysis_result)

    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temp file in finally block to ensure it happens
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                # Add a small delay to ensure all file handles are released
                time.sleep(0.1)
                os.unlink(temp_file_path)
            except Exception as e:
                print(f"Error cleaning up temp file: {str(e)}")

@app.route('/pagerank', methods=['POST'])
def pagerank():
    data = request.get_json()
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node['id'])
    for edge in edges:
        G.add_edge(edge['source'], edge['target'])
    pr = nx.pagerank(G, alpha=0.85)
    return jsonify({'pagerank': pr})

# @app.route('/chat', methods=['POST'])
# def chat():
#     """Simple chat endpoint"""
#     user_message = request.json.get('message')
    
#     if not user_message:
#         return jsonify({'error': 'Message is required'}), 400
    
#     # Add user message to history
#     conversation_history.append({"role": "user", "content": user_message})
    
#     try:
#         # Get response from model
#         payload = {"messages": conversation_history}
#         response = model_lake.chat_complete(payload)
#         bot_reply = response.get("answer", "I'm sorry, I couldn't process that. Please try again.")
        
#         # Add bot response to history
#         conversation_history.append({"role": "assistant", "content": bot_reply})
        
#         return jsonify({'response': bot_reply})
        
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
