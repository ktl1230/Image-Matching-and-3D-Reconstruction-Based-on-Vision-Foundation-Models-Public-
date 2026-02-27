@echo off
echo ========================================
echo Installing Backend Dependencies...
echo ========================================
pip install fastapi uvicorn sqlalchemy python-jose python-multipart python-dotenv requests torch torchvision transformers pillow networkx

echo.
echo ========================================
echo Installing Frontend Dependencies...
echo ========================================
cd frontend
call npm install

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Double-click START_ALL.bat to start the application
echo 2. Open http://localhost:5173 in your browser
echo.
pause
