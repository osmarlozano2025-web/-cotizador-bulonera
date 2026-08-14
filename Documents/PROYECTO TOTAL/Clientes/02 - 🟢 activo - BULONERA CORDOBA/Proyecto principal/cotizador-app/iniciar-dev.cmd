@echo off
REM Levanta el entorno de desarrollo completo: API PHP en :8899 y Vite en :5173.
REM Se ubica solo, así que se puede llamar desde cualquier carpeta.
cd /d "%~dp0"
call npm run dev
