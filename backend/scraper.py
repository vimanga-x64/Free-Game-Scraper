import requests

def get_permanent_free_games():
    try:
        pc_response = requests.get("https://www.freetogame.com/api/games", timeout=10)
        pc_data = pc_response.json()
        
        # Organized by category
        console_games = {
            "action": [
                {
                    "title": "Warframe",
                    "link": "https://www.playstation.com/games/warframe/",
                    "thumbnail": "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/TJvzqKJZRaLQ4wDq1WAXJX1w.png",
                    "genre": "action"
                }
            ],
            "adventure": [
                {
                    "title": "Rocket League",
                    "link": "https://www.rocketleague.com/",
                    "thumbnail": "https://www.rocketleague.com/assets/images/RL_KeyArt_PS4-1a8ef6d6a6.jpg",
                    "genre": "sports"
                }
            ],
            "mmo": [
                {
                    "title": "War Thunder",
                    "link": "https://warthunder.com/",
                    "thumbnail": "https://warthunder.com/upload/image/!%202022%20NEWS/06.2022/Update%20Drone%20Age/wt_cover_DA_en.jpg",
                    "genre": "mmo"
                }
            ]
        }
        
        return {
            "pc": categorize_games(pc_data),
            "console": console_games
        }
    except Exception as e:
        print("Error:", e)
        return {"pc": {}, "console": {}}

def categorize_games(games_list):
    categories = {}
    for game in games_list:
        genre = game.get("genre", "other").lower()
        if genre not in categories:
            categories[genre] = []
        categories[genre].append({
            "title": game["title"],
            "link": game["game_url"],
            "thumbnail": game["thumbnail"],
            "genre": genre
        })
    return categories

def get_temporary_free_games():
    try:
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
        params = {
            "locale": "en-US",
            "country": "US",
            "allowCountries": "US"
        }
        response = requests.get(url, params=params, timeout=15)
        data = response.json()
        
        free_games = []
        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        
        for game in elements:
            promotions = game.get("promotions")
            if not promotions:
                continue
                
            # Check both current and upcoming promotions
            for offer_type in ["promotionalOffers", "upcomingPromotionalOffers"]:
                offers = promotions.get(offer_type, [])
                for offer_group in offers:
                    for offer in offer_group.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage", 100) == 0:
                            # Get proper slug (some games use different field)
                            slug = game.get("productSlug") or game.get("urlSlug")
                            if not slug or slug == "[]":
                                continue
                                
                            free_games.append({
                                "title": game["title"],
                                "link": f"https://store.epicgames.com/en-US/p/{slug}",
                                "thumbnail": next(
                                    (img["url"] for img in game.get("keyImages", []) 
                                     if img.get("type") == "Thumbnail"),
                                    ""
                                ),
                                "genre": game.get("categories", [{}])[0].get("path", "other")
                            })
                            break
        
        return {
            "pc": categorize_games(free_games),
            "console": {}  # Can add Xbox/PlayStation temporary deals later
        }
    except Exception as e:
        print("Epic Games scrape error:", e)
        return {"pc": {}, "console": {}}