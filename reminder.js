const token = localStorage.getItem("mediguideToken");

if (!token) {
    window.location.href = "login.html";
}

const reminderForm = document.getElementById("reminderForm");
const reminderList = document.getElementById("reminderList");
const message = document.getElementById("message");

const API_URL = "/api/reminders";

let reminders = [];

async function loadReminders() {
    try {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem("mediguideToken");
            localStorage.removeItem("mediguideUser");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load reminders.");
        }

        reminders = await response.json();
        displayReminders();

    } catch (error) {
        reminderList.textContent = error.message;
    }
}

function displayReminders() {
    reminderList.replaceChildren();

    if (reminders.length === 0) {
        reminderList.textContent = "No medicine reminders added yet.";
        return;
    }

    reminders.forEach(reminder => {
        const item = document.createElement("div");
        item.className = "reminder-item";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = reminder.medicineName;

        const dosage = document.createElement("p");
        dosage.textContent = `Dosage: ${reminder.dosage}`;

        const time = document.createElement("p");
        time.textContent = `Time: ${reminder.time}`;

        const notes = document.createElement("p");
        notes.textContent = reminder.notes
            ? `Notes: ${reminder.notes}`
            : "";

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-reminder";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteReminder(reminder.id);
        });

        details.append(name, dosage, time, notes);
        item.append(details, deleteButton);
        reminderList.appendChild(item);
    });
}

// Save a reminder
reminderForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const reminderData = {
        medicineName: document.getElementById("medicineName").value.trim(),
        dosage: document.getElementById("dosage").value.trim(),
        time: document.getElementById("medicineTime").value,
        notes: document.getElementById("medicineNotes").value.trim()
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(reminderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Could not save reminder.");
        }

        message.textContent = result.message;
        message.style.color = "green";

        reminderForm.reset();
        await loadReminders();

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});

// Delete a reminder
async function deleteReminder(id) {
    if (!confirm("Do you want to delete this reminder?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Could not delete reminder.");
        }

        await loadReminders();

    } catch (error) {
        alert(error.message);
    }
}

// Enable browser notifications
document.getElementById("notificationButton")
    .addEventListener("click", async function() {

        if (!("Notification" in window)) {
            document.getElementById("notificationStatus").textContent =
                "This browser does not support notifications.";
            return;
        }

        const permission = await Notification.requestPermission();

        document.getElementById("notificationStatus").textContent =
            permission === "granted"
                ? "Notifications enabled!"
                : "Notification permission was not granted.";
    });

// Check reminder times
function checkReminderTimes() {
    if (!("Notification" in window) ||
        Notification.permission !== "granted") {
        return;
    }

    const now = new Date();

    const currentTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    reminders.forEach(reminder => {
        const notificationKey =
            `mediguideReminder_${reminder.id}_${today}`;

        if (
            reminder.time === currentTime &&
            localStorage.getItem(notificationKey) !== "shown"
        ) {
            new Notification("MediGuide AI - Medicine Reminder", {
                body: `${reminder.medicineName} - ${reminder.dosage}`
            });

            localStorage.setItem(notificationKey, "shown");
        }
    });
}

loadReminders();

// Check every 30 seconds while this page is open
setInterval(checkReminderTimes, 30000);

// Logout
document.getElementById("logoutButton").addEventListener("click", function() {
    localStorage.removeItem("mediguideToken");
    localStorage.removeItem("mediguideUser");
    window.location.href = "login.html";
});