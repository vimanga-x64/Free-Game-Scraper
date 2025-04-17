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
    """Scrape time-limited free games from Epic Games Store"""
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
def get_epic_permanent_free_games():
    """Scrape permanently free games from Epic Games Store"""
    url = "https://store.epicgames.com/en-US/browse?sortBy=releaseDate&sortDir=DESC&priceTier=free&count=40"
    
    def scrape_epic_permanent(url):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('a[href*="/en-US/p/"]')[:20]
        
        for card in game_cards:
            title = card.select_one('div[data-testid="title"]')
            if not title:
                continue
                
            title = title.text.strip()
            link = "https://store.epicgames.com" + card['href']
            
            thumbnail = card.select_one('img')
            thumbnail = thumbnail['src'] if thumbnail else None
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail or 'https://via.placeholder.com/300x200?text=Epic+Game',
                "genre": "epic",
                "store": "epic"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_epic_permanent)

@rate_limit
@retry(max_retries=3, delay=5)
def get_steam_free_games():
    """Scrape time-limited free games from Steam"""
    url = "https://store.steampowered.com/search/?maxprice=free&specials=1"
    
    def scrape_steam(url):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
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
                price_text = price_block[0].text.strip()
                if 'Free' in price_text and '100%' in price_text:
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
def get_steam_permanent_free_games():
    """Scrape permanently free games from Steam"""
    url = "https://store.steampowered.com/search/?maxprice=free&specials=0&category1=998&supportedlang=english"
    
    def scrape_steam_permanent(url):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_rows = soup.select('#search_resultsRows a')[:20]
        
        for game in game_rows:
            title = game.select('.title')[0].text.strip()
            link = game['href']
            app_id = link.split('/')[4] if len(link.split('/')) > 4 else ''
            
            thumbnail = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
            
            price_block = game.select('.search_price')
            if len(price_block) > 0:
                price_text = price_block[0].text.strip()
                if 'Free' in price_text and '100%' not in price_text:
                    free_games.append({
                        "title": title,
                        "link": link,
                        "thumbnail": thumbnail,
                        "genre": "steam",
                        "store": "steam"
                    })
        
        return free_games
    
    return get_with_cache(url, scrape_steam_permanent)

@rate_limit
@retry(max_retries=3, delay=5)
def get_gog_free_games():
    """Scrape free games from GOG"""
    url = "https://www.gog.com/en/games?priceRange=0,0&discounted=true"
    
    def scrape_gog(url):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
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
    """Scrape PlayStation Plus free games"""
    url = "https://www.playstation.com/en-us/ps-plus/games/"
    
    def scrape_playstation(url):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
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
                "store": "playstation"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_playstation)

@rate_limit
@retry(max_retries=3, delay=5)
def get_xbox_gold_free_games():
    """Scrape Xbox Game Pass free games"""
    url = "https://www.xbox.com/en-US/games/all-games?cat=freetoplay"
    
    def scrape_xbox(url):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        free_games = []
        game_cards = soup.select('.m-product-placement-item')[:12]
        
        for game in game_cards:
            title = game.select_one('h3')
            if not title:
                continue
                
            title = title.text.strip()
            link = game.select_one('a')
            link = link['href'] if link else '#'
            if link.startswith('/'):
                link = f"https://www.xbox.com{link}"
                
            thumbnail = game.select_one('img')
            thumbnail = thumbnail.get('src') or thumbnail.get('data-src')
            if thumbnail and thumbnail.startswith('//'):
                thumbnail = f"https:{thumbnail}"
            
            free_games.append({
                "title": title,
                "link": link,
                "thumbnail": thumbnail or 'https://via.placeholder.com/300x200?text=Xbox+Game',
                "genre": "xbox",
                "store": "xbox"
            })
        
        return free_games
    
    return get_with_cache(url, scrape_xbox)

@rate_limit
@retry(max_retries=3, delay=5)
def get_discounted_games():
    """Get all discounted games with pricing info"""
    discounted = {"steam": [], "gog": [], "epic": []}
    
    try:
        # Steam discounts
        steam_url = "https://store.steampowered.com/api/featuredcategories?cc=US&l=en"
        response = requests.get(steam_url, timeout=15)
        response.raise_for_status()
        data = response.json()

        for game in data.get("specials", {}).get("items", []):
            if 0 < game.get("discount_percent", 0) < 100:
                original_price = game.get("original_price", 0) / 100 if game.get("original_price") else 0
                final_price = original_price * (100 - game.get("discount_percent", 0)) / 100
                
                discounted["steam"].append({
                    "title": game["name"],
                    "link": f"https://store.steampowered.com/app/{game['id']}",
                    "thumbnail": game["header_image"],
                    "discountPercentage": game["discount_percent"],
                    "originalPrice": f"${original_price:.2f}",
                    "finalPrice": f"${final_price:.2f}",
                    "store": "steam"
                })
    except Exception as e:
        print(f"Steam discounts error: {e}")
    
    try:
        # GOG discounts
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
                    "originalPrice": f"${float(game['price']['baseAmount']):.2f}" if game["price"]["baseAmount"] else "$0.00",
                    "finalPrice": f"${float(game['price']['finalAmount']):.2f}" if game["price"]["finalAmount"] else "$0.00",
                    "store": "gog"
                })
    except Exception as e:
        print(f"GOG discounts error: {e}")
    
    try:
        # Epic Games discounts
        epic_url = "https://store.epicgames.com/en-US/browse?sortBy=currentPrice&sortDir=ASC&priceTier=discounted&count=40"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(epic_url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for card in soup.select('a[href*="/en-US/p/"]')[:15]:
            price_wrapper = card.select_one('[data-testid="price-wrapper"]')
            if not price_wrapper:
                continue
                
            original_price = price_wrapper.select_one('[data-testid="original-price"]')
            discount_price = price_wrapper.select_one('[data-testid="discount-price"]')
            discount_percent = price_wrapper.select_one('[data-testid="discount-percent"]')
            
            if not (original_price and discount_price and discount_percent):
                continue
                
            title = card.select_one('[data-testid="title"]')
            link = card['href']
            
            if title and link:
                discounted["epic"].append({
                    "title": title.text.strip(),
                    "link": "https://store.epicgames.com" + link,
                    "thumbnail": card.select_one('img')['src'] if card.select_one('img') else None,
                    "discountPercentage": int(discount_percent.text.strip().replace('%', '').replace('-', '')),
                    "originalPrice": original_price.text.strip(),
                    "finalPrice": discount_price.text.strip(),
                    "store": "epic"
                })
    except Exception as e:
        print(f"Epic discounts error: {e}")
    
    return discounted

def get_permanent_free_games():
    """Get all permanently free games (not time-limited)"""
    try:
        return {
            "pc": {
                "epic_games": get_epic_permanent_free_games(),
                "steam": get_steam_permanent_free_games()
            },
            "console": {
                "playstation": get_ps_plus_free_games(),
                "xbox": get_xbox_gold_free_games()
            }
        }
    except Exception as e:
        print(f"Error in get_permanent_free_games: {e}")
        return {
            "pc": {
                "epic_games": [],
                "steam": []
            },
            "console": {
                "playstation": [],
                "xbox": []
            }
        }

def get_temporary_free_games():
    """Get all time-limited free games"""
    try:
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
    except Exception as e:
        print(f"Error in get_temporary_free_games: {e}")
        return {
            "pc": {
                "epic_games": [],
                "steam": [],
                "gog": []
            },
            "console": {
                "playstation": [],
                "xbox": []
            }
        }

def categorize_games(games_list):
    """Categorize games by genre (legacy function, not currently used)"""
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