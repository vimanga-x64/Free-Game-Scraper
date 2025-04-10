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
    { key: "permanent", label: "🟢 Permanently Free Games" },
    { key: "temporary", label: "🟡 Limited-Time Free Games" }
  ];

  sections.forEach(section => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "game-section";
    
    const sectionHeader = document.createElement("h2");
    sectionHeader.textContent = section.label;
    sectionDiv.appendChild(sectionHeader);

    ["pc", "console"].forEach(platform => {
      const platformData = data[section.key][platform];
      
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

      // For temporary games, show by store. For permanent, show by genre
      const groupBy = section.key === "temporary" ? "store" : "genre";
      let hasAnyGames = false;
      
      for (const [groupName, games] of Object.entries(platformData)) {
        // Skip empty groups
        if (!games || games.length === 0) {
          // Only show message for temporary stores
          if (section.key === "temporary") {
            const storeHeader = document.createElement("h4");
            storeHeader.textContent = `${capitalizeFirstLetter(groupName)}`;
            sectionDiv.appendChild(storeHeader);
            
            const emptyStoreMsg = document.createElement("p");
            emptyStoreMsg.className = "empty-store-message";
            emptyStoreMsg.textContent = `No free games available on ${capitalizeFirstLetter(groupName)} at this time.`;
            sectionDiv.appendChild(emptyStoreMsg);
          }
          continue;
        }

        hasAnyGames = true;
        const groupHeader = document.createElement("h4");
        groupHeader.textContent = `${capitalizeFirstLetter(groupName)}`;
        groupHeader.className = "category-header";
        sectionDiv.appendChild(groupHeader);

        const gameList = document.createElement("div");
        gameList.className = "game-list";

        games.forEach(game => {
          const item = document.createElement("div");
          item.className = "game-item";
          
          // Handle thumbnails - use direct URLs for console games if available
          let thumbnailUrl = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
          
          // Special handling for known console games
          if (game.title === "Warframe") {
            thumbnailUrl = "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/TJvzqKJZRaLQ4wDq1WAXJX1w.png";
          } else if (game.title === "War Thunder") {
            thumbnailUrl = "https://warthunder.com/upload/image/!%202022%20NEWS/06.2022/Update%20Drone%20Age/wt_cover_DA_en.jpg";
          }
          
          thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
          
          // Format end date if available
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
          
          // Determine store or genre display
          const infoText = section.key === "temporary" 
            ? `<span class="game-store">${game.store || 'Unknown Store'}</span>`
            : `<span class="game-genre">${game.genre || 'Various'}</span>`;
          
          item.innerHTML = `
            <div class="game-thumbnail-container">
              <img src="${thumbnailUrl}" alt="${game.title}" class="game-thumbnail"
                   onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
              <span class="store-badge ${(game.store || 'unknown').toLowerCase()}">
                ${getStoreIcon(game.store)}
              </span>
            </div>
            <div class="game-info">
              <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
              <div class="game-meta">
                ${infoText}
                ${endDateDisplay ? `<span class="end-date">Free until ${endDateDisplay}</span>` : ''}
              </div>
            </div>
          `;
          gameList.appendChild(item);
        });

        sectionDiv.appendChild(gameList);
      }

      if (!hasAnyGames) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "empty-message";
        emptyMsg.textContent = `No ${section.key} ${platform} games found.`;
        sectionDiv.appendChild(emptyMsg);
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

// Initialize when page loads
document.addEventListener("DOMContentLoaded", fetchGames);