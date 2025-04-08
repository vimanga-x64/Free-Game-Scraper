from flask import Flask, jsonify
from flask_cors import CORS
import json
import requests
from bs4 import BeautifulSoup
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow frontend access
DB_PATH = Path("database.json")

def scrape_epic_games():
    url = "https://store.epicgames.com/en-US/free-games"
    headers = {"User-Agent": "Mozilla/5.0"}
    soup = BeautifulSoup(requests.get(url, headers=headers).text, "html.parser")
    games = []
    for a in soup.select("a[href^='/en-US/p/']"):
        title = a.get_text(strip=True)
        link = "https://store.epicgames.com" + a["href"]
        if title and link not in [g["link"] for g in games]:
            games.append({"title": title, "link": link})
    return games

def scrape_steam():
    url = "https://store.steampowered.com/genre/Free%20to%20Play/"
    headers = {"User-Agent": "Mozilla/5.0"}
    soup = BeautifulSoup(requests.get(url, headers=headers).text, "html.parser")
    games = []
    for div in soup.select("div.tab_item_name"):
        title = div.get_text(strip=True)
        link = div.find_parent("a")["href"]
        if title:
            games.append({"title": title, "link": link})
    return games

def scrape_all_games():
    return {
        "pc": {
            "epic_games": scrape_epic_games(),
            "steam": scrape_steam()
        },
        "console": {
            "playstation": [],
            "xbox": []
        }
    }

def load_games():
    if not DB_PATH.exists():
        return {"pc": {}, "console": {}}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_games(data):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

@app.route("/api/free-games", methods=["GET"])
def get_free_games():
    return jsonify(load_games())

@app.route("/api/scrape", methods=["POST"])
def update_free_games():
    data = scrape_all_games()
    save_games(data)
    return jsonify({"message": "Scrape complete", "data": data})

if __name__ == "__main__":
    app.run(debug=True)
