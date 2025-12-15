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

print("Loading main.py...")

app = FastAPI()

# CORS for local development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WIKI_USER_AGENT = 'FlipTo5B-Dev/1.0'
FIRESTORE_PROJECT_ID = os.getenv('GCP_PROJECT_ID')

# In-memory cache fallback (initially empty)
local_cache = {
    "prices": {},
    "mapping": {},
    "last_updated": 0
}

# Global DB reference (Lazy loaded)
db = None

# Mount static files (Frontend)
static_path = "static"
if not os.path.exists(static_path):
    static_path = "../../molten-rosette"

if os.path.exists(static_path):
    app.mount("/css", StaticFiles(directory=f"{static_path}/css"), name="css")
    app.mount("/js", StaticFiles(directory=f"{static_path}/js"), name="js")
    app.mount("/assets", StaticFiles(directory=f"{static_path}/assets"), name="assets")

import asyncio

@app.on_event("startup")
async def startup_event():
    print("Server starting up...")
    # Initialize DB and fetch data in background
    asyncio.create_task(background_init())

async def background_init():
    global db
    print("Starting background initialization...")
    
    # 1. Connect to Firestore
    if FIRESTORE_PROJECT_ID:
        try:
            # Run in executor to avoid blocking if auth takes time
            loop = asyncio.get_event_loop()
            # Note: client creation can be blocking
            db = await loop.run_in_executor(None, lambda: firestore.Client(project=FIRESTORE_PROJECT_ID))
            print(f"Connected to Firestore Project: {FIRESTORE_PROJECT_ID}")
        except Exception as e:
            print(f"Firestore connection failed: {e}. Using in-memory cache.")
    
    # 2. Fetch Data
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, refresh_mapping)
    await loop.run_in_executor(None, refresh_prices)
    print("Background initialization complete.")

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

        # 3. 1h Prices (For Pump/Dump Baseline)
        url_1h = "https://prices.runescape.wiki/api/v1/osrs/1h"
        res_1h = requests.get(url_1h, headers=headers)
        data_1h = res_1h.json()['data']

        # 4. 24h Prices (For Daily Volume & Trends)
        url_24h = "https://prices.runescape.wiki/api/v1/osrs/24h"
        res_24h = requests.get(url_24h, headers=headers)
        data_24h = res_24h.json()['data']

        merged = {}
        
        all_ids = set(data_latest.keys()) | set(data_5m.keys())
        
        for item_id in all_ids:
            l = data_latest.get(item_id, {})
            m5 = data_5m.get(item_id, {})
            h1 = data_1h.get(item_id, {})
            d24 = data_24h.get(item_id, {})
            
            merged[item_id] = {
                "high": l.get("high", 0),
                "highTime": l.get("highTime", 0),
                "low": l.get("low", 0),
                "lowTime": l.get("lowTime", 0),
                "highPriceVolume": m5.get("highPriceVolume", 0) + m5.get("lowPriceVolume", 0),
                "avgHigh5m": m5.get("avgHighPrice"),
                "avgLow5m": m5.get("avgLowPrice"),
                # 1h Data
                "volume1h": h1.get("highPriceVolume", 0) + h1.get("lowPriceVolume", 0),
                "price1h": h1.get("avgHighPrice", 0) or h1.get("avgLowPrice", 0),
                # 24h Data
                "volume24h": d24.get("highPriceVolume", 0) + d24.get("lowPriceVolume", 0),
                "price24h": d24.get("avgHighPrice", 0) or d24.get("avgLowPrice", 0)
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
