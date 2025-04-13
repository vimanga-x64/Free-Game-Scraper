const API_URL = "https://free-game-scraper.onrender.com/api";

const GAME_TYPES = {
  PC: 'pc',
  CONSOLE: 'console',
  SALE: 'sale'
};

async function fetchGames() {
  const container = document.getElementById("games-container");
  if (!container) return;
  
  container.innerHTML = `<div class="loading">Loading games...</div>`;

  try {
    const response = await fetch(`${API_URL}/free-games`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    displayGames(data);
  } catch (err) {
    console.error("Error:", err);
    container.innerHTML = `<div class="error">Failed to load games. <button onclick="fetchGames()">Retry</button></div>`;
  }
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
  
  // Free-To-Play games
  const permSection = createCollapsibleSection("Free-To-Play Games");
  const permGames = data.permanent || {};
  renderStoreGames(permSection, permGames, platform, 'free-to-play');
  container.appendChild(permSection);
  
  // Limited-Time Free games
  const tempSection = createCollapsibleSection("Limited-Time Free Games");
  const tempGames = data.temporary?.[platform] || {};
  renderStoreGames(tempSection, tempGames, platform, 'temporary');
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
  
  // Only add navigation buttons if content overflows
  const checkOverflow = () => {
    const hasOverflow = carouselContent.scrollWidth > carouselContent.clientWidth;
    carousel.classList.toggle('has-overflow', hasOverflow);
  };
  
  // Check initially and on window resize
  checkOverflow();
  window.addEventListener('resize', checkOverflow);
  
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
  
  return carousel;
}

// Function to handle carousel scrolling
function scrollCarousel(carousel, direction) {
  const content = carousel.querySelector('.carousel-content');
  const scrollAmount = 300; // Adjust this value as needed
  content.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
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
  
  // Price info for discounted games
  let priceInfo = '';
  if (game.discountPercentage) {
    priceInfo = `
      <div class="price-info">
        <span class="original-price">${game.originalPrice || ''}</span>
        <span class="final-price">${game.finalPrice || ''}</span>
        <span class="discount-badge">-${game.discountPercentage}%</span>
      </div>
    `;
  }
  
  // End date for temporary free games
  let endDateInfo = '';
  if (showEndDate && game.end_date) {
    endDateInfo = `<div class="end-date">Free until ${formatDate(game.end_date)}</div>`;
  }
  
  item.innerHTML = `
    <div class="game-thumbnail">
      <img src="${thumbnailUrl}" alt="${game.title}" 
           onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
      ${game.discountPercentage ? '<span class="discount-badge">-' + game.discountPercentage + '%</span>' : ''}
    </div>
    <div class="game-info">
      <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
      ${priceInfo}
      ${endDateInfo}
      <div class="game-meta">
        <span class="game-store ${game.store.toLowerCase()}">${game.store.toUpperCase()}</span>
      </div>
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