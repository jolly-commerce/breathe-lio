@echo off
echo Running postinstall setup...

REM Check if setup-hooks.bat exists (which we'll create next)
if not exist ".jolly\setup-hooks.bat" (
    echo Warning: setup-hooks.bat not found - skipping Git hooks setup
    exit /b 0
)

REM Run the setup-hooks script
echo Installing Git hooks...
call .jolly\setup-hooks.bat

echo Postinstall setup completed! 