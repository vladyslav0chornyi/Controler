import http.server
import socketserver
import json
import os
from urllib.parse import urlparse
from datetime import datetime
import subprocess
import requests  # Потрібно встановити через pip, якщо ще не встановлено

PORT = 8080
CONFIG_FILE = "config.json"
LOG_FILE = "logs.json"
OPENWEATHER_API_KEY = "af2767b5f752139f4282b9626e76008e"  # Вставте ваш API ключ тут

# Ініціалізація конфігурації
default_config = {"param1": 0.0, "param2": 0.0, "param3": 0.0}
if not os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(default_config, f)

if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, 'w') as f:
        json.dump({"logs": []}, f)


def log_change(change_message):
    with open(LOG_FILE, 'r+') as f:
        logs = json.load(f)
        logs["logs"].append(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {change_message}")
        f.seek(0)
        json.dump(logs, f)


def log_detailed_change(old_config, new_config):
    changes = []
    for key in new_config:
        old_value = old_config.get(key, "N/A")
        new_value = new_config[key]
        if old_value != new_value:
            changes.append(f"{key}: {old_value} -> {new_value}")

    if changes:
        log_change("Конфігурація змінена: " + "; ".join(changes))


def get_current_config():
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def save_new_config(new_config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(new_config, f)


def get_cpu_usage():
    command = "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage }'"
    try:
        result = os.popen(command).read().strip()
        return round(float(result.replace(",", ".")), 2)
    except Exception as e:
        print(f"Error occurred while getting CPU usage: {e}")
        return 0.0


def get_ram_usage():
    try:
        ram_output = os.popen('free -t').readlines()[1].strip()  # Беремо другий рядок (рядок із Mem:)
        ram_values = ram_output.split()

        ram_info = {
            "total": int(ram_values[1]),  # Загальна пам'ять
            "used": int(ram_values[2]),  # Використана пам'ять
            "free": int(ram_values[6])  # Вільна пам'ять
        }
        return ram_info
    except Exception as e:
        print(f"Помилка при отриманні даних RAM: {e}")
        return {"total": 0, "used": 0, "free": 0}


def get_ip_address():
    try:
        ip_addresses = os.popen('hostname -I').read().strip().split()
        ip_dict = {
            "Eth1": ip_addresses[0] if len(ip_addresses) > 0 else "N/A",
            "Eth2": ip_addresses[1] if len(ip_addresses) > 1 else "N/A"
        }
        return ip_dict
    except Exception as e:
        print(f"Error occurred while getting IP addresses: {e}")
        return {"Eth1": "N/A", "Eth2": "N/A"}


def get_temperature():
    try:
        temp = os.popen('sensors | grep "Core 0"').read().strip()
        temp = temp.split()[2]  # Припускаємо, що температура на 0-му ядрі
        return temp
    except Exception as e:
        print(f"Error occurred while getting temperature: {e}")
        return "Temperature not available"


def get_kyiv_temperature():
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q=Kyiv&units=metric&appid={OPENWEATHER_API_KEY}"
        response = requests.get(url)
        data = response.json()
        if response.status_code == 200:
            return f"{data['main']['temp']}°C"
        else:
            print(f"Error from OpenWeatherMap API: {data}")
            return "Помилка отримання даних"
    except Exception as e:
        print(f"Error occurred while getting Kyiv temperature: {e}")
        return "Помилка"


def play_sound():
    try:
        subprocess.run(['aplay', '/usr/share/sounds/alsa/Front_Center.wav'], check=True)
        print("Звук успішно відтворено.")
    except subprocess.CalledProcessError as e:
        print(f"Помилка виконання команди: {e}")


class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/api/device':
            cpu_usage = get_cpu_usage()
            ram_usage = get_ram_usage()
            ip_address = get_ip_address()
            temperature = get_temperature()
            kyiv_temperature = get_kyiv_temperature()

            response = {
                "version": "1.0.0",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "time": datetime.now().strftime("%H:%M:%S"),
                "IP": ip_address,
                "CPU": cpu_usage,
                "RAM": ram_usage,
                "Temperature": temperature,
                "KyivTemperature": kyiv_temperature
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        elif path == '/api/config':
            current_config = get_current_config()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(current_config).encode())

        elif path == '/api/logs':
            with open(LOG_FILE, 'r') as f:
                logs = json.load(f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(logs).encode())

        else:
            if path == '/':
                path = '/index.html'
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            new_config = json.loads(post_data.decode())

            old_config = get_current_config()
            save_new_config(new_config)
            log_detailed_change(old_config, new_config)

            response = {"message": "Конфігурацію збережено"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/apply':
            play_sound()
            log_change("Конфігурація застосована")

            response = {"message": "Застосовано конфігурацію"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        else:
            self.send_response(404)
            self.end_headers()


with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Сервер запущено на порту {PORT}")
    httpd.serve_forever()