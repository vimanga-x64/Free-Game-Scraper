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
      
      // Skip if no data or empty object
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

      // Display by store (for temporary games) or genre (for permanent)
      let hasGames = false;
      for (const [category, games] of Object.entries(platformData)) {
        if (games && games.length > 0) {
          hasGames = true;
          const categoryHeader = document.createElement("h4");
          categoryHeader.textContent = `${capitalizeFirstLetter(category)}`;
          sectionDiv.appendChild(categoryHeader);

          const gameList = document.createElement("div");
          gameList.className = "game-list";

          games.forEach(game => {
            const item = document.createElement("div");
            item.className = "game-item";
            
            // Handle missing thumbnails and force HTTPS
            let thumbnailUrl = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
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
            
            item.innerHTML = `
              <div class="game-thumbnail">
                <img src="${thumbnailUrl}" alt="${game.title}" 
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
                <span class="store-badge ${game.store?.toLowerCase() || 'unknown'}">
                  ${getStoreIcon(game.store)}
                </span>
              </div>
              <div class="game-info">
                <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
                ${endDateDisplay ? `<div class="end-date">Free until ${endDateDisplay}</div>` : ''}
              </div>
            `;
            gameList.appendChild(item);
          });

          sectionDiv.appendChild(gameList);
        }
      }

      if (!hasGames) {
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
    'epic': '🎮',
    'steam': '♨️',
    'gog': '🛒',
    'playstation': '🎮',
    'xbox': '🎮',
    'nintendo': '🎮'
  };
  return icons[store?.toLowerCase()] || '🛍️';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", fetchGames);