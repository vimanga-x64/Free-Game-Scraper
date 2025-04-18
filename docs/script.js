const API_URL = "https://free-game-scraper.onrender.com/api";
const CACHE_KEY = 'freeGamesCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const SEARCH_DEBOUNCE_TIME = 300;
const IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4=';

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
  origin: '🟠',
  epic_games: '🎮', 
  humblebundle: '🙏'
};

function showTab(tabType) {
  const data = JSON.parse(localStorage.getItem(CACHE_KEY))?.data;
  if (!data) {
    fetchGames();
    return;
  }
  showGameType(tabType, data);
}

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
    if (typeof lazysizes !== 'undefined') {
      lazysizes.init();
    }
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
  
  // Create all tabs
  [GAME_TYPES.PC, GAME_TYPES.TEMP, GAME_TYPES.SALE].forEach(type => {
    const tab = document.createElement("button");
    let tabName = '';
    switch(type) {
      case GAME_TYPES.PC: tabName = 'PC Games'; break;
      case GAME_TYPES.TEMP: tabName = 'Free for a Limited Time'; break;
      case GAME_TYPES.SALE: tabName = 'Discounts'; break;
    }
    tab.textContent = tabName;
    tab.className = "tab-btn";
    tab.onclick = () => showGameType(type, data);
    tabsDiv.appendChild(tab);
  });
  
  // Add elements to DOM in correct order
  container.appendChild(tabsDiv);
  container.appendChild(contentDiv);
  
  // Show default tab
  showGameType(GAME_TYPES.PC, data);
}

function showGameType(type, data) {
  const contentDiv = document.getElementById("games-content");
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', 
      (btn.textContent === 'PC GAMES' && type === GAME_TYPES.PC) ||
      (btn.textContent === 'FREE FOR A LIMITED TIME' && type === GAME_TYPES.TEMP) ||
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
  
  // Combine all temporary games from all stores and platforms
  const tempGames = [];

  console.log("Temporary games data:", data.temporary);
  
  // Add PC games
  if (data.temporary?.pc) {
    for (const store in data.temporary.pc) {
      const storeGames = data.temporary.pc[store];
      if (Array.isArray(storeGames)) {
        console.log(`Processing ${store} with ${storeGames.length} games`);
        tempGames.push(...storeGames.map(game => {
          // Normalize store names
          const normalizedStore = normalizeStoreName(store);
          return {
            ...game,
            store: game.store || normalizedStore
          };
        }));
      }
    }
  }


  console.log("Combined temporary games:", tempGames);
  
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
    const store = game.store?.toLowerCase() || 'other';
    if (!acc[store]) acc[store] = [];
    acc[store].push(game);
    return acc;
  }, {});
  
  // Render each store's games
  for (const store in byStore) {
    const storeName = store.charAt(0).toUpperCase() + store.slice(1);
    const storeSection = createCollapsibleSection(`${storeName} Free Games`);
    const carousel = createCarousel(byStore[store], store, true);
    storeSection.querySelector('.section-content').appendChild(carousel);
    container.appendChild(storeSection);
  }

  // Update countdowns every minute
  updateCountdowns();
  setInterval(updateCountdowns, 60000);
}

function normalizeStoreName(store) {
  const storeMap = {
    'epic': 'Epic',
    'epic_games': 'Epic',
    'steam': 'Steam',
    'gog': 'GOG',
    'humble': 'Humble',
    'humblebundle': 'Humble',
    'itchio': 'Itch.io',
    'origin': 'Origin'
  };
  return storeMap[store.toLowerCase()] || store;
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
  
  // Add navigation buttons
  const prevBtn = document.createElement("button");
  prevBtn.className = "carousel-btn prev";
  prevBtn.innerHTML = "&lt;";
  prevBtn.onclick = () => scrollCarousel(carousel, -1);
  
  const nextBtn = document.createElement("button");
  nextBtn.className = "carousel-btn next";
  nextBtn.innerHTML = "&gt;";
  nextBtn.onclick = () => scrollCarousel(carousel, 1);
  
  carousel.appendChild(prevBtn);
  carousel.appendChild(carouselContent);
  carousel.appendChild(nextBtn);
  
  // Initialize button states
  setTimeout(() => {
    checkCarouselOverflow(carousel);
  }, 100);
  
  // Add resize observer
  const resizeObserver = new ResizeObserver(() => {
    checkCarouselOverflow(carousel);
  });
  resizeObserver.observe(carouselContent);
  
  // Add scroll event listener
  carouselContent.addEventListener('scroll', () => {
    updateButtonStates(carousel);
  });
  
  return carousel;
}

function checkCarouselOverflow(carousel) {
  const content = carousel.querySelector('.carousel-content');
  const prevBtn = carousel.querySelector('.prev');
  const nextBtn = carousel.querySelector('.next');
  
  // Check if content overflows
  const hasOverflow = content.scrollWidth > content.clientWidth;
  
  // Always show buttons but disable if no overflow
  prevBtn.style.display = hasOverflow ? 'flex' : 'none';
  nextBtn.style.display = hasOverflow ? 'flex' : 'none';
  
  // Update initial button states
  updateButtonStates(carousel);
}

function updateButtonStates(carousel) {
  const content = carousel.querySelector('.carousel-content');
  const prevBtn = carousel.querySelector('.prev');
  const nextBtn = carousel.querySelector('.next');
  
  // Disable prev button if at start
  prevBtn.classList.toggle('disabled', content.scrollLeft <= 10); // Small buffer
  
  // Disable next button if at end
  nextBtn.classList.toggle('disabled', 
    content.scrollLeft + content.clientWidth >= content.scrollWidth - 10 // Small buffer
  );
}

function scrollCarousel(carousel, direction) {
  const content = carousel.querySelector('.carousel-content');
  const scrollAmount = content.clientWidth * 0.8; // Scroll 80% of visible width
  
  content.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
  
  // Update button states after scroll
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
      gameList.appendChild(createGameCard({
        ...game,
        store: store // Ensure store is set properly
      }, false));
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

function createGameCard(game, isTemporary = false) {
  const item = document.createElement("div");
  item.className = "game-item";
  item.tabIndex = 0;
  item.dataset.platforms = (game.platforms || []).join(',');
  item.dataset.store = game.store || '';
  
  // Add click handler for game details
  item.addEventListener('click', () => showGameDetails(game));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showGameDetails(game);
    }
  });
  
  const storeIcon = STORE_ICONS[game.store?.toLowerCase()] || '🛒';
  const platforms = (game.platforms || []).map(p => `
    <span class="platform-tag">
      ${getPlatformIcon(p)} ${p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  `).join('');
  
  // Only include price info if this is not a discounted game
  const showPriceInfo = !game.discountPercentage && (game.originalPrice || game.finalPrice);
  
  item.innerHTML = `
    <div class="game-thumbnail">
      <img class="lazyload" src="${IMAGE_PLACEHOLDER}" data-src="${game.thumbnail}" 
           alt="${game.title} thumbnail" loading="lazy">
      <div class="game-badges">
        <span class="store-badge ${game.store?.toLowerCase()}">
          ${storeIcon} ${game.store || 'Store'}
        </span>
        ${game.discountPercentage > 0 ? `
          <span class="discount-badge">-${game.discountPercentage}%</span>
        ` : ''}
      </div>
    </div>
    <div class="game-info">
      ${showPriceInfo ? `
        <div class="price-info">
          ${game.originalPrice ? `<span class="original-price">$${game.originalPrice.toFixed(2)}</span>` : ''}
          ${game.finalPrice ? `<span class="final-price">$${game.finalPrice.toFixed(2)}</span>` : ''}
        </div>
      ` : ''}
      <h3 class="game-title">${game.title}</h3>
      ${game.description ? `
        <p class="game-description">${game.description}</p>
      ` : ''}
      <div class="platform-tags">
        ${platforms}
      </div>
      ${game.end_date ? `
        <div class="countdown" data-end-date="${game.end_date}">
          <i class="fas fa-clock me-1" aria-hidden="true"></i> ${formatDate(game.end_date)}
        </div>
      ` : ''}
      <button class="view-btn btn btn-primary w-100">
        Claim Now <i class="fas fa-external-link-alt ms-1" aria-hidden="true"></i>
      </button>
    </div>
  `;
  
  return item;
}

function showGameDetails(game) {
  const modal = new bootstrap.Modal(document.getElementById('gameDetailsModal'));
  const modalTitle = document.getElementById('gameModalTitle');
  const modalBody = document.getElementById('gameModalBody');
  const modalLink = document.getElementById('gameModalLink');
  
  modalTitle.textContent = game.title;
  modalLink.href = game.link;
  
  // Build modal content
  modalBody.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <img src="${game.thumbnail}" alt="${game.title}" class="img-fluid mb-3">
        <div class="d-grid gap-2">
          <a href="${game.link}" class="btn btn-primary" target="_blank">
            Claim on ${game.store || 'Store'}
          </a>
        </div>
      </div>
      <div class="col-md-8">
        ${game.description ? `
          <h4>Description</h4>
          <p>${game.description}</p>
        ` : ''}
        
        <div class="row mt-3">
          <div class="col-6">
            <h5>Details</h5>
            <ul class="list-unstyled">
              ${game.store ? `<li><strong>Store:</strong> ${game.store}</li>` : ''}
              ${game.platforms?.length ? `
                <li><strong>Platforms:</strong> ${game.platforms.join(', ')}</li>
              ` : ''}
              ${game.end_date ? `
                <li><strong>Free until:</strong> ${formatDate(game.end_date)}</li>
              ` : ''}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.show();
}


function getPlatformIcon(platform) {
  const icons = {
    windows: '<i class="fab fa-windows"></i>',
    mac: '<i class="fab fa-apple"></i>',
    linux: '<i class="fab fa-linux"></i>',
    ps: '<i class="fab fa-playstation"></i>',
    xbox: '<i class="fab fa-xbox"></i>'
  };
  return icons[platform.toLowerCase()] || '<i class="fas fa-gamepad"></i>';
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

document.addEventListener("DOMContentLoaded", function() {
  fetchGames();
  initSearch();
  initFilters();
  initFeedback();
  initKeyboardNavigation();
  
  // Refresh data every 30 minutes
  setInterval(fetchGames, 30 * 60 * 1000);
});

// Initialize search functionality
function initSearch() {
  const searchInput = document.getElementById('gameSearch');
  let searchTimeout;
  
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterGames();
    }, SEARCH_DEBOUNCE_TIME);
  });
}

// Initialize filters
function initFilters() {
  document.getElementById('applyFilters').addEventListener('click', filterGames);
}

// Initialize feedback system
function initFeedback() {
  const stars = document.querySelectorAll('.rating-stars i');
  stars.forEach(star => {
    star.addEventListener('click', function() {
      const rating = parseInt(this.dataset.rating);
      document.getElementById('feedbackRating').value = rating;
      
      stars.forEach((s, i) => {
        if (i < rating) {
          s.classList.remove('far');
          s.classList.add('fas');
        } else {
          s.classList.remove('fas');
          s.classList.add('far');
        }
      });
    });
  });
  
  document.getElementById('feedbackForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const rating = document.getElementById('feedbackRating').value;
    const comment = document.getElementById('feedbackComment').value;
    
    // Here you would typically send this to a backend
    console.log('Feedback submitted:', { rating, comment });
    
    // Show thank you message
    alert('Thank you for your feedback!');
    const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
    modal.hide();
  });
}

// Initialize keyboard navigation
function initKeyboardNavigation() {
  document.addEventListener('keydown', function(e) {
    // Skip if inside input/textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    
    // 1-9 shortcuts for games
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const index = parseInt(e.key) - 1;
      const games = document.querySelectorAll('.game-item');
      if (index < games.length) {
        games[index].focus();
        games[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    
    // '/' to focus search
    if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById('gameSearch').focus();
    }
  });
}

// Filter games based on search and filters
function filterGames() {
  const searchTerm = document.getElementById('gameSearch').value.toLowerCase();
  const platformFilter = document.getElementById('platformFilter').value;
  const storeFilter = document.getElementById('storeFilter').value;
  
  const games = document.querySelectorAll('.game-item');
  
  games.forEach(game => {
    const title = game.querySelector('.game-title').textContent.toLowerCase();
    const platforms = game.dataset.platforms || '';
    const store = game.dataset.store || '';
    
    const matchesSearch = title.includes(searchTerm);
    const matchesPlatform = !platformFilter || platforms.includes(platformFilter);
    const matchesStore = !storeFilter || store.toLowerCase().includes(storeFilter);
    
    if (matchesSearch && matchesPlatform && matchesStore) {
      game.style.display = '';
    } else {
      game.style.display = 'none';
    }
  });
}