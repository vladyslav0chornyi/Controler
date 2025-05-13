document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM повністю завантажено");

    // Перемикання вкладок
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    tabLinks.forEach(link => {
        link.addEventListener("click", () => {
            const tabId = link.getAttribute("data-tab");

            // Знімаємо активний клас із усіх вкладок
            tabLinks.forEach(link => link.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            // Додаємо активний клас до вибраної вкладки
            link.classList.add("active");
            document.getElementById(tabId).classList.add("active");
        });
    });

    // Завантаження інформації та конфігурації
    fetchDeviceInfo();
    fetchConfig();
    fetchLogs();
    setInterval(fetchDeviceInfo, 1000);

    // Обробка форми
    const configForm = document.getElementById("config-form");
    configForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveConfig();
    });

    // Кнопка "Застосувати"
    const applyButton = document.getElementById("apply-button");
    applyButton.addEventListener("click", applyConfig);
});

function fetchDeviceInfo() {
    console.log('Запит інформації про пристрій...');
    fetch('/api/device')
        .then(response => response.json())
        .then(data => {
            updateElementText('device-version', data.version || "N/A");
            updateElementText('current-date', data.date || "N/A");
            updateElementText('current-time', data.time || "N/A");
            updateElementText('eth1', data.IP?.Eth1 || "N/A");
            updateElementText('eth2', data.IP?.Eth2 || "N/A");
            updateElementText('current-CPU', (data.CPU || 0) + '%');
            updateElementText('current-RAM', data.RAM
                ? `Total: ${(data.RAM.total / 1024).toFixed(2)}MB, Used: ${(data.RAM.used / 1024).toFixed(2)}MB, Free: ${(data.RAM.free / 1024).toFixed(2)}MB`
                : "N/A");
            updateElementText('current-Temperature', data.Temperature || "N/A");
            updateElementText('kyiv-temperature', data.KyivTemperature || "N/A");
        })
        .catch(error => console.error('Помилка при отриманні інформації:', error));
}

function fetchConfig() {
    fetch("/api/config")
        .then(response => response.json())
        .then(data => {
            setInputValue("param1", data.param1 || 0);
            setInputValue("param2", data.param2 || 0);
            setInputValue("param3", data.param3 || 0);
        })
        .catch(error => console.error("Помилка:", error));
}

function saveConfig() {
    const config = {
        param1: parseFloat(document.getElementById("param1").value),
        param2: parseFloat(document.getElementById("param2").value),
        param3: parseFloat(document.getElementById("param3").value)
    };

    fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
    })
        .then(response => response.json())
        .then(data => {
            updateElementText("status", data.message || "Конфігурація збережена");
            fetchLogs(); // Оновлення логів після збереження
        })
        .catch(error => console.error("Помилка:", error));
}

function applyConfig() {
    fetch("/api/apply", { method: "POST" })
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => console.error("Помилка:", error));
}

function fetchLogs() {
    fetch("/api/logs")
        .then(response => response.json())
        .then(data => {
            const logList = document.getElementById("log-list");
            logList.innerHTML = "";
            data.logs.forEach(log => {
                const listItem = document.createElement("li");
                listItem.textContent = log;
                logList.appendChild(listItem);
            });
        })
        .catch(error => console.error("Помилка при отриманні логів:", error));
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value;
}