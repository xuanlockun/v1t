// const imageSources = [
//     '/assets/images/vit.png',
//     '/assets/images/v1t.png',
//     '/assets/images/V1t_fin.png'
//   ];

//   const randomIndex = Math.floor(Math.random() * imageSources.length);
//   document.querySelector('img.logo').src = imageSources[randomIndex];
// Hamburger toggle
const hamburger = document.getElementById('hamburger');
const nav = document.querySelector('nav');

hamburger.addEventListener('click', () => {
    nav.classList.toggle('active');
});

document.addEventListener("DOMContentLoaded", () => {
    const toggleLink = document.getElementById("darkModeToggle");
    const body = document.body;

    // Check saved preference
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
        toggleLink.innerHTML = '<i class="fa-solid fa-sun"></i> Light Mode';
    }

    toggleLink.addEventListener("click", (e) => {
        e.preventDefault(); // prevent page reload

        body.classList.toggle("dark-mode");

        if (body.classList.contains("dark-mode")) {
            localStorage.setItem("darkMode", "enabled");
            toggleLink.innerHTML = '<i class="fa-solid fa-sun"></i> Light Mode';
        } else {
            localStorage.setItem("darkMode", "disabled");
            toggleLink.innerHTML = '<i class="fa-solid fa-moon"></i> Dark Mode';
        }
    });
});



async function fetchGoogleSheetData() {
    const rankUrl = "https://opensheet.elk.sh/1OJ1gs4Md9wFiaMFOED06MUG1KgxuZkmzzhRvYENMCkQ/Rank";

    try {
        const rankResponse = await fetch(rankUrl).then(res => res.json());

        updateRankInfo(rankResponse);

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Google Sheets:", error);
    }
}

function updateRankInfo(rankData) {

    const overallRank = rankData[0]["Overall Rating Place"];
    const countryRank = rankData[0]["Country Place"];
    document.querySelector("#world-rank").innerHTML = `
        <i class="fa-solid fa-earth-americas" style="padding-right: 5px;"></i>
        World rank: ${overallRank}
    `;

    document.querySelector("#country-rank").innerHTML = `
        <i class="fa-solid fa-crown" style="padding-right: 5px;"></i>
        Country place: ${countryRank}
        <img src="/assets/images/vn.svg" style="padding-left: 5px;" width="17.6">
    `;
}

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);
