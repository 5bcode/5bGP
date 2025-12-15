import os
import json
import time
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from google.cloud import firestore
from typing import Dict, Any

app = FastAPI()

# CORS for local development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WIKI_USER_AGENT = 'FlipTo5B-Dev/1.0'
FIRESTORE_PROJECT_ID = os.getenv('GCP_PROJECT_ID')

# In-memory cache fallback (if no Firestore)
local_cache = {
    "prices": {},
    "mapping": {},
    "last_updated": 0
}

# Firestore Client
db = None
if FIRESTORE_PROJECT_ID:
    try:
        db = firestore.Client(project=FIRESTORE_PROJECT_ID)
        print(f"Connected to Firestore Project: {FIRESTORE_PROJECT_ID}")
    except Exception as e:
        print(f"Firestore connection failed: {e}. Using in-memory cache.")

# Mount static files (Frontend)
# We expect the 'molten-rosette' folder to be copied to 'static' in the container
static_path = "static"
if not os.path.exists(static_path):
    # Fallback for local dev if running from cloud-run/api folder
    static_path = "../../molten-rosette"

if os.path.exists(static_path):
    app.mount("/css", StaticFiles(directory=f"{static_path}/css"), name="css")
    app.mount("/js", StaticFiles(directory=f"{static_path}/js"), name="js")
    app.mount("/assets", StaticFiles(directory=f"{static_path}/assets"), name="assets")

@app.on_event("startup")
async def startup_event():
    # Initial load of mapping
    refresh_mapping()
    # Initial load of prices
    refresh_prices()

@app.get("/")
async def read_root():
    # Serve index.html
    if os.path.exists(f"{static_path}/index.html"):
        return FileResponse(f"{static_path}/index.html")
    return {"status": "Flip to 5B API is running (Frontend not found)"}

@app.get("/mapping")
def get_mapping():
    if db:
        # In a real app, you might cache this heavily or read from a collection
        # For now, just return what we have in memory or fetch fresh
        return list(local_cache["mapping"].values())
    return list(local_cache["mapping"].values())

@app.get("/prices/latest")
def get_prices():
    # Return structure matching what UI expects
    return {"data": local_cache["prices"]}

@app.post("/refresh")
def force_refresh():
    """Called by Cloud Scheduler or manually"""
    refresh_prices()
    return {"status": "refreshed", "count": len(local_cache["prices"])}

def refresh_mapping():
    """Fetch item mapping (ID -> Name/Limit/Values)"""
    print("Fetching mapping from Wiki...")
    try:
        url = "https://prices.runescape.wiki/api/v1/osrs/mapping"
        headers = {'User-Agent': WIKI_USER_AGENT}
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        data = res.json()
        
        # Process into dict
        mapping = {}
        for item in data:
            mapping[str(item['id'])] = item
            
        local_cache["mapping"] = mapping
        
        # If DB, write to 'items' collection (batch write in real scenario)
        if db:
            # Simplification: In real app, use batch writes
            pass 
            
        print(f"Mapping loaded: {len(mapping)} items")
    except Exception as e:
        print(f"Error fetching mapping: {e}")

def refresh_prices():
    """Fetch latest prices and merge"""
    print("Fetching prices from Wiki...")
    try:
        # 1. Latest Prices (High/Low)
        url_latest = "https://prices.runescape.wiki/api/v1/osrs/latest"
        headers = {'User-Agent': WIKI_USER_AGENT}
        res_latest = requests.get(url_latest, headers=headers)
        data_latest = res_latest.json()['data']

        # 2. 5m Avg Prices (Volume)
        # We can also fetch 5m to get better volume data if needed
        # For MVP, 'latest' gives high/low time, but not volume usually?
        # Wiki 'latest' endpoint returns: high, highTime, low, lowTime. NO VOLUME.
        # We NEED 5m endpoint for volume.
        
        url_5m = "https://prices.runescape.wiki/api/v1/osrs/5m"
        res_5m = requests.get(url_5m, headers=headers)
        data_5m = res_5m.json()['data']

        merged = {}
        
        all_ids = set(data_latest.keys()) | set(data_5m.keys())
        
        for item_id in all_ids:
            l = data_latest.get(item_id, {})
            m5 = data_5m.get(item_id, {})
            
            merged[item_id] = {
                "high": l.get("high", 0),
                "highTime": l.get("highTime", 0),
                "low": l.get("low", 0),
                "lowTime": l.get("lowTime", 0),
                "highPriceVolume": m5.get("highPriceVolume", 0) + m5.get("lowPriceVolume", 0), # Corrected keys
                "avgHigh5m": m5.get("avgHighPrice"),
                "avgLow5m": m5.get("avgLowPrice")
            }
            
        local_cache["prices"] = merged
        local_cache["last_updated"] = time.time()
        
        if db:
            # Write to 'prices/latest' doc
            doc_ref = db.collection('prices').document('latest')
            doc_ref.set({"data": merged})

        print(f"Prices updated: {len(merged)} items")
        
    except Exception as e:
        print(f"Error refreshing prices: {e}")

if __name__ == "__main__":
    # Local dev entry point
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
