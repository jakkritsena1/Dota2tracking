#!/usr/bin/env bash
# First-time setup script for the Dota 2 Personal Dashboard.
# Run after cloning: bash scripts/setup.sh

set -euo pipefail

echo "🎮 Dota 2 Dashboard — setup"

# 1. Check dependencies
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install v20+"; exit 1; }
command -v supabase >/dev/null 2>&1 || echo "⚠️  Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"

# 2. Install npm packages
echo ""
echo "📦 Installing npm packages..."
npm install

# 3. Copy env template
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "📄 Created .env.local from .env.example"
  echo "   → Fill in your Supabase and STRATZ credentials before running"
else
  echo "📄 .env.local already exists — skipping"
fi

# 4. Supabase local start (optional)
echo ""
read -p "Start Supabase locally? (requires Docker) [y/N] " -n 1 -r REPLY
echo
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
  echo "🐘 Starting Supabase..."
  supabase start
  echo ""
  echo "✅ Supabase running. Credentials saved in .env.local automatically."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your credentials"
echo "  2. npm run dev         — start the Next.js app"
echo "  3. supabase db reset   — apply migrations locally"
echo "  4. supabase test db    — run pgTAP tests"
