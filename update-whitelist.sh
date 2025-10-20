#!/bin/bash

# Скрипт для обновления белого списка IP адресов
# Использование: ./update-whitelist.sh [IP1] [IP2] ...

echo "🔄 Updating IP whitelist..."

# Проверяем, есть ли аргументы
if [ $# -eq 0 ]; then
    echo "❌ No IP addresses provided"
    echo "Usage: ./update-whitelist.sh [IP1] [IP2] ..."
    echo "Example: ./update-whitelist.sh 81.19.139.69 46.53.245.23"
    exit 1
fi

# Путь к конфигурационному файлу
CONFIG_FILE="config/whitelist.json"

# Проверяем, существует ли файл
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file $CONFIG_FILE not found"
    exit 1
fi

# Создаем резервную копию
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
echo "📋 Backup created: ${CONFIG_FILE}.backup"

# Добавляем новые IP адреса
for ip in "$@"; do
    echo "➕ Adding IP: $ip"
    
    # Проверяем, что IP уже не добавлен
    if grep -q "\"$ip\"" "$CONFIG_FILE"; then
        echo "⚠️  IP $ip already exists in whitelist"
    else
        # Добавляем IP в customIPs массив
        sed -i.tmp "s/\"customIPs\": \[/\"customIPs\": [\n    \"$ip\",/" "$CONFIG_FILE"
        rm "${CONFIG_FILE}.tmp"
        echo "✅ IP $ip added to whitelist"
    fi
done

echo "🔄 Restarting application to apply changes..."
docker-compose restart app

echo "✅ Whitelist updated successfully!"
echo "📋 Current whitelist:"
cat "$CONFIG_FILE" | jq '.customIPs'
