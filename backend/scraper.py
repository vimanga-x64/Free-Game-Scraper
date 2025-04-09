import requests

def get_permanent_free_games():
    try:
        # PC Games (existing)
        pc_response = requests.get("https://www.freetogame.com/api/games", timeout=10)
        pc_data = pc_response.json()
        
        # Add PlayStation free games (example - you'll need to find a real source)
        console_games = [
            {
                "title": "Warframe",
                "link": "https://www.playstation.com/games/warframe/",
                "thumbnail": "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/TJvzqKJZRaLQ4wDq1WAXJX1w.png"
            },
            {
                "title": "Rocket League",
                "link": "https://www.rocketleague.com/",
                "thumbnail": "https://www.rocketleague.com/assets/images/RL_KeyArt_PS4-1a8ef6d6a6.jpg"
            }
        ]
        
        permanent_games = {
            "pc": [
                {
                    "title": game["title"],
                    "link": game["game_url"],
                    "thumbnail": game["thumbnail"]
                } for game in pc_data
            ],
            "console": console_games
        }
        return permanent_games
    except Exception as e:
        print("Error fetching permanent games:", e)
        return { "pc": [], "console": [] }

def get_temporary_free_games():
    try:
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Debug: Save raw response to check structure
        with open('epic_response.json', 'w') as f:
            json.dump(data, f)
        
        # Updated parsing logic
        free_now_pc = []
        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        
        for game in elements:
            # Check both current and upcoming promotions
            promotions = game.get("promotions", {})
            promotional_offers = promotions.get("promotionalOffers", [])
            upcoming_offers = promotions.get("upcomingPromotionalOffers", [])
            
            # Check current promotions
            for offer_group in promotional_offers:
                for offer in offer_group.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage", 100) == 0:
                        free_now_pc.append({
                            "title": game["title"],
                            "link": f"https://store.epicgames.com/en-US/p/{game.get('productSlug', '')}",
                            "thumbnail": next((img["url"] for img in game.get("keyImages", []) if img.get("type") == "Thumbnail"), "")
                        })
                        break
            
            # Check upcoming promotions if none found
            if not free_now_pc:
                for offer_group in upcoming_offers:
                    for offer in offer_group.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage", 100) == 0:
                            free_now_pc.append({
                                "title": game["title"] + " (Upcoming)",
                                "link": f"https://store.epicgames.com/en-US/p/{game.get('productSlug', '')}",
                                "thumbnail": next((img["url"] for img in game.get("keyImages", []) if img.get("type") == "Thumbnail"), "")
                            })
                            break

        return {
            "pc": free_now_pc,
            "console": []  # You can add console temporary games here when available
        }
    except Exception as e:
        print("Error fetching temporary games:", e)
        return { "pc": [], "console": [] }
