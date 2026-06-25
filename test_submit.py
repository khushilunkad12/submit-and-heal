import requests

response = requests.post(
    "http://localhost:8000/api/submit",
    json={"repo_url": "https://github.com/tiangolo/fastapi", "error_description": "test"}
)

data = response.json()
print("Status:", response.status_code)
print("Detected stack:", data.get("detected_stack"))
file_list = data.get("file_list", [])
print(f"File list length: {len(file_list)}")
if file_list:
    print("First 5 files:")
    for f in file_list[:5]:
        print(f"  - {repr(f)}")
