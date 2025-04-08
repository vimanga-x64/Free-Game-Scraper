const API_URL = "https://free-game-scraper.onrender.com/api";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "Loading...";  // Loading state
  try {
    const response = await fetch(`${API_URL}/free-games`);
    const data = await response.json();  // Get data from backend
    container.innerHTML = "";  // Clear the loading message

    // Iterate through platforms (pc and console)
    ["pc", "console"].forEach(platform => {
      const section = document.createElement("div");
      section.innerHTML = `<h2>${platform.toUpperCase()}</h2>`;  // Display PC or Console as title
      
      // Loop through stores for each platform (Epic Games, Steam for PC; PlayStation, Xbox for Console)
      for (const [store, games] of Object.entries(data[platform])) {
        const storeBlock = document.createElement("div");
        
        // Use a nicer display name for the stores
        const displayName = store.replace("_", " ").toUpperCase();
        storeBlock.innerHTML = `<h3>${displayName}</h3>`;
        
        const list = document.createElement("ul");
        
        // Add each game to the list
        games.forEach(game => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${game.link}" target="_blank">${game.title}</a>`;  // Game title with link
          list.appendChild(li);
        });
        
        storeBlock.appendChild(list);
        section.appendChild(storeBlock);
      }
      
      // Append the section (PC/Console) to the container
      container.appendChild(section);
    });
  } catch (err) {
    container.innerHTML = "Failed to load games.";  // If an error occurs
  }
}
