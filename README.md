# GEREPOST-FILEMANAGER (GEREPOST FM) 🚀

[![Socket Badge](https://badge.socket.dev/npm/package/gerepost-filemanager/1.0.5)](https://badge.socket.dev/npm/package/gerepost-filemanager/1.0.5)
[![NPM Downloads](https://img.shields.io/npm/dt/gerepost-filemanager)](https://www.npmjs.com/package/gerepost-filemanager)


Мощный, быстрый и стильный консольный файловый менеджер (TUI) для среды **Termux** на Android и облачных сред разработки (вроде **Replit**).

## ✨ Особенности
* 🖥️ **Красивый консольный интерфейс** с отображением структуры папок и количества объектов.
* 🛠️ **Глобальное меню создания** файлов и папок в реальном времени прямо внутри вашего смартфона.
* ⚡ **Гибкая маршрутизация** между внутренним хранилищем и внешней SD-картой с помощью флагов.
* 🦾 **Полная поддержка Termux & Replit** — пишите код в облаке, управляйте файлами на Android.

---

## 📦 Быстрая установка

Перед установкой убедитесь, что в вашем Termux установлен Node.js:
```bash
pkg install nodejs -y
```

Затем установите пакет глобально через npm:
```bash
npm install -g gerepost-filemanager
```

⚠️ **ВАЖНО ДЛЯ ANDROID:** Чтобы менеджер мог видеть файлы вашего телефона (папки `Download`, `Telegram` и т.д.), обязательно дайте Termux доступ к памяти:
```bash
termux-setup-storage
```

---

## 🚀 Инструкция по запуску (Полноценный синтаксис)

В зависимости от того, какую область памяти вам нужно открыть, используйте следующие команды:

### 1. Открытие стандартной внутренней памяти (`/sdcard`)
```bash
filemanager open
```

### 2. Открытие внешней SD-карты (`/storage`)
```bash
filemanager open --option=android
```

---

## 🛠️ Что делать, если пишет "Command not found"? (Для разработчиков)

Если после глобальной установки Termux или ваша система не видит команду `filemanager`, это связано с особенностями путей (`$PATH`) Android. 

### Решение 1 (Быстрый запуск через npx):
```bash
npx gerepost-filemanager open
```

### Решение 2 (Постоянное исправление через Alias):
Пропишите постоянный псевдоним в конфигурацию вашего терминала, чтобы команда `filemanager` работала всегда и везде:
```bash
echo "alias filemanager='node ~/server.js'" >> ~/.bashrc
source ~/.bashrc
```

---

## ⌨️ Горячие клавиши в интерфейсе
* `Space` — Выбрать объект
* `Ctrl + A` — Открыть глобальное меню создания (Новый файл / Новая папка)
* `Ctrl + E` — Действия с файлами
* `Enter` — Открыть папку / Зайти в директорию
* `Ctrl + C` — Выход из файлового менеджера

---

## 👥 Автор
Разработчик: **webqemu** 

