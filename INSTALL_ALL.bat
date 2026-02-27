@echo off
chcp 65001 >nul
echo ========================================
echo Reconstruct.AI - One-Click Installation
echo ========================================
echo.

REM Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ first.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js
echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo.

REM Install Python dependencies
echo [3/4] Installing Python dependencies...
echo This may take 5-10 minutes depending on your network speed.
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
cd ..
echo Python dependencies installed successfully.
echo.

REM Install Node.js dependencies
echo [4/4] Installing Node.js dependencies...
echo This may take 3-5 minutes.
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node.js dependencies.
    pause
    exit /b 1
)
cd ..
echo Node.js dependencies installed successfully.
echo.

echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run START_ALL.bat to launch the application
echo 2. Open http://localhost:5173 in your browser
echo 3. Register an account and configure AI provider
echo.
echo For GPU acceleration (recommended):
echo - Install CUDA 11.8+ from https://developer.nvidia.com/cuda-downloads
echo - Reinstall PyTorch with CUDA support:
echo   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
echo.
pause
