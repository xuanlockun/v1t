// const imageSources = [
//     'img/vit.png',
//     'img/v1t.png',
//     'img/V1t_fin.png'
//   ];

//   const randomIndex = Math.floor(Math.random() * imageSources.length);
//   document.querySelector('img.logo').src = imageSources[randomIndex];
async function fetchGoogleSheetData() {
    const ctfUrl = "https://opensheet.elk.sh/1OJ1gs4Md9wFiaMFOED06MUG1KgxuZkmzzhRvYENMCkQ/CTF_2025";
    const rankUrl = "https://opensheet.elk.sh/1OJ1gs4Md9wFiaMFOED06MUG1KgxuZkmzzhRvYENMCkQ/Rank";

    try {
        const [ctfResponse, rankResponse] = await Promise.all([
            fetch(ctfUrl).then(res => res.json()),
            fetch(rankUrl).then(res => res.json())
        ]);

        updateCTFTable(ctfResponse);

        updateRankInfo(rankResponse);

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Google Sheets:", error);
    }
}

function updateCTFTable(data) {
    const tableBody = document.querySelector("#dataTable tbody");
    tableBody.innerHTML = "";

    let totalRating = 0;
    data.forEach(event => {
        totalRating += parseFloat(event["Rating Points"]);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${event.Place}</td>
            <td class="event"><a href="${event.Link}" target="_blank"><i class="fa-solid fa-flag"></i> ${event.Event}</a></td>
            <td>${parseFloat(event["CTF Points"]).toFixed(4)}</td>
            <td>${parseFloat(event["Rating Points"]).toFixed(3)}</td>
        `;
        tableBody.appendChild(row);
    });

    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
        <td colspan="3" style="font-weight: bold;">Total Rating Points:</td>
        <td style="font-weight: bold;">${totalRating.toFixed(3)}</td>
    `;
    tableBody.appendChild(totalRow);
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
        <img src="img/vn.svg" style="padding-left: 5px;" width="17.6">
    `;
}

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);
