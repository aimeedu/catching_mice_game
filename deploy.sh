#!/bin/bash

# 推送到 GitHub 并触发 Azure 自动部署的脚本

echo "🚀 准备推送 Catching Mice Game 到 GitHub..."

# 添加所有更改
git add .

# 提交更改
echo "📝 提交更改..."
git commit -m "Add Azure deployment configuration and auto-deploy setup

- Add GitHub Actions workflow for Azure Static Web Apps
- Add staticwebapp.config.json for SPA routing
- Add azure.yml configuration
- Add deployment documentation
- Ready for automatic deployment on every push"

# 推送到 main 分支
echo "⬆️ 推送到 GitHub..."
git push origin main

echo "✅ 推送完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 访问 Azure Portal (https://portal.azure.com)"
echo "2. 创建新的 Static Web App 资源"
echo "3. 连接到你的 GitHub 仓库 'catching-mice-game'"
echo "4. 选择 main 分支和 React 预设"
echo "5. Azure 会自动设置 CI/CD"
echo ""
echo "🎯 完成后，每次推送代码都会自动部署到 Azure！"
