const API_URL = "https://free-game-scraper.onrender.com/api";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "Loading...";

  try {
    const response = await fetch(`${API_URL}/free-games`);
    const data = await response.json();
    container.innerHTML = "";

    const sections = [
      { key: "permanent", label: "🟢 Permanently Free Games" },
      { key: "temporary", label: "🟡 Limited-Time Free Games" }
    ];

    sections.forEach(section => {
      const title = document.createElement("h2");
      title.textContent = section.label;
      container.appendChild(title);

      const list = document.createElement("div");
      list.className = "game-list";

      data[section.key].forEach(game => {
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
  } catch (err) {
    container.innerHTML = "Failed to load games.";
  }
}

document.addEventListener("DOMContentLoaded", fetchGames);
