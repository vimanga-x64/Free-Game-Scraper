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
    
    # Structure the response to maintain the separation
    response = jsonify({
        "permanent": {
            "pc": {
                "epic": permanent.get("epic_games", []),
                "steam": permanent.get("steam", [])
            },
            "console": {
                "playstation": permanent.get("playstation", []),
                "xbox": permanent.get("xbox", [])
            }
        },
        "temporary": temporary,
        "sale": sale
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)