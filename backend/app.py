from flask import Flask, jsonify
from flask_cors import CORS
from scraper import get_permanent_free_games, get_temporary_free_games

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return "Free Game Scraper API is running!"

@app.route("/api/free-games")
def get_free_games():
    return jsonify({
        "permanent": get_permanent_free_games(),
        "temporary": get_temporary_free_games()
    })

# Render-compatible run config
import os
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
