#!/bin/bash
############################
# package-install.sh
# This script installs atom packages based off of the package-list.txt file
############################

echo "Starting config import."
cp config.cson ~/.atom/config.cson
echo "Starting import."
apm install --packages-file ~/git/dotfiles/atom/package-list.txt
echo "Import finished."
