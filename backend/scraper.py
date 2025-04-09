import requests

def scrape_freetogame_pc():
    url = "https://www.freetogame.com/api/games"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        games = [
            {"title": game["title"], "link": game["game_url"]}
            for game in data if "pc" in game["platform"].lower()
        ]
        return games[:20]  # limit to top 20
    except Exception as e:
        print("Error fetching FreeToGame:", e)
        return []

def get_static_console_games():
    return {
        "playstation": [
            {"title": "Fortnite", "link": "https://www.playstation.com/en-us/games/fortnite/"},
            {"title": "Warframe", "link": "https://www.playstation.com/en-us/games/warframe/"},
            {"title": "Call of Duty: Warzone", "link": "https://www.playstation.com/en-us/games/call-of-duty-warzone/"},
            {"title": "Fall Guys", "link": "https://www.playstation.com/en-us/games/fall-guys/"}
        ],
        "xbox": [
            {"title": "Fortnite", "link": "https://www.xbox.com/en-US/games/fortnite"},
            {"title": "Warframe", "link": "https://www.xbox.com/en-US/games/warframe"},
            {"title": "Call of Duty: Warzone", "link": "https://www.xbox.com/en-US/games/call-of-duty-warzone"},
            {"title": "Fall Guys", "link": "https://www.xbox.com/en-US/games/fall-guys"}
        ]
    }
