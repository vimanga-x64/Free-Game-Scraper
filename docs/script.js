const API_URL = "https://free-game-scraper.onrender.com/api";

// Main game types
const GAME_TYPES = {
  PC: 'pc',
  CONSOLE: 'console',
  SALE: 'sale'
};

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = `<div class="loading">Loading games...</div>`;

  try {
    const response = await fetch(`${API_URL}/free-games`);
    const data = await response.json();
    displayGames(data);
  } catch (err) {
    console.error("Error:", err);
    container.innerHTML = `<div class="error">Failed to load games. <button onclick="fetchGames()">Retry</button></div>`;
  }
}

function displayGames(data) {
  const container = document.getElementById("games-container");
  container.innerHTML = '';

  // Create tab buttons
  const tabsDiv = document.createElement("div");
  tabsDiv.className = "tabs";
  
  [GAME_TYPES.PC, GAME_TYPES.CONSOLE, GAME_TYPES.SALE].forEach(type => {
    const tab = document.createElement("button");
    tab.textContent = type.toUpperCase();
    tab.className = "tab-btn";
    tab.onclick = () => showGameType(type, data);
    tabsDiv.appendChild(tab);
  });
  
  container.appendChild(tabsDiv);
  
  // Initial display
  showGameType(GAME_TYPES.PC, data);
}

function showGameType(type, data) {
  const contentDiv = document.getElementById("games-content") || document.createElement("div");
  contentDiv.id = "games-content";
  contentDiv.innerHTML = '';
  
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === type.toUpperCase());
  });

  switch(type) {
    case GAME_TYPES.PC:
      renderPlatformGames(data, 'pc');
      break;
    case GAME_TYPES.CONSOLE:
      renderPlatformGames(data, 'console');
      break;
    case GAME_TYPES.SALE:
      renderDiscountedGames(data);
      break;
  }
}

function renderPlatformGames(data, platform) {
  const contentDiv = document.getElementById("games-content");
  
  // Permanent free games
  const permSection = createCollapsibleSection("Permanently Free Games");
  const permGames = data.permanent?.[platform] || {};
  renderStoreGames(permSection, permGames);
  contentDiv.appendChild(permSection);
  
  // Temporary free games
  const tempSection = createCollapsibleSection("Limited-Time Free Games");
  const tempGames = data.temporary?.[platform] || {};
  renderStoreGames(tempSection, tempGames);
  contentDiv.appendChild(tempSection);
}

function renderDiscountedGames(data) {
  const contentDiv = document.getElementById("games-content");
  const minDiscount = 70; // Minimum discount percentage to show
  
  // Find all discounted games across platforms
  const discountedGames = {};
  
  ['pc', 'console'].forEach(platform => {
    ['permanent', 'temporary'].forEach(section => {
      const platformData = data[section]?.[platform] || {};
      for (const store in platformData) {
        platformData[store].forEach(game => {
          if (game.discountPercentage >= minDiscount && game.discountPercentage < 100) {
            if (!discountedGames[store]) discountedGames[store] = [];
            discountedGames[store].push(game);
          }
        });
      }
    });
  });
  
  if (Object.keys(discountedGames).length === 0) {
    contentDiv.innerHTML = `<p class="empty-msg">No heavily discounted games found (${minDiscount}%+ off)</p>`;
    return;
  }
  
  for (const store in discountedGames) {
    const storeSection = createCollapsibleSection(`${store.toUpperCase()} Discounts`);
    const gameList = document.createElement("div");
    gameList.className = "game-list";
    
    discountedGames[store].forEach(game => {
      gameList.appendChild(createGameCard(game, true));
    });
    
    storeSection.querySelector('.section-content').appendChild(gameList);
    contentDiv.appendChild(storeSection);
  }
}

function renderStoreGames(section, storeGames) {
  const content = section.querySelector('.section-content');
  
  if (Object.keys(storeGames).length === 0) {
    content.innerHTML = `<p class="empty-msg">No games available</p>`;
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
      gameList.appendChild(createGameCard(game));
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
  
  // Start expanded
  content.style.display = 'block';
  
  return section;
}

function createGameCard(game, showDiscount = false) {
  const item = document.createElement("div");
  item.className = "game-item";
  
  const thumbnailUrl = game.thumbnail?.replace('http://', 'https://') || 
    'https://via.placeholder.com/300x200?text=No+Image';
  
  let priceInfo = '';
  if (showDiscount && game.discountPercentage && game.originalPrice) {
    priceInfo = `
      <div class="price-info">
        <span class="original-price">$${game.originalPrice.toFixed(2)}</span>
        <span class="discount-price">-${game.discountPercentage}%</span>
      </div>
    `;
  }
  
  item.innerHTML = `
    <div class="game-thumbnail">
      <img src="${thumbnailUrl}" alt="${game.title}" 
           onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
      ${game.discountPercentage >= 70 ? `<span class="discount-badge">-${game.discountPercentage}%</span>` : ''}
    </div>
    <div class="game-info">
      <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
      ${priceInfo}
      <div class="game-meta">
        <span class="game-store">${game.store || 'Unknown'}</span>
        ${game.end_date ? `<span class="end-date">${formatDate(game.end_date)}</span>` : ''}
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