from flask import Flask, jsonify
from flask_cors import CORS
from scraper import scrape_freetogame_pc, get_static_console_games
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return "Free Game Scraper API is running!"

@app.route("/api/free-games")
def get_free_games():
    pc_games = {
        "freetogame": scrape_freetogame_pc()
    }
    console_games = get_static_console_games()
    return jsonify({
        "pc": pc_games,
        "console": console_games
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
