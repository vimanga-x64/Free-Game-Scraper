const API_URL = "https://free-game-scraper.onrender.com/api";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "<div class='loading'>Loading games...</div>";

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
        Failed to load games. Please try again later.
        <button onclick="fetchGames()">Retry</button>
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

      // Display by category
      let hasGames = false;
      for (const [category, games] of Object.entries(platformData)) {
        if (games && games.length > 0) {
          hasGames = true;
          const categoryHeader = document.createElement("h4");
          categoryHeader.textContent = `${capitalizeFirstLetter(category)} (${games.length})`;
          sectionDiv.appendChild(categoryHeader);

          const gameList = document.createElement("div");
          gameList.className = "game-list";

          games.forEach(game => {
            const item = document.createElement("div");
            item.className = "game-item";
            
            // Handle missing thumbnails
            const thumbnail = game.thumbnail || "https://via.placeholder.com/300x200?text=No+Image";
            
            item.innerHTML = `
              <div class="game-thumbnail">
                <img src="${thumbnail}" alt="${game.title}" 
                     onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
              </div>
              <div class="game-info">
                <a href="${game.link}" target="_blank" class="game-title">${game.title}</a>
                ${game.genre ? `<span class="game-genre">${capitalizeFirstLetter(game.genre)}</span>` : ''}
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
        emptyMsg.textContent = `No ${section.key} ${platform} games found in any category.`;
        sectionDiv.appendChild(emptyMsg);
      }
    });

    container.appendChild(sectionDiv);
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", fetchGames);