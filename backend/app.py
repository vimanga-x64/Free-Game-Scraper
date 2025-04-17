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
    return jsonify({
        "permanent": {
            "pc": get_permanent_free_games().get("pc", {})
        },
        "temporary": {
            "pc": get_temporary_free_games().get("pc", {})
        },
        "sale": get_discounted_games()
    })
    response.headers.add('Access-Control-Allow-Origin', 'https://vimanga-x64.github.io')
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)