
document.addEventListener("DOMContentLoaded", () => {

    // 1. GET HTML ELEMENTS

    const healthForm = document.getElementById("healthForm");
    const recordDate = document.getElementById("recordDate");
    const waterInput = document.getElementById("waterMl");
    const sleepInput = document.getElementById("sleepHours");
    const stepsInput = document.getElementById("steps");
    const weightInput = document.getElementById("weightKg");

    const saveButton = document.getElementById("saveButton");
    const logoutButton = document.getElementById("logoutButton");
    const refreshButton = document.getElementById("refreshButton");

    const username = document.getElementById("username");
    const historyList = document.getElementById("historyList");
    const statusMessage = document.getElementById("statusMessage");

    // 2. CHECK LOGIN

    const token = localStorage.getItem("mediguideToken");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // 3. DISPLAY USERNAME

    try {
        const user = JSON.parse(
            localStorage.getItem("mediguideUser") || "{}"
        );

        username.textContent = user.name || "User";

    } catch (error) {
        username.textContent = "User";
    }

    // 4. SET TODAY'S DATE

    function getToday() {
        const today = new Date();
        const offset = today.getTimezoneOffset();

        return new Date(today.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 10);
    }

    recordDate.value = getToday();

    // 5. LOGOUT

    function logout() {
        localStorage.removeItem("mediguideToken");
        localStorage.removeItem("mediguideUser");

        window.location.href = "login.html";
    }

    logoutButton.addEventListener("click", logout);

    // 6. API REQUEST HELPER

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers
            }
        });

        if (response.status === 401) {
            logout();
            throw new Error("Your login session has expired.");
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Something went wrong."
            );
        }

        return data;
    }

    // 7. SHOW STATUS MESSAGE

    function showStatus(message, type) {

        statusMessage.textContent = message;

        statusMessage.className =
            type === "success"
                ? "status-success"
                : "status-error";
    }

    // 8. DISPLAY SUMMARY

    function updateSummary(records) {

        const latest = records.length > 0
            ? records[0]
            : null;

        if (!latest) {
            document.getElementById("waterSummary").textContent = "--";
            document.getElementById("sleepSummary").textContent = "--";
            document.getElementById("stepsSummary").textContent = "--";
            document.getElementById("weightSummary").textContent = "--";
            return;
        }

        document.getElementById("waterSummary").textContent =
            latest.waterMl !== null ? latest.waterMl + " ml" : "--";

        document.getElementById("sleepSummary").textContent =
            latest.sleepHours !== null ? latest.sleepHours + " hrs" : "--";

        document.getElementById("stepsSummary").textContent =
            latest.steps !== null
                ? Number(latest.steps).toLocaleString("en-IN")
                : "--";

        document.getElementById("weightSummary").textContent =
            latest.weightKg !== null ? latest.weightKg + " kg" : "--";
    }

    // 9. DISPLAY HEALTH HISTORY

    function displayHistory(records) {

        historyList.innerHTML = "";

        if (!records || records.length === 0) {

            historyList.innerHTML =
                '<p class="empty-message">No health records yet. Add your first record above!</p>';

            updateSummary([]);
            return;
        }

        updateSummary(records);

        records.forEach(record => {

            const card = document.createElement("div");
            card.className = "history-card";

            const heading = document.createElement("h3");

            const date = new Date(record.date + "T00:00:00");

            heading.textContent =
                "📅 " + date.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });

            const values = document.createElement("div");
            values.className = "history-values";

            const measurements = [
                ["💧 Water", record.waterMl, "ml"],
                ["😴 Sleep", record.sleepHours, "hours"],
                ["👣 Steps", record.steps, ""],
                ["⚖️ Weight", record.weightKg, "kg"]
            ];

            measurements.forEach(([label, value, unit]) => {

                const paragraph = document.createElement("p");

                const displayedValue =
                    value === null || value === undefined
                        ? "Not recorded"
                        : `${value} ${unit}`.trim();

                paragraph.textContent =
                    `${label}: ${displayedValue}`;

                values.appendChild(paragraph);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "delete-record";
            deleteButton.textContent = "Delete Record";

            deleteButton.addEventListener("click", () => {
                deleteRecord(record.id, deleteButton);
            });

            card.appendChild(heading);
            card.appendChild(values);
            card.appendChild(deleteButton);

            historyList.appendChild(card);

        });
    }

    // 10. LOAD HEALTH HISTORY

    async function loadHealthHistory() {

        historyList.innerHTML =
            '<p class="empty-message">Loading health records...</p>';

        try {

            const data = await apiRequest("/api/health-tracker");

            displayHistory(data.records || []);

        } catch (error) {

            console.error("Health history error:", error);

            historyList.textContent = error.message;

        }
    }

    // 11. SAVE HEALTH RECORD

    healthForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const water = waterInput.value;
        const sleep = sleepInput.value;
        const steps = stepsInput.value;
        const weight = weightInput.value;

        if (
            water === "" &&
            sleep === "" &&
            steps === "" &&
            weight === ""
        ) {
            showStatus(
                "Please enter at least one health measurement.",
                "error"
            );
            return;
        }

        const healthData = {
            date: recordDate.value,
            waterMl: water,
            sleepHours: sleep,
            steps: steps,
            weightKg: weight
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const data = await apiRequest(
                "/api/health-tracker",
                {
                    method: "POST",
                    body: JSON.stringify(healthData)
                }
            );

            showStatus(
                data.message || "Health record saved successfully!",
                "success"
            );

            healthForm.reset();
            recordDate.value = getToday();

            await loadHealthHistory();

        } catch (error) {

            console.error("Save error:", error);

            showStatus(error.message, "error");

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Health Record";

        }
    });

    // 12. DELETE HEALTH RECORD

    async function deleteRecord(id, button) {

        if (!confirm("Are you sure you want to delete this health record?")) {
            return;
        }

        button.disabled = true;
        button.textContent = "Deleting...";

        try {

            const data = await apiRequest(
                `/api/health-tracker/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            showStatus(
                data.message || "Record deleted successfully.",
                "success"
            );

            await loadHealthHistory();

        } catch (error) {

            button.disabled = false;
            button.textContent = "Delete Record";

            showStatus(error.message, "error");

        }
    }

    // 13. REFRESH BUTTON

    refreshButton.addEventListener("click", loadHealthHistory);

    // 14. LOAD RECORDS WHEN PAGE OPENS

    loadHealthHistory();

});
