const API_URL = "https://free-game-scraper.onrender.com/api";
const CACHE_KEY = 'freeGamesCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const GAME_TYPES = {
  PC: 'pc',
  TEMP: 'temp', 
  SALE: 'sale'
};

const STORE_ICONS = {
  epic: '🎮',
  steam: '♨️',
  gog: '🛒',
  humble: '🙏',  
  itchio: '🎨',  
  origin: '🟠'
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
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = await response.json();
    displayGames(data);
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Failed to load games</h3>
        <p>${err.message}</p>
        <button class="retry-btn" onclick="fetchGames()">Try Again</button>
      </div>
    `;
  }

    cacheData(data)
}

function updateCountdowns() {
  document.querySelectorAll('.countdown').forEach(el => {
    const endDate = new Date(el.dataset.endDate);
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
      el.textContent = "Expired!";
      el.closest('.game-item').classList.add('expired');
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 24) {
      el.textContent = `${hours}h ${minutes}m left`;
      el.closest('.game-item').classList.add('ending-soon');
    } else {
      el.textContent = `${Math.floor(hours/24)} days left`;
    }
  });
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

  // Only create PC and SALE tabs
  [GAME_TYPES.PC, GAME_TYPES.TEMP, GAME_TYPES.SALE].forEach(type => {
    const tab = document.createElement("button");
    let tabName = '';
    switch(type) {
      case GAME_TYPES.PC: tabName = 'PC Games'; break;
      case GAME_TYPES.TEMP: tabName = 'Temporary Free'; break;
      case GAME_TYPES.SALE: tabName = 'Discounts'; break;
    }
    tab.textContent = tabName;
  });
  
  container.insertBefore(tabsDiv, contentDiv);
  
  showGameType(GAME_TYPES.PC, data);
}

function showGameType(type, data) {
  const contentDiv = document.getElementById("games-content");
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', 
      (btn.textContent === 'PC GAMES' && type === GAME_TYPES.PC) ||
      (btn.textContent === 'TEMPORARY FREE' && type === GAME_TYPES.TEMP) ||
      (btn.textContent === 'DISCOUNTS' && type === GAME_TYPES.SALE)
    );
  });

  switch(type) {
    case GAME_TYPES.PC:
      renderPermanentPCGames(data, contentDiv);  // Only permanent PC games
      break;
      
    case GAME_TYPES.TEMP:
      renderAllTemporaryGames(data, contentDiv);  // New temporary games tab
      break;
      
    case GAME_TYPES.SALE:
      renderAllDiscountedGames(data, contentDiv); // Existing discounts
      break;
      
    default:
      console.error("Unknown game type:", type);
  }
}

function renderAllTemporaryGames(data, container) {
  if (!container) return;
  
  // Combine all temporary games from different stores
  const tempGames = [
    ...(data.temporary?.pc?.epic_games || []),
    ...(data.temporary?.pc?.steam || []),
    ...(data.temporary?.pc?.gog || [])
  ];
  
  if (tempGames.length === 0) {
    container.innerHTML = `<p class="empty-msg">No temporary free games available</p>`;
    return;
  }
  
  // Sort by end date (soonest expiring first)
  tempGames.sort((a, b) => {
    const dateA = a.end_date ? new Date(a.end_date) : new Date(0);
    const dateB = b.end_date ? new Date(b.end_date) : new Date(0);
    return dateA - dateB;
  });

  const lastChanceGames = tempGames.filter(game => {
    return game.end_date && 
      (new Date(game.end_date) - new Date() < 24 * 60 * 60 * 1000);
  });

  if (lastChanceGames.length > 0) {
    const lastChanceSection = createCollapsibleSection(
      "⏰ LAST CHANCE (Expiring Soon!)",
      'last-chance'
    );
    const carousel = createCarousel(lastChanceGames, 'last-chance', true);
    lastChanceSection.querySelector('.section-content').appendChild(carousel);
    container.prepend(lastChanceSection);
  }

    
  // Group by store
  const byStore = tempGames.reduce((acc, game) => {
    const store = game.store || 'other';
    if (!acc[store]) acc[store] = [];
    acc[store].push(game);
    return acc;
  }, {});
  
  // Render each store's games
  for (const store in byStore) {
    const storeSection = createCollapsibleSection(`${store.toUpperCase()} Free Games`);
    const carousel = createCarousel(byStore[store], store, true);
    storeSection.querySelector('.section-content').appendChild(carousel);
    container.appendChild(storeSection);
  }

  // Update countdowns every minute
  updateCountdowns();
  setInterval(updateCountdowns, 60000);
  
}

function renderPermanentPCGames(data, container) {
  if (!container) return;
  
  const permSection = createCollapsibleSection("Free-To-Play Games");
  const permGames = data.permanent?.pc || {};
  renderGenreCarousels(permSection, permGames, 'pc', 'free-to-play');
  container.appendChild(permSection);
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

function createGameCard(game) {
  const item = document.createElement("div");
  item.className = "game-item";
  
  const storeIcon = STORE_ICONS[game.store?.toLowerCase()] || '🛒';
  const platforms = getPlatformIcons(game.platforms); // New platform icons
  
  item.innerHTML = `
    <div class="game-thumbnail">
      <img src="${game.thumbnail}" alt="${game.title}" loading="lazy">
      <div class="game-badges">
        <span class="store-badge">${storeIcon} ${game.store || 'Store'}</span>
        ${platforms}
        ${game.discountPercentage > 0 ? 
          `<span class="discount-badge">-${game.discountPercentage}%</span>` : ''}
      </div>
    </div>
    <div class="game-info">
      <h3>${game.title}</h3>
      ${game.end_date ? `
        <div class="countdown" data-end-date="${game.end_date}">
          ⏳ ${formatDate(game.end_date)}
        </div>
      ` : ''}
      <a href="${game.link}" target="_blank" class="view-btn">
        Claim Now ${getStoreActionIcon(game.store)}
      </a>
    </div>
  `;
  
  return item;
}

function getPlatformIcons(platforms) {
  if (!platforms) return '';
  const icons = {
    windows: '🪟',
    mac: '🍎',
    linux: '🐧',
    ps: '🎮',
    xbox: '🟩'
  };
  return platforms.map(p => icons[p] || '').join(' ');
}

function getStoreActionIcon(store) {
  const actions = {
    epic: '⬇️',
    steam: '🛒',
    gog: '🎁',
    humble: '🆓',  
    itchio: '🎮',  
    origin: '🟠' 
  };
  return actions[store?.toLowerCase()] || '👉';
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