#!/bin/bash
############################
# package-install.sh
# This script generates package-list.txt for backing up atom packages
############################


echo "Starting config backup."
cp ~/.atom/config.cson .
echo "Starting package backup."
apm list --installed --bare > package-list.txt
echo "Backup finished."
