const API_URL = "https://your-render-url.onrender.com/api";

async function fetchGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "Loading...";
  try {
    const response = await fetch(`${API_URL}/free-games`);
    const data = await response.json();
    container.innerHTML = "";

    ["pc", "console"].forEach(platform => {
      const section = document.createElement("div");
      section.innerHTML = `<h2>${platform.toUpperCase()}</h2>`;
      for (const [store, games] of Object.entries(data[platform])) {
        const storeBlock = document.createElement("div");
        storeBlock.innerHTML = `<h3>${store.replace("_", " ")}</h3>`;
        const list = document.createElement("ul");
        games.forEach(game => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${game.link}" target="_blank">${game.title}</a>`;
          list.appendChild(li);
        });
        storeBlock.appendChild(list);
        section.appendChild(storeBlock);
      }
      container.appendChild(section);
    });
  } catch (err) {
    container.innerHTML = "Failed to load games.";
  }
}
