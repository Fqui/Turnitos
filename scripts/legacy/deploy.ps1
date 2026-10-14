# Deployment script for GitHub Pages
# This script builds and deploys the demo version

Write-Host "🚀 Starting deployment to GitHub Pages..." -ForegroundColor Cyan

# Check if gh-pages is installed
$ghPagesInstalled = npm list gh-pages --depth=0 2>$null
if (-not $ghPagesInstalled) {
    Write-Host "📦 Installing gh-pages..." -ForegroundColor Yellow
    npm install --save-dev gh-pages
}

# Get repository name from package.json or prompt user
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$repoName = Read-Host "Enter your GitHub repository name (e.g., court-booking-demo)"

if (-not $repoName) {
    Write-Host "❌ Repository name is required!" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Building project with base path: /$repoName/" -ForegroundColor Yellow
$env:VITE_BASE_PATH = "/$repoName/"
$env:VITE_DEMO_MODE = "true"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying to gh-pages branch..." -ForegroundColor Green
npx gh-pages -d dist

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Your demo will be available at:" -ForegroundColor Cyan
    Write-Host "   https://YOUR-USERNAME.github.io/$repoName/" -ForegroundColor White
    Write-Host ""
    Write-Host "⚙️  Don't forget to enable GitHub Pages in your repository settings!" -ForegroundColor Yellow
    Write-Host "   Settings > Pages > Source: gh-pages branch" -ForegroundColor Yellow
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
