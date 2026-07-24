FROM node:20-alpine

# Установка системных зависимостей для сборки C++ биндингов better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копирование спецификаций пакетов
COPY package*.json ./

# Установка только продакшн зависимостей
RUN npm ci --only=production

# Копирование исходников проекта
COPY . .

# Создание директорий для томов данных
RUN mkdir -p db backups logs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
