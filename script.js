document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM повністю завантажено");

    // Завантаження початкових параметрів із config.json
    fetchConfigFromFile();

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

            // Спеціальна обробка для вкладок "Конфігурація" та "Логи"
            if (tabId === "config-tab") {
                fetchConfigWithAjax();
            } else if (tabId === "logs-tab") {
                fetchLogsWithAjax();
                fetchConfigFromFile(); // Завантажуємо параметри з файлу при переході на вкладку "Логи"
            }
        });
    });

    // Перевірка, чи вкладка "Логи" активна при завантаженні сторінки
    const activeTab = document.querySelector(".tab-link.active");
    if (activeTab && activeTab.getAttribute("data-tab") === "logs-tab") {
        fetchLogsWithAjax(); // Завантажуємо логи, якщо вкладка "Логи" активна
    }

    // Обробка першої вкладки
    fetchDeviceInfo();
    setInterval(fetchDeviceInfo, 1000);

    // Обробка форми конфігурації
    const configForm = document.getElementById("config-form");
    configForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveConfigWithAjax();
    });

    // Кнопка "Застосувати"
    const applyButton = document.getElementById("apply-button");
    applyButton.addEventListener("click", () => {
        fetch("/api/apply", { method: "POST" })
            .then(response => response.json())
            .then(data => {
                alert(data.message); // Відображаємо повідомлення користувачу
                fetchLogsWithAjax(); // Оновлюємо список логів
            })
            .catch(error => console.error("Помилка при застосуванні конфігурації:", error));
    });
});

// Функції для першої вкладки
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

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

// Завантаження конфігурації з файлу config.json
function fetchConfigFromFile() {
    fetch('/config.json')
        .then(response => response.json())
        .then(data => {
            setInputValue("param1", data.param1 || 0);
            setInputValue("param2", data.param2 || 0);
            setInputValue("param3", data.param3 || 0);
        })
        .catch(error => console.error("Помилка завантаження параметрів з файлу:", error));
}

// AJAX: Завантаження конфігурації
function fetchConfigWithAjax() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/config", true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setInputValue("param1", data.param1 || 0);
            setInputValue("param2", data.param2 || 0);
            setInputValue("param3", data.param3 || 0);
        } else {
            console.error("Помилка завантаження конфігурації:", xhr.statusText);
            showNotification("Помилка завантаження конфігурації", "error");
        }
    };
    xhr.onerror = function () {
        console.error("Помилка мережі під час завантаження конфігурації");
        showNotification("Помилка мережі", "error");
    };
    xhr.send();
}

// AJAX: Збереження конфігурації
function saveConfigWithAjax() {
    const config = {
        param1: parseFloat(document.getElementById("param1").value),
        param2: parseFloat(document.getElementById("param2").value),
        param3: parseFloat(document.getElementById("param3").value)
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/config", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            showNotification(data.message || "Конфігурація збережена", "success");
            fetchConfigWithAjax(); // Оновлюємо конфігурацію після збереження
            fetchLogsWithAjax();   // Оновлюємо логи після збереження
        } else {
            console.error("Помилка збереження конфігурації:", xhr.statusText);
            showNotification("Помилка збереження конфігурації", "error");
        }
    };
    xhr.onerror = function () {
        console.error("Помилка мережі під час збереження конфігурації");
        showNotification("Помилка мережі", "error");
    };
    xhr.send(JSON.stringify(config));
}

// AJAX: Завантаження логів
function fetchLogsWithAjax() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/logs", true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            const logList = document.getElementById("log-list");
            logList.innerHTML = ""; // Очищаємо список
            data.logs.forEach(log => {
                const listItem = document.createElement("li");
                listItem.textContent = log;
                logList.appendChild(listItem);
            });
        } else {
            console.error("Помилка завантаження логів:", xhr.statusText);
            showNotification("Помилка завантаження логів", "error");
        }
    };
    xhr.onerror = function () {
        console.error("Помилка мережі під час завантаження логів");
        showNotification("Помилка мережі", "error");
    };
    xhr.send();
}

// Функція для оновлення значення input
function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value;
}

// Функція для відображення сповіщень
function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000); // Відображення сповіщення протягом 3 секунд
}