#!/bin/bash

# Storyboarder VSCode 开发环境启动脚本
# 此脚本将启动所有必要的开发服务

set -e

echo "🎬 Storyboarder 开发环境启动脚本"
echo "=================================="

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js 14+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ 错误：Node.js 版本需要 14 或更高，当前版本：$(node -v)"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 检测到未安装依赖，开始安装..."
    npm install
fi

# 清理之前的构建
echo "🧹 清理之前的构建..."
npm run clean:xr 2>/dev/null || true
npm run clean:ar 2>/dev/null || true

# 启动开发服务器
echo "🚀 启动开发服务..."
echo ""
echo "服务列表:"
echo "  - Electron 主应用"
echo "  - XR 模块 (Webpack 监听)"
echo "  - AR 模块 (Webpack 监听)"
echo "  - Shot Generator (Webpack 监听)"
echo "  - 后端服务器"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "=================================="
echo ""

# 使用 npm-run-all 并行启动所有服务
npm start
