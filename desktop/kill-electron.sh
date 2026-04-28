#!/bin/bash

# ============================================================
# 搭言 - 一键关闭所有 Electron 测试进程
# ============================================================

echo "🔍 正在查找 Electron 进程..."

# 关闭占用端口 33445 的进程
echo "📍 关闭端口 33445 上的进程..."
lsof -ti :33445 2>/dev/null | xargs kill -9 2>/dev/null

# 关闭所有 Electron 主进程
echo "⚡ 关闭 Electron 主进程..."
pkill -f "electron" 2>/dev/null

# 关闭 Electron Helper 进程
echo "🧹 关闭 Electron Helper 进程..."
pkill -f "Electron Helper" 2>/dev/null

# 关闭 Vite 开发服务器
echo "🛑 关闭 Vite 开发服务器..."
pkill -f "vite" 2>/dev/null

# 等待一下确保进程完全关闭
sleep 1

# 验证是否还有残留进程
REMAINING=$(ps aux | grep -E "electron|vite" | grep -v grep | grep -v "Trae CN" | grep -v "kill-electron.sh" | wc -l | tr -d ' ')

if [ "$REMAINING" -eq 0 ] || [ -z "$REMAINING" ]; then
    echo "✅ 所有 Electron 相关进程已关闭"
else
    echo "⚠️  还有 $REMAINING 个进程可能未关闭，请手动检查"
    ps aux | grep -E "electron|vite" | grep -v grep | grep -v "Trae CN"
fi

echo "🎉 清理完成！"
