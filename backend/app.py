from flask import Flask, jsonify
from flask_cors import CORS
from scraper import get_permanent_free_games, get_temporary_free_games, get_discounted_games

import os

app = Flask(__name__)

# Configure CORS properly
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://vimanga-x64.github.io",
            "http://localhost:*"  # For local testing
        ],
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

@app.route("/")
def index():
    return "Free Game Scraper API is running!"

@app.route("/api/free-games")
def get_free_games():
    permanent = get_permanent_free_games()
    temporary = get_temporary_free_games()
    sale = get_discounted_games()
    
    # Combine all PC free-to-play games from different stores into one list
    pc_free_to_play = []
    pc_free_to_play.extend(permanent.get("epic_games", []))
    pc_free_to_play.extend(permanent.get("steam", []))
    pc_free_to_play.extend(temporary.get("pc", {}).get("epic_games", []))
    pc_free_to_play.extend(temporary.get("pc", {}).get("steam", []))
    pc_free_to_play.extend(temporary.get("pc", {}).get("gog", []))
    
    # Combine all console free-to-play games
    console_free_to_play = []
    console_free_to_play.extend(permanent.get("playstation", []))
    console_free_to_play.extend(permanent.get("xbox", []))
    console_free_to_play.extend(temporary.get("console", {}).get("playstation", []))
    console_free_to_play.extend(temporary.get("console", {}).get("xbox", []))
    
    response = jsonify({
        "pc": pc_free_to_play,
        "console": console_free_to_play,
        "sale": sale
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)