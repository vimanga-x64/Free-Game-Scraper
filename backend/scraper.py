import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import pickle
import os
import time
from functools import wraps

# Cache configuration
CACHE_FILE = 'scraper_cache.pkl'
CACHE_DURATION = timedelta(hours=1)
REQUEST_DELAY = 3  # seconds between requests
LAST_REQUEST_TIME = 0

# Cache functions
def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'rb') as f:
                return pickle.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'wb') as f:
        pickle.dump(cache, f)

def clean_old_cache():
    cache = load_cache()
    now = datetime.now()
    updated = False
    
    for url in list(cache.keys()):
        if now - cache[url]['timestamp'] > CACHE_DURATION * 2:
            del cache[url]
            updated = True
    
    if updated:
        save_cache(cache)

# Rate limiting decorator
def rate_limit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        global LAST_REQUEST_TIME
        elapsed = time.time() - LAST_REQUEST_TIME
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        result = func(*args, **kwargs)
        LAST_REQUEST_TIME = time.time()
        return result
    return wrapper

# Retry decorator
def retry(max_retries=3, delay=5):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        print(f"Failed after {max_retries} attempts: {e}")
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

# Helper function for cached scraping
def get_with_cache(url, scraper_func):
    cache = load_cache()
    
    if url in cache:
        cached_data = cache[url]
        if datetime.now() - cached_data['timestamp'] < CACHE_DURATION:
            return cached_data['data']
    
    data = scraper_func(url)
    cache[url] = {
        'timestamp': datetime.now(),
        'data': data
    }
    save_cache(cache)
    return data

# Initialize cache
clean_old_cache()

# Main scraping functions
@rate_limit
@retry(max_retries=3, delay=5)
def get_epic_free_games():
    url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
    params = {"locale": "en-US", "country": "US", "allowCountries": "US"}
    
    def scrape_epic(url):
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        free_games = []
        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        
        for game in elements:
            promotions = game.get("promotions")
            if not promotions:
                continue
                
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
    
    return get_with_cache(url, scrape_epic)

@rate_limit
@retry(max_retries=3, delay=5)
def get_steam_free_games():
    url = "https://store.steampowered.com/search/?maxprice=free&specials=1"
    
    def scrape_steam(url):
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_rows = soup.select('#search_resultsRows a')[:15]
        
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
                        "genre": "steam",
                        "store": "steam"
                    })
        
        return free_games
    
    return get_with_cache(url, scrape_steam)

@rate_limit
@retry(max_retries=3, delay=5)
def get_gog_free_games():
    url = "https://www.gog.com/en/games?priceRange=0,0&discounted=true"
    
    def scrape_gog(url):
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.product-tile')[:12]
        
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
                "store": "gog"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_gog)

@rate_limit
@retry(max_retries=3, delay=5)
def get_ps_plus_free_games():
    url = "https://www.playstation.com/en-us/ps-plus/games/"
    
    def scrape_playstation(url):
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.cmp-game-card')[:12]
        
        for game in game_cards:
            title = game.select_one('.cmp-game-card__title')
            if not title:
                continue
                
            title = title.text.strip()
            link = game.select_one('a')
            link = "https://www.playstation.com" + link['href'] if link else '#'
            
            img = game.select_one('img')
            thumbnail = img['src'] if img else None
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail or 'https://via.placeholder.com/300x200?text=PS+Game',
                "genre": "playstation",
                "store": "playstation",
                "developer": "Unknown"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_playstation)

@rate_limit
@retry(max_retries=3, delay=5)
def get_xbox_gold_free_games():
    url = "https://www.xbox.com/games/free-to-play"
    
    def scrape_xbox(url):
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.m-product-placement-item')[:12]
        
        for game in game_cards:
            title = game.select_one('h3').text.strip() if game.select_one('h3') else None
            if not title:
                continue
                
            link = game.select_one('a')['href'] if game.select_one('a') else '#'
            if not link.startswith('http'):
                link = f"https://www.xbox.com{link}"
                
            thumbnail = None
            img_tag = game.select_one('img')
            if img_tag:
                thumbnail = img_tag.get('src') or img_tag.get('data-src')
                if thumbnail and thumbnail.startswith('//'):
                    thumbnail = f"https:{thumbnail}"
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail or 'https://via.placeholder.com/300x200?text=Xbox+Game',
                "genre": "xbox",
                "store": "xbox",
                "developer": "Unknown"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_xbox)

@rate_limit
@retry(max_retries=3, delay=5)
def get_discounted_games():
    discounted = {"steam": [], "gog": []}
    
    # Steam discounts
    try:
        steam_url = "https://store.steampowered.com/api/featuredcategories?cc=US&l=en"
        response = requests.get(steam_url, timeout=15)
        response.raise_for_status()
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

    # GOG discounts
    try:
        gog_url = "https://www.gog.com/games/ajax/filtered?mediaType=game&sort=popularity&discounted=true"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(gog_url, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()

        for game in data.get("products", []):
            if game.get("price", {}).get("discountPercentage", 0) < 100:
                discounted["gog"].append({
                    "title": game["title"],
                    "link": "https://www.gog.com" + game["url"],
                    "thumbnail": "https:" + game["image"] + ".jpg",
                    "discountPercentage": game["price"]["discountPercentage"],
                    "originalPrice": float(game["price"]["baseAmount"]) if game["price"]["baseAmount"] else None,
                    "finalPrice": float(game["price"]["finalAmount"]) if game["price"]["finalAmount"] else None,
                    "store": "gog"
                })
    except Exception as e:
        print("GOG API error:", e)

    return discounted

def get_permanent_free_games():
    try:
        return {
            "pc": {
                "epic_games": [],
                "steam": []
            },
            "console": {
                "playstation": get_ps_plus_free_games(),
                "xbox": get_xbox_gold_free_games()
            }
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