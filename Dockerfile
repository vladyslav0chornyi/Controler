FROM python:3.12-alpine
WORKDIR /webserver
COPY . .
RUN apk add --no-cache gcc musl-dev python3-dev libffi-dev lm-sensors
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8080
CMD ["python", "server.py"]