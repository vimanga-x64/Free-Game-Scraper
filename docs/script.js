const API_URL = "https://free-game-scraper.onrender.com/api";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Loading games from all stores...
    </div>
  `;

  try {
    const response = await fetch(`${API_URL}/free-games`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Fetched Data:", data);
    
    displayGames(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    container.innerHTML = `
      <div class="error">
        <div class="error-icon">⚠️</div>
        <div>
          <p>Failed to load games. This might be due to:</p>
          <ul>
            <li>Stores temporarily unavailable</li>
            <li>Network issues</li>
            <li>API rate limits</li>
          </ul>
          <button onclick="fetchGames()">Retry Loading</button>
        </div>
      </div>
    `;
  }
}

function displayGames(data) {
  const container = document.getElementById("games-container");
  container.innerHTML = "";

  const sections = [
    { 
      key: "permanent", 
      label: "🟢 Permanently Free Games",
      fallback: null
    },
    { 
      key: "temporary", 
      label: "🟡 Limited-Time Free Games",
      fallback: {
        label: "🟣 Heavy Discounts (80%+ Off)",
        minDiscount: 80
      }
    }
  ];

  sections.forEach(section => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "game-section";
    
    const sectionHeader = document.createElement("h2");
    sectionHeader.textContent = section.label;
    sectionDiv.appendChild(sectionHeader);

    ["pc", "console"].forEach(platform => {
      const platformData = data[section.key][platform];
      
      // Check if we should show fallback discounted games
      if ((!platformData || Object.keys(platformData).length === 0) && section.fallback) {
        const discountedGames = getDiscountedGames(data, platform, section.fallback.minDiscount);
        if (discountedGames.length > 0) {
          displayDiscountedGames(sectionDiv, platform, discountedGames, section.fallback.label);
          return;
        }
      }

      if (!platformData || Object.keys(platformData).length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "empty-message";
        emptyMsg.textContent = `No ${section.key} ${platform} games available currently.`;
        sectionDiv.appendChild(emptyMsg);
        return;
      }

      const platformHeader = document.createElement("h3");
      platformHeader.textContent = `${platform.toUpperCase()} Games`;
      sectionDiv.appendChild(platformHeader);

      const groupBy = section.key === "temporary" ? "store" : "genre";
      let hasAnyGames = false;
      
      for (const [groupName, games] of Object.entries(platformData)) {
        const validGames = games.filter(game => game && game.title);
        
        if (validGames.length === 0) {
          // For temporary section, check for discounted games as fallback
          if (section.key === "temporary" && section.fallback) {
            const discountedGames = getDiscountedGamesByStore(data, platform, groupName, section.fallback.minDiscount);
            if (discountedGames.length > 0) {
              displayStoreDiscountedGames(sectionDiv, groupName, discountedGames);
              hasAnyGames = true;
              continue;
            }
          }
          showNoGamesMessage(sectionDiv, groupName, section.key);
          continue;
        }

        hasAnyGames = true;
        const groupHeader = document.createElement("h4");
        groupHeader.textContent = `${capitalizeFirstLetter(groupName)}`;
        groupHeader.className = "category-header";
        sectionDiv.appendChild(groupHeader);

        const gameList = document.createElement("div");
        gameList.className = "game-list";

        validGames.forEach(game => {
          const isDiscounted = game.discountPercentage >= (section.fallback?.minDiscount || 0);
          const item = document.createElement("div");
          item.className = `game-item ${isDiscounted ? 'discounted' : ''}`;
          
          // Handle thumbnails
          let thumbnailUrl = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
          if (game.title === "Warframe") {
            thumbnailUrl = "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/TJvzqKJZRaLQ4wDq1WAXJX1w.png";
          } else if (game.title === "War Thunder") {
            thumbnailUrl = "https://warthunder.com/upload/image/!%202022%20NEWS/06.2022/Update%20Drone%20Age/wt_cover_DA_en.jpg";
          }
          thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
          
          // Format pricing information
          let priceDisplay = '';
          if (isDiscounted && game.originalPrice && game.discountPrice) {
            priceDisplay = `
              <div class="price-info">
                <span class="original-price">$${game.originalPrice.toFixed(2)}</span>
                <span class="discount-price">$${game.discountPrice.toFixed(2)}</span>
                <span class="discount-percent">-${Math.round(game.discountPercentage)}%</span>
              </div>
            `;
          }
          
          // Format end date
          let endDateDisplay = "";
          if (game.end_date) {
            try {
              const endDate = new Date(game.end_date);
              endDateDisplay = endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
            } catch (e) {
              console.error("Error formatting date:", e);
            }
          }
          
          item.innerHTML = `
            <div class="game-thumbnail-container">
              <img src="${thumbnailUrl}" alt="${game.title}" class="game-thumbnail"
                   onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
              <span class="store-badge ${(game.store || 'unknown').toLowerCase()}">
                ${getStoreIcon(game.store)}
              </span>
              ${isDiscounted ? `<span class="discount-ribbon">-${Math.round(game.discountPercentage)}%</span>` : ''}
            </div>
            <div class="game-info">
              <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
              ${priceDisplay}
              <div class="game-meta">
                ${section.key === "temporary" ? 
                  `<span class="game-store">${game.store || 'Unknown Store'}</span>` : 
                  `<span class="game-genre">${game.genre || 'Various'}</span>`}
                ${endDateDisplay ? `<span class="end-date">Until ${endDateDisplay}</span>` : ''}
              </div>
            </div>
          `;
          gameList.appendChild(item);
        });

        sectionDiv.appendChild(gameList);
      }

      if (!hasAnyGames && section.fallback) {
        const discountedGames = getDiscountedGames(data, platform, section.fallback.minDiscount);
        if (discountedGames.length > 0) {
          displayDiscountedGames(sectionDiv, platform, discountedGames, section.fallback.label);
        } else {
          const emptyMsg = document.createElement("p");
          emptyMsg.className = "empty-message";
          emptyMsg.textContent = `No ${section.key} ${platform} games found.`;
          sectionDiv.appendChild(emptyMsg);
        }
      }
    });

    container.appendChild(sectionDiv);
  });
}

// Helper functions
function capitalizeFirstLetter(string) {
  return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
}

function getStoreIcon(store) {
  const icons = {
    'epic': 'EPIC',
    'steam': 'STEAM',
    'gog': 'GOG',
    'playstation': 'PS',
    'xbox': 'XBOX',
    'nintendo': 'SWITCH',
    'freetogame': 'FREE',
    'unknown': 'STORE'
  };
  return icons[(store || '').toLowerCase()] || store?.toUpperCase() || 'STORE';
}

function getDiscountedGames(data, platform, minDiscount) {
  const discountedGames = [];
  
  // Check both permanent and temporary sections
  ['permanent', 'temporary'].forEach(sectionKey => {
    const platformData = data[sectionKey]?.[platform];
    if (!platformData) return;
    
    for (const [store, games] of Object.entries(platformData)) {
      if (!games) continue;
      
      games.forEach(game => {
        if (game && game.discountPercentage >= minDiscount) {
          discountedGames.push({
            ...game,
            sourceStore: store
          });
        }
      });
    }
  });
  
  return discountedGames;
}

function getDiscountedGamesByStore(data, platform, store, minDiscount) {
  const discountedGames = [];
  
  ['permanent', 'temporary'].forEach(sectionKey => {
    const storeGames = data[sectionKey]?.[platform]?.[store];
    if (!storeGames) return;
    
    storeGames.forEach(game => {
      if (game && game.discountPercentage >= minDiscount) {
        discountedGames.push(game);
      }
    });
  });
  
  return discountedGames;
}

function displayDiscountedGames(container, platform, games, label) {
  const platformHeader = document.createElement("h3");
  platformHeader.textContent = `${platform.toUpperCase()} Games`;
  container.appendChild(platformHeader);
  
  const fallbackHeader = document.createElement("h4");
  fallbackHeader.textContent = label;
  fallbackHeader.className = "fallback-header";
  container.appendChild(fallbackHeader);
  
  const gameList = document.createElement("div");
  gameList.className = "game-list";
  
  games.forEach(game => {
    const item = document.createElement("div");
    item.className = "game-item discounted";
    
    let thumbnailUrl = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
    thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
    
    const priceDisplay = game.originalPrice && game.discountPrice ? `
      <div class="price-info">
        <span class="original-price">$${game.originalPrice.toFixed(2)}</span>
        <span class="discount-price">$${game.discountPrice.toFixed(2)}</span>
        <span class="discount-percent">-${Math.round(game.discountPercentage)}%</span>
      </div>
    ` : '';
    
    item.innerHTML = `
      <div class="game-thumbnail-container">
        <img src="${thumbnailUrl}" alt="${game.title}" class="game-thumbnail"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
        <span class="store-badge ${(game.store || game.sourceStore || 'unknown').toLowerCase()}">
          ${getStoreIcon(game.store || game.sourceStore)}
        </span>
        <span class="discount-ribbon">-${Math.round(game.discountPercentage)}%</span>
      </div>
      <div class="game-info">
        <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
        ${priceDisplay}
        <div class="game-meta">
          <span class="game-store">${game.store || game.sourceStore || 'Unknown Store'}</span>
          ${game.end_date ? `
            <span class="end-date">
              Until ${new Date(game.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ` : ''}
        </div>
      </div>
    `;
    gameList.appendChild(item);
  });
  
  container.appendChild(gameList);
}

function displayStoreDiscountedGames(container, storeName, games) {
  const storeHeader = document.createElement("h4");
  storeHeader.textContent = `${capitalizeFirstLetter(storeName)} (Discounted)`;
  storeHeader.className = "category-header discounted-header";
  container.appendChild(storeHeader);
  
  const gameList = document.createElement("div");
  gameList.className = "game-list";
  
  games.forEach(game => {
    const item = document.createElement("div");
    item.className = "game-item discounted";
    
    let thumbnailUrl = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
    thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
    
    const priceDisplay = game.originalPrice && game.discountPrice ? `
      <div class="price-info">
        <span class="original-price">$${game.originalPrice.toFixed(2)}</span>
        <span class="discount-price">$${game.discountPrice.toFixed(2)}</span>
      </div>
    ` : '';
    
    item.innerHTML = `
      <div class="game-thumbnail-container">
        <img src="${thumbnailUrl}" alt="${game.title}" class="game-thumbnail"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
        <span class="store-badge ${(game.store || 'unknown').toLowerCase()}">
          ${getStoreIcon(game.store)}
        </span>
        <span class="discount-ribbon">-${Math.round(game.discountPercentage)}%</span>
      </div>
      <div class="game-info">
        <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
        ${priceDisplay}
        <div class="game-meta">
          <span class="discount-percent">-${Math.round(game.discountPercentage)}%</span>
          ${game.end_date ? `
            <span class="end-date">
              Until ${new Date(game.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ` : ''}
        </div>
      </div>
    `;
    gameList.appendChild(item);
  });
  
  container.appendChild(gameList);
}

function showNoGamesMessage(container, groupName, sectionKey) {
  if (sectionKey === "temporary") {
    const storeHeader = document.createElement("h4");
    storeHeader.textContent = `${capitalizeFirstLetter(groupName)}`;
    storeHeader.className = "category-header";
    container.appendChild(storeHeader);
    
    const emptyStoreMsg = document.createElement("p");
    emptyStoreMsg.className = "empty-store-message";
    emptyStoreMsg.textContent = `No free games available on ${capitalizeFirstLetter(groupName)} at this time.`;
    container.appendChild(emptyStoreMsg);
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", fetchGames);