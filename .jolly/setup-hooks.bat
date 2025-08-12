@echo off
echo Setting up Git hooks for Shopify theme development...

REM Create the pre-push hook directory if it doesn't exist
if not exist ".git\hooks" mkdir .git\hooks

REM Create the pre-push hook for Windows
(
echo @echo off
echo echo Running Shopify theme check before push...
echo.
echo REM Run the theme check
echo call npm run prepush
echo if errorlevel 1 (
echo     echo.
echo     echo ❌ Push blocked: Shopify theme check failed!
echo     echo Please fix the theme issues before pushing.
echo     echo Run 'npm run theme:check' to see the specific errors.
echo     exit /b 1
echo )
echo.
echo echo ✅ Theme check passed - proceeding with push
echo exit /b 0
) > .git\hooks\pre-push

echo ✅ Pre-push hook installed successfully!
echo.
echo Now when you push code, it will automatically run 'shopify theme check'
echo and block the push if there are any theme validation errors.
echo.
echo To bypass the check (not recommended), use: git push --no-verify 