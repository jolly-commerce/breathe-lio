#!/bin/bash

echo "Setting up Git hooks for Shopify theme development..."

# Create the pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/sh

echo "Running Shopify theme check before push..."

# Run the theme check
if ! npm run prepush; then
    echo ""
    echo "❌ Push blocked: Shopify theme check failed!"
    echo "Please fix the theme issues before pushing."
    echo "Run 'npm run theme:check' to see the specific errors."
    exit 1
fi

echo "✅ Theme check passed - proceeding with push"
exit 0
EOF

# Make it executable
chmod +x .git/hooks/pre-push

echo "✅ Pre-push hook installed successfully!"
echo ""
echo "Now when you push code, it will automatically run 'shopify theme check'"
echo "and block the push if there are any theme validation errors."
echo ""
echo "To bypass the check (not recommended), use: git push --no-verify" 