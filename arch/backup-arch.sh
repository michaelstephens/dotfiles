#!/bin/bash
############################
# backup-aur.sh
# This script backs up all installed AUR packages.
# REQUIRES YAOURT
############################

cp /etc/pacman.conf .

if type "$yaourt" > /dev/null; then
  echo "Please install Yaourt."
else
  if [ -d "backups/" ]; then echo "Removing old backup..."; rm -rf backups; fi
  mkdir backups
  yaourt --backup backups/
fi
