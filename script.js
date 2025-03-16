async function fetchGoogleSheetData() {
    const url = "https://opensheet.elk.sh/1OJ1gs4Md9wFiaMFOED06MUG1KgxuZkmzzhRvYENMCkQ/CTF_2025";
    try {
        const response = await fetch(url);
        const data = await response.json();
        
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

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Google Sheets:", error);
    }
}

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);