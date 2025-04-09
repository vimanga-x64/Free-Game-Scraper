const API_URL = "https://free-game-scraper.onrender.com";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "Loading...";

  try {
    const response = await fetch("https://free-game-scraper.onrender.com/api/free-games");
    
    // Check if the response is OK (status 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Fetched Data:", data);

    container.innerHTML = "";

    const sections = [
      { key: "permanent", label: "🟢 Permanently Free Games" },
      { key: "temporary", label: "🟡 Limited-Time Free Games" }
    ];

    sections.forEach(section => {
      const sectionHeader = document.createElement("h2");
      sectionHeader.textContent = section.label;
      container.appendChild(sectionHeader);

      ["pc", "console"].forEach(platform => {
        const platformGames = data[section.key][platform];
        if (!platformGames.length) return;

        const platformHeader = document.createElement("h3");
        platformHeader.textContent = platform.toUpperCase();
        container.appendChild(platformHeader);

        const list = document.createElement("div");
        list.className = "game-list";

        platformGames.forEach(game => {
          const item = document.createElement("div");
          item.className = "game-item";
          item.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="thumbnail">
            <a href="${game.link}" target="_blank">${game.title}</a>
          `;
          list.appendChild(item);
        });

        container.appendChild(list);
      });
    });
  } catch (err) {
    console.error("Full Error:", err);
    console.error("Error Details:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    container.innerHTML = "Failed to load games. Check console for details.";
  }
}

document.addEventListener("DOMContentLoaded", fetchGames);
