# 部署到 Azure 静态 Web 应用

## 自动部署设置步骤：

### 1. 在 Azure Portal 创建静态 Web 应用
1. 登录 [Azure Portal](https://portal.azure.com)
2. 点击 "创建资源" -> 搜索 "Static Web Apps"
3. 点击 "创建"
4. 配置基本信息：
   - 资源组：创建新的或选择现有的
   - 静态 Web 应用名称：`catching-mice-game`
   - 计划类型：选择 "免费"
   - 区域：选择离你最近的区域

### 2. 连接 GitHub 仓库
1. 在部署详细信息部分：
   - 源：选择 "GitHub"
   - 登录你的 GitHub 账户
   - 组织：选择你的 GitHub 用户名
   - 存储库：选择 `catching-mice-game`
   - 分支：选择 `main`

2. 构建详细信息：
   - 构建预设：选择 "React"
   - 应用位置：`/`
   - API 位置：留空
   - 输出位置：`build`

### 3. 完成创建
1. 点击 "查看 + 创建"
2. 点击 "创建"

### 4. 自动部署原理
- Azure 会自动在你的 GitHub 仓库中添加 GitHub Actions 工作流
- 每次推送到 `main` 分支都会触发自动构建和部署
- 构建过程：
  1. 检出代码
  2. 安装 Node.js 依赖
  3. 运行 `npm run build`
  4. 将 `build` 文件夹部署到 Azure

### 5. 获取网站 URL
部署完成后，在 Azure Portal 的静态 Web 应用概述页面可以看到你的网站 URL。

## 后续使用：

### 推送更新
```bash
git add .
git commit -m "更新游戏功能"
git push origin main
```

每次推送后，GitHub Actions 会自动：
1. 构建你的 React 应用
2. 部署到 Azure
3. 约 2-3 分钟后你的网站就会更新

### 查看部署状态
- 在 GitHub 仓库的 "Actions" 标签页可以查看构建状态
- 在 Azure Portal 的静态 Web 应用页面可以查看部署历史

## 注意事项：
1. 确保你的 `package.json` 中有正确的构建脚本
2. 推送前先在本地测试 `npm run build` 确保能正常构建
3. 第一次部署可能需要 5-10 分钟，后续更新会更快

## 问题排查：
如果部署失败，检查：
1. GitHub Actions 日志（在仓库的 Actions 标签页）
2. 确保 `npm run build` 在本地能正常运行
3. 检查 Azure Portal 中的部署日志
