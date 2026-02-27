@echo off
echo ========================================
echo Starting 3D Reconstruction Platform
echo ========================================
echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && F:\Anaconda_Envs\imc_env\python.exe main.py"
timeout /t 3 /nobreak > nul
echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo.
echo ========================================
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit (servers will keep running)
pause > nul
