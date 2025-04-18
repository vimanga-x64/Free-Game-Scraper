# Free-Game-Scraper

A web application that aggreagtes free PC games from various platforms (Epic Games, Steam, GOG, Humble Bundle, etc.) in one place. Never miss a free game deal again!


# Features

- **Permanently Free Games**: Discover free-to-play games that never expire.
- **Limited-Time Offers**: Claim games that are temporarily free (Epic, Steam, etc.)
- **Discounts**: Find heavily discounted games.
- **Platform Filtering**: Filter by Windows, Mac or Linux
- **Store Filtering**: Filter by specific game stores.
- **Countdown Timers**: See how much time is left to claim limited-time offers.
- **Responsive Design**: Works on desktop and mobile devices.
- **Game Details**: View detailed information about each game.

# Planned Features

- **Console Free Games**: Support for Playstation and Xbox Gold free games (planned for future update).
- **Email Notifications**: Get alerts when new games are available.
- **User Accounts**: Save your favorite games and preferences.

## How It Works

The application consists of:
- **Backend**: Python Flask server that scrapes game data from various sources.
- **Frontend**: Responsive web interface built with HTML, CSS and JavaScript.
- **Caching**: Client-side caching to reduce API calls.

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Python, Flask
- **Scraping**: BeautifulSoup, requests
- **Deployment**: Render

## Installation

## Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/free-game-finder.git
   cd free-game-finder

2. Set up a Python virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`

3. Install dependencies
   pip install -r requirements.txt

4. Run the Flask server
   python app.py
