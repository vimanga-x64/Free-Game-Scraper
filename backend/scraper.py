import requests

def get_permanent_free_games():
    url = "https://www.freetogame.com/api/games"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        return [
            {
                "title": game["title"],
                "link": game["game_url"],
                "thumbnail": game["thumbnail"],
                "platform": "pc"
            }
            for game in data
        ][:20]
    except Exception as e:
        print("Error fetching permanent games:", e)
        return []

def get_temporary_free_games():
    # Example: only Epic Games (temporarily free) for now
    try:
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
        response = requests.get(url, timeout=10)
        data = response.json()

        games = data["data"]["Catalog"]["searchStore"]["elements"]
        free_now = []

        for game in games:
            promotions = game.get("promotions")
            if not promotions:
                continue

            for promo in promotions.get("promotionalOffers", []):
                for offer in promo.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        free_now.append({
                            "title": game["title"],
                            "link": f"https://store.epicgames.com/en-US/p/{game['productSlug']}",
                            "thumbnail": game["keyImages"][0]["url"] if game["keyImages"] else "",
                            "platform": "pc"
                        })
        return free_now[:10]
    except Exception as e:
        print("Error fetching temporary games:", e)
        return []
