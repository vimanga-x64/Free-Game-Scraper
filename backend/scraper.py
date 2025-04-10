import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta

def get_permanent_free_games():
    try:
        # PC Games from FreeToGame
        pc_response = requests.get("https://www.freetogame.com/api/games", timeout=10)
        pc_data = pc_response.json()
        
        # Console games (manually curated for now)
        console_games = {
            "action": [
                {
                    "title": "Warframe",
                    "link": "https://www.playstation.com/games/warframe/",
                    "thumbnail": "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/TJvzqKJZRaLQ4wDq1WAXJX1w.png",
                    "genre": "action",
                    "store": "playstation"
                }
            ],
            "mmo": [
                {
                    "title": "War Thunder",
                    "link": "https://warthunder.com/",
                    "thumbnail": "https://warthunder.com/upload/image/!%202022%20NEWS/06.2022/Update%20Drone%20Age/wt_cover_DA_en.jpg",
                    "genre": "mmo",
                    "store": "cross-platform"
                }
            ]
        }
        
        return {
            "pc": categorize_games(pc_data),
            "console": console_games
        }
    except Exception as e:
        print("Error fetching permanent games:", e)
        return { "pc": {}, "console": {} }

def get_temporary_free_games():
    return {
        "pc": {
            "epic_games": get_epic_free_games(),
            "steam": get_steam_free_games(),
            "gog": get_gog_free_games()
        },
        "console": {
            "playstation": get_ps_plus_free_games(),
            "xbox": get_xbox_gold_free_games()
        }
    }

def get_epic_free_games():
    try:
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
        params = {"locale": "en-US", "country": "US", "allowCountries": "US"}
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
                            slug = (game.get("productSlug") or 
                                  game.get("urlSlug") or 
                                  game.get("catalogNs", {}).get("mappings", [{}])[0].get("pageSlug"))
                            
                            if not slug or slug == "[]":
                                continue
                                
                            # Get the best available image
                            thumbnail = ""
                            for img_type in ["Thumbnail", "OfferImageTall", "OfferImageWide", "DieselStoreFrontWide"]:
                                thumbnail = next(
                                    (img["url"] for img in game.get("keyImages", []) 
                                     if img.get("type") == img_type),
                                    ""
                                )
                                if thumbnail:
                                    break
                            
                            free_games.append({
                                "title": game["title"],
                                "link": f"https://store.epicgames.com/en-US/p/{slug}",
                                "thumbnail": thumbnail,
                                "genre": "epic",
                                "store": "epic",
                                "end_date": offer.get("endDate", "")
                            })
                            break
        
        return free_games
    except Exception as e:
        print("Epic Games scraper error:", e)
        return []

def get_steam_free_games():
    try:
        url = "https://store.steampowered.com/search/?maxprice=free&specials=1"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_rows = soup.select('#search_resultsRows a')
        
        for game in game_rows:
            title = game.select('.title')[0].text.strip()
            link = game['href']
            app_id = link.split('/')[4] if len(link.split('/')) > 4 else ''
            
            # Get thumbnail using Steam API
            thumbnail = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
            
            # Get original price to confirm it's a temporary promotion
            price_block = game.select('.search_price')
            if len(price_block) > 0:
                original_price = price_block[0].text.strip()
                if 'Free' in original_price and '100%' in original_price:
                    free_games.append({
                        "title": title,
                        "link": link,
                        "thumbnail": thumbnail,
                        "genre": "steam",
                        "store": "steam"
                    })
        
        return free_games
    except Exception as e:
        print("Steam scraper error:", e)
        return []

def get_gog_free_games():
    try:
        url = "https://www.gog.com/en/games?priceRange=0,0&discounted=true"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.product-tile')
        
        for game in game_cards:
            # Only include temporarily free games (not permanently free)
            discount_tag = game.select('.product-tile__discount-tag')
            if not discount_tag or '100%' not in discount_tag[0].text:
                continue
                
            title = game.select('.product-tile__title')[0].text.strip()
            link = "https://www.gog.com" + game['href']
            thumbnail = game.select('.product-tile__image source')[0]['srcset'].split()[0]
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail,
                "genre": "gog",
                "store": "gog"
            })
        
        return free_games
    except Exception as e:
        print("GOG scraper error:", e)
        return []

def get_ps_plus_free_games():
    try:
        url = "https://www.playstation.com/en-us/ps-plus/games/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.cmp-game-card')
        
        for game in game_cards:
            title = game.select('.cmp-game-card__title')[0].text.strip()
            link = "https://www.playstation.com" + game.select('a')[0]['href']
            thumbnail = game.select('img')[0]['src']
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail,
                "genre": "playstation",
                "store": "playstation"
            })
        
        return free_games
    except Exception as e:
        print("PlayStation Plus scraper error:", e)
        return []

def get_xbox_gold_free_games():
    try:
        url = "https://www.xbox.com/en-US/live/gold#gameswithgold"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.gameDiv')
        
        for game in game_cards:
            title = game.select('.gameTitle')[0].text.strip()
            link = "https://www.xbox.com" + game.select('a')[0]['href']
            thumbnail = game.select('img')[0]['src']
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail,
                "genre": "xbox",
                "store": "xbox"
            })
        
        return free_games
    except Exception as e:
        print("Xbox Gold scraper error:", e)
        return []

def get_discounted_games():
    discounted = {
        "steam": [],
        "gog": []
    }

    # --- Steam API ---
    try:
        steam_url = "https://store.steampowered.com/api/featuredcategories?cc=US&l=en"
        response = requests.get(steam_url, timeout=15)
        data = response.json()

        for game in data.get("specials", {}).get("items", []):
            if 0 < game.get("discount_percent", 0) < 100:
                discounted["steam"].append({
                    "title": game["name"],
                    "link": f"https://store.steampowered.com/app/{game['id']}",
                    "thumbnail": game["header_image"],
                    "discountPercentage": game["discount_percent"],
                    "originalPrice": game.get("original_price", 0) / 100 if game.get("original_price") else None,
                    "store": "steam"
                })
    except Exception as e:
        print("Steam API error:", e)

    # --- GOG API ---
    try:
        gog_url = "https://www.gog.com/games/ajax/filtered?mediaType=game&sort=popularity&discounted=true"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(gog_url, headers=headers, timeout=15)
        data = response.json()

        for game in data.get("products", []):
            if game.get("price", {}).get("discountPercentage", 0) < 100:
                discounted["gog"].append({
                    "title": game["title"],
                    "link": "https://www.gog.com" + game["url"],
                    "thumbnail": game["image"],
                    "discountPercentage": game["price"]["discountPercentage"],
                    "originalPrice": float(game["price"]["baseAmount"]) if game["price"]["baseAmount"] else None,
                    "store": "gog"
                })
    except Exception as e:
        print("GOG API error:", e)

    return discounted



def categorize_games(games_list):
    categories = {}
    for game in games_list:
        genre = game.get("genre", "other").lower()
        if genre not in categories:
            categories[genre] = []
        game_data = {
            "title": game["title"],
            "link": game["game_url"] if "game_url" in game else game.get("link", "#"),
            "thumbnail": game["thumbnail"],
            "genre": genre,
            "store": game.get("store", "unknown")
        }
        categories[genre].append(game_data)
    return categories