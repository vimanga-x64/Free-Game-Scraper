import requests

def get_permanent_free_games():
    try:
        response = requests.get("https://www.freetogame.com/api/games", timeout=10)
        data = response.json()
        return {
            "pc": [
                {
                    "title": game["title"],
                    "link": game["game_url"],
                    "thumbnail": game["thumbnail"]
                } for game in data
            ],
            "console": []  # Currently no reliable API for console permanent games
        }
    except Exception as e:
        print("Error fetching permanent games:", e)
        return { "pc": [], "console": [] }

def get_temporary_free_games():
    try:
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
        response = requests.get(url, timeout=10)
        games = response.json()["data"]["Catalog"]["searchStore"]["elements"]

        free_now_pc = []

        for game in games:
            promos = game.get("promotions", {})
            offers = promos.get("promotionalOffers", [])

            if offers:
                for offer in offers[0]["promotionalOffers"]:
                    if offer["discountSetting"]["discountPercentage"] == 0:
                        free_now_pc.append({
                            "title": game["title"],
                            "link": f"https://store.epicgames.com/en-US/p/{game['productSlug']}",
                            "thumbnail": game["keyImages"][0]["url"] if game["keyImages"] else ""
                        })

        return {
            "pc": free_now_pc,
            "console": []  # Placeholder for future support (e.g., scraping Xbox or PlayStation)
        }

    except Exception as e:
        print("Error fetching temporary games:", e)
        return { "pc": [], "console": [] }
