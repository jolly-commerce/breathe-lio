#!/bin/bash

echo "Running postinstall setup..."

# Check if setup-hooks.sh exists
if [ ! -f ".jolly/setup-hooks.sh" ]; then
    echo "⚠️  setup-hooks.sh not found - skipping Git hooks setup"
    exit 0
fi

# Run the setup-hooks script
echo "Installing Git hooks..."
bash .jolly/setup-hooks.sh

echo "✅ Postinstall setup completed!" 