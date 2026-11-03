@echo off
setlocal
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
set "TASK_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%TASK_NODE%" set "TASK_NODE=node"
if not exist "node_modules\next\dist\bin\next" (
  echo Install the project dependencies with pnpm install first.
  pause
  exit /b 1
)
echo Opening the local frontend at http://127.0.0.1:3000
"%TASK_NODE%" node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port 3000
