const API_URL = "https://free-game-scraper.onrender.com/api";
const CACHE_KEY = 'freeGamesCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const GAME_TYPES = {
  PC: 'pc',
  CONSOLE: 'console',
  SALE: 'sale'
};

async function fetchGames() {
  const container = document.getElementById("games-container");
  if (!container) return;

  const cachedData = getCachedData();
  if (cachedData) {
    displayGames(cachedData);
    return;
  }
  
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading free games...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_URL}/free-games`);
    if (!response.ok) throw new Error(`Failed to load games (Status: ${response.status})`);
    
    const data = await response.json();
    displayGames(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Failed to load games</h3>
        <p>${err.message}</p>
        <button class="retry-btn" onclick="fetchGames()">Try Again</button>
      </div>
    `;
  }

    cachedData(data);
}

function displayGames(data) {
  const container = document.getElementById("games-container");
  if (!container) return;
  
  container.innerHTML = '';

  const tabsDiv = document.createElement("div");
  tabsDiv.className = "tabs";
  
  const contentDiv = document.createElement("div");
  contentDiv.id = "games-content";
  container.appendChild(contentDiv);

  [GAME_TYPES.PC, GAME_TYPES.CONSOLE, GAME_TYPES.SALE].forEach(type => {
    const tab = document.createElement("button");
    tab.textContent = type.toUpperCase();
    tab.className = "tab-btn";
    tab.onclick = () => showGameType(type, data);
    tabsDiv.appendChild(tab);
  });
  
  container.insertBefore(tabsDiv, contentDiv);
  
  showGameType(GAME_TYPES.PC, data);
}

function showGameType(type, data) {
  const contentDiv = document.getElementById("games-content");
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === type.toUpperCase());
  });

  switch(type) {
    case GAME_TYPES.PC:
      renderPlatformGames('pc', data, contentDiv);
      break;
    case GAME_TYPES.CONSOLE:
      renderPlatformGames('console', data, contentDiv);
      break;
    case GAME_TYPES.SALE:
      renderAllDiscountedGames(data, contentDiv);
      break;
  }
}

function renderPlatformGames(platform, data, container) {
  if (!container) return;
  
  // Free-To-Play games (renamed from "Permanently Free Games")
  const permSection = createCollapsibleSection("Free-To-Play Games");
  const permGames = data.permanent?.[platform] || {};
  renderGenreCarousels(permSection, permGames, platform, 'free-to-play');
  container.appendChild(permSection);
  
  // Limited-Time Free games
  const tempSection = createCollapsibleSection("Limited-Time Free Games");
  const tempGames = data.temporary?.[platform] || {};
  renderGenreCarousels(tempSection, tempGames, platform, 'temporary');
  container.appendChild(tempSection);
}

function renderGenreCarousels(sectionElement, storeGames, platform, sectionType) {
  const content = sectionElement?.querySelector('.section-content');
  if (!content) return;
  
  if (Object.keys(storeGames).length === 0) {
    content.innerHTML = `<p class="empty-msg">No ${sectionType} ${platform} games available</p>`;
    return;
  }
  
  for (const store in storeGames) {
    if (!storeGames[store] || Object.keys(storeGames[store]).length === 0) continue;
    
    const storeHeader = document.createElement("h4");
    storeHeader.textContent = store.toUpperCase();
    content.appendChild(storeHeader);
    
    // Create a container for all genre carousels for this store
    const genreContainer = document.createElement("div");
    genreContainer.className = "genre-container";
    content.appendChild(genreContainer);
    
    // Check if storeGames[store] is an array (direct list of games) or an object (grouped by genre)
    if (Array.isArray(storeGames[store])) {
      // Handle case where games are directly in an array (no genre grouping)
      const carousel = createCarousel(storeGames[store], store, sectionType);
      genreContainer.appendChild(carousel);
    } else {
      // Handle case where games are grouped by genre
      for (const genre in storeGames[store]) {
        const games = storeGames[store][genre];
        if (!games || games.length === 0) continue;
        
        // Create genre section
        const genreSection = document.createElement("div");
        genreSection.className = "genre-section";
        
        const genreTitle = document.createElement("h5");
        genreTitle.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
        genreSection.appendChild(genreTitle);
        
        // Create and append carousel
        const carousel = createCarousel(games, store, sectionType);
        genreSection.appendChild(carousel);
        genreContainer.appendChild(genreSection);
      }
    }
  }
}


function createCarousel(games, store, sectionType) {
  const carousel = document.createElement("div");
  carousel.className = "carousel";
  
  const carouselContent = document.createElement("div");
  carouselContent.className = "carousel-content";
  
  games.forEach(game => {
    const gameWithStore = {
      ...game,
      store: game.store || store
    };
    carouselContent.appendChild(createGameCard(gameWithStore, sectionType === 'temporary'));
  });
  
  // Add navigation buttons (initially hidden)
  const prevBtn = document.createElement("button");
  prevBtn.className = "carousel-btn prev hidden";
  prevBtn.innerHTML = "&lt;";
  prevBtn.onclick = () => scrollCarousel(carousel, -1);
  
  const nextBtn = document.createElement("button");
  nextBtn.className = "carousel-btn next hidden";
  nextBtn.innerHTML = "&gt;";
  nextBtn.onclick = () => scrollCarousel(carousel, 1);
  
  carousel.appendChild(prevBtn);
  carousel.appendChild(carouselContent);
  carousel.appendChild(nextBtn);
  
  // Check overflow after rendering
  setTimeout(() => {
    checkCarouselOverflow(carousel);
  }, 100);
  
  // Add resize observer
  const resizeObserver = new ResizeObserver(() => {
    checkCarouselOverflow(carousel);
  });
  resizeObserver.observe(carouselContent);
  
  return carousel;
}

function checkCarouselOverflow(carousel) {
  const content = carousel.querySelector('.carousel-content');
  const prevBtn = carousel.querySelector('.prev');
  const nextBtn = carousel.querySelector('.next');
  
  // Show buttons only if content overflows
  const hasOverflow = content.scrollWidth > content.clientWidth;
  
  prevBtn.classList.toggle('hidden', !hasOverflow);
  nextBtn.classList.toggle('hidden', !hasOverflow);
  
  // Update button states based on scroll position
  updateButtonStates(carousel);
}

function updateButtonStates(carousel) {
  const content = carousel.querySelector('.carousel-content');
  const prevBtn = carousel.querySelector('.prev');
  const nextBtn = carousel.querySelector('.next');
  
  // Disable prev button if at start
  prevBtn.classList.toggle('disabled', content.scrollLeft <= 0);
  
  // Disable next button if at end
  nextBtn.classList.toggle('disabled', 
    content.scrollLeft + content.clientWidth >= content.scrollWidth
  );
}

function scrollCarousel(carousel, direction) {
  const content = carousel.querySelector('.carousel-content');
  const scrollAmount = content.clientWidth * 0.8; // Scroll 80% of visible width
  
  content.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
  
  // Update button states after scroll completes
  setTimeout(() => {
    updateButtonStates(carousel);
  }, 300);
}

function renderAllDiscountedGames(data, container) {
  if (!container) return;

  const discountedGames = data.sale || {};

  if (Object.keys(discountedGames).length === 0) {
    container.innerHTML = `<p class="empty-msg">No discounted games found</p>`;
    return;
  }

  for (const store in discountedGames) {
    const storeSection = createCollapsibleSection(`${store.toUpperCase()} Discounts`);
    const gameList = document.createElement("div");
    gameList.className = "game-list";

    discountedGames[store].forEach(game => {
      gameList.appendChild(createGameCard(game, false));
    });

    storeSection.querySelector('.section-content').appendChild(gameList);
    container.appendChild(storeSection);
  }
}

function getCachedData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { timestamp, data } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_DURATION) {
    return data;
  }
  return null;
}

function cacheData(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    timestamp: Date.now(),
    data: data
  }));
}


function renderStoreGames(sectionElement, storeGames, platform, sectionType) {
  const content = sectionElement?.querySelector('.section-content');
  if (!content) return;
  
  if (Object.keys(storeGames).length === 0) {
    content.innerHTML = `<p class="empty-msg">No ${sectionType} ${platform} games available</p>`;
    return;
  }
  
  for (const store in storeGames) {
    if (storeGames[store].length === 0) continue;
    
    const storeHeader = document.createElement("h4");
    storeHeader.textContent = store.toUpperCase();
    content.appendChild(storeHeader);
    
    const gameList = document.createElement("div");
    gameList.className = "game-list";
    
    storeGames[store].forEach(game => {
      // Ensure store tag is set properly
      const gameWithStore = {
        ...game,
        store: game.store || store // Use game.store if exists, otherwise use the store key
      };
      gameList.appendChild(createGameCard(gameWithStore, sectionType === 'temporary'));
    });
    
    content.appendChild(gameList);
  }
}

function createCollapsibleSection(title) {
  const section = document.createElement("div");
  section.className = "collapsible-section";
  
  const header = document.createElement("button");
  header.className = "section-header";
  header.innerHTML = `${title} <span class="arrow">▼</span>`;
  
  const content = document.createElement("div");
  content.className = "section-content";
  
  header.onclick = () => {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
    header.querySelector('.arrow').textContent = 
      content.style.display === 'none' ? '►' : '▼';
  };
  
  section.appendChild(header);
  section.appendChild(content);
  content.style.display = 'block';
  
  return section;
}

function createGameCard(game, showEndDate = false) {
  const item = document.createElement("div");
  item.className = "game-item";
  
  const thumbnailUrl = game.thumbnail?.replace('http://', 'https://') || 
    'https://via.placeholder.com/300x200?text=No+Image';
  
  let priceInfo = '';
  if (game.discountPercentage > 0 && game.originalPrice) {
    priceInfo = `
      <div class="price-info">
        <span class="original-price">$${game.originalPrice.toFixed(2)}</span>
        ${game.finalPrice ? `<span class="final-price">$${game.finalPrice.toFixed(2)}</span>` : ''}
        <span class="discount-badge">-${game.discountPercentage}%</span>
      </div>
    `;
  }

  // Add platform/store badge
  const storeBadge = game.store ? `
    <div class="platform-badge ${game.store.toLowerCase()}">
      ${game.store.toUpperCase()}
    </div>
  ` : '';

  item.innerHTML = `
    <div class="game-thumbnail">
      <img src="${thumbnailUrl}" alt="${game.title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
      ${storeBadge}
      ${game.discountPercentage > 0 ? `<span class="discount-badge">-${game.discountPercentage}%</span>` : ''}
    </div>
    <div class="game-info">
      <h3 class="game-title">${game.title}</h3>
      ${priceInfo}
      <a href="${game.link}" target="_blank" class="view-btn">View Deal</a>
      ${showEndDate && game.end_date ? `<div class="end-date">⏳ Until ${formatDate(game.end_date)}</div>` : ''}
    </div>
  `;
  
  return item;
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

document.addEventListener("DOMContentLoaded", fetchGames);