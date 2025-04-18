import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timedelta

BACKUP_JSON_PATH = 'free_games_backup.json'

def get_permanent_free_games():
    try:
        # PC Games from FreeToGame
        pc_response = requests.get("https://www.freetogame.com/api/games", timeout=10)
        pc_data = pc_response.json()
        
        return {
            "pc": categorize_games(pc_data)  # Only return PC games
        }
    except Exception as e:
        print("Error fetching permanent games:", e)
        return { "pc": {} }  # Only return PC games structure

def get_temporary_free_games():
    try:
        # Try CheapShark API first for Steam, GOG, etc.
        cheap_shark_games = get_cheap_shark_free_games()
        
        # Get Epic Games directly from your scraper
        epic_games = get_epic_free_games()
        
        # Combine results
        result = {
            "pc": {
                "epic_games": epic_games,
                "steam": cheap_shark_games.get('steam', []),
                "gog": cheap_shark_games.get('gog', []),
                "humble": cheap_shark_games.get('humble', []),
                "itchio": get_itchio_free_games()  # Keep direct scraper as fallback
            }
        }
        
        # If any store has no games, try loading from backup
        if any(not games for games in result['pc'].values()):
            backup_data = load_backup_data()
            for store in result['pc']:
                if not result['pc'][store]:
                    result['pc'][store] = backup_data.get(store, [])
        
        return result
        
    except Exception as e:
        print(f"Error in get_temporary_free_games: {str(e)}")
        # Fallback to backup data if everything fails
        return load_backup_data()
    
def get_cheap_shark_free_games():
    try:
        url = "https://www.cheapshark.com/api/1.0/deals?upperPrice=0&onSale=1"
        response = requests.get(url, timeout=15)
        deals = response.json()
        
        games_by_store = {"steam": [], "gog": [], "humble": []}
        
        for deal in deals:
            game = {
                "title": deal["title"],
                "link": f"https://www.cheapshark.com/redirect?dealID={deal['dealID']}",
                "thumbnail": deal["thumb"],
                "store": deal["storeID"].lower(),
                "end_date": (datetime.utcnow() + timedelta(days=3)).isoformat()
            }
            
            # Map CheapShark store IDs to our store names
            store_map = {
                "1": "steam",
                "7": "gog",
                "11": "humble"
            }
            
            if deal["storeID"] in store_map:
                games_by_store[store_map[deal["storeID"]]].append(game)
        
        return games_by_store
        
    except Exception as e:
        print(f"CheapShark API error: {str(e)}")
        return {}
    
def load_backup_data():
    try:
        if os.path.exists(BACKUP_JSON_PATH):
            with open(BACKUP_JSON_PATH, 'r') as f:
                return json.load(f)
        return {"pc": {"epic_games": [], "steam": [], "gog": [], "humble": [], "itchio": []}}
    except Exception as e:
        print(f"Error loading backup data: {str(e)}")
        return {"pc": {"epic_games": [], "steam": [], "gog": [], "humble": [], "itchio": []}}


def optimize_thumbnail_url(url):
    """Optimize thumbnail URLs for faster loading"""
    if not url:
        return url
    
    # Example optimizations for common stores
    if 'cdn.cloudflare.steamstatic.com' in url:
        return url.replace('header.jpg', 'capsule_sm_120.jpg')
    elif 'akamaihd.net' in url:  # Epic Games
        return url.replace('offer_image_tall', 'offer_image_small')
    elif 'gog.com' in url:
        return url.replace('_product_tile_256', '_product_tile_120')
    
    return url

def get_humble_free_games():
    try:
        url = "https://www.humblebundle.com/store/api/search?sort=discount&filter=free"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        data = response.json()

        return [{
            "title": game["human_name"],
            "link": f"https://www.humblebundle.com/store/{game['human_url']}",
            "thumbnail": game["standard_carousel_image"],
            "store": "humble",
            "platforms": ["windows"],
            "end_date": (datetime.utcnow() + timedelta(days=4)).isoformat()  # estimated
        } for game in data.get("results", [])]
    except Exception as e:
        print("Humble Bundle error:", e)
        return []
    

def get_itchio_free_games():
    try:
        url = "https://itch.io/games/free"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')

        games = []
        for game in soup.select('.game_cell'):
            games.append({
                "title": game.select('.game_title')[0].text.strip(),
                "link": game.select('a.title_link')[0]['href'],
                "thumbnail": game.select('img.game_thumb')[0]['src'],
                "store": "itchio",
                "platforms": get_itchio_platforms(game),
                "end_date": (datetime.utcnow() + timedelta(days=7)).isoformat()  # estimated
            })
        return games
    except Exception as e:
        print("itch.io error:", e)
        return []

def get_itchio_platforms(game_element):
    platforms = []
    if game_element.select('.platform_win'): platforms.append("windows")
    if game_element.select('.platform_mac'): platforms.append("mac")
    if game_element.select('.platform_linux'): platforms.append("linux")
    return platforms  

def get_origin_free_games():
    try:
        url = "https://www.origin.com/usa/en-us/free-games"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')

        games = []
        for game in soup.select('.origin-store-game-tile'):
            if "On the House" in game.text:
                games.append({
                    "title": game.select('.origin-store-game-tile-title')[0].text.strip(),
                    "link": "https://www.origin.com" + game.find('a')['href'],
                    "thumbnail": game.select('img.origin-store-game-tile-image')[0]['src'],
                    "store": "origin",
                    "platforms": ["windows"],
                    "end_date": (datetime.utcnow() + timedelta(days=5)).isoformat()  # estimated
                })
        return games
    except Exception as e:
        print("Origin error:", e)
        return []
    
def extract_origin_end_date(game_element):
    try:
        # Origin typically shows dates like "Free until Mar 15"
        date_text = game_element.select('.origin-store-program-promo-end-date')[0].text
        date_str = re.search(r'until (.*)', date_text).group(1)
        return str(datetime.strptime(date_str, '%b %d').replace(year=datetime.now().year))
    except:
        return ""  # Return empty if date parsing fails

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
                                "thumbnail": optimize_thumbnail_url(thumbnail),
                                "description": game.get("description", ""),
                                "store": "Epic",
                                "platforms": ["windows"], 
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

            thumbnail = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"

            price_block = game.select('.search_price')
            if len(price_block) > 0:
                original_price = price_block[0].text.strip()
                if 'Free' in original_price and '100%' in original_price:
                    free_games.append({
                        "title": title,
                        "link": link,
                        "thumbnail": thumbnail,
                        "store": "steam",
                        "platforms": ["windows"],
                        "end_date": (datetime.utcnow() + timedelta(days=3)).isoformat()  # estimated
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
                "store": "gog",
                "platforms": ["windows"],
                "end_date": (datetime.utcnow() + timedelta(days=2)).isoformat()  # estimated
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
                    "finalPrice": (game.get("original_price", 0) * (100 - game.get("discount_percent", 0)) / 10000) if game.get("original_price") else None,
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
                    "thumbnail": "https:" + game["image"] + ".jpg",  # Fixed thumbnail URL
                    "discountPercentage": game["price"]["discountPercentage"],
                    "originalPrice": float(game["price"]["baseAmount"]) if game["price"]["baseAmount"] else None,
                    "finalPrice": float(game["price"]["finalAmount"]) if game["price"]["finalAmount"] else None,
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