#!/bin/bash
############################
# initial-setup.sh
# This script installs yaourt. ONLY RUN ON A FRESH INSTALL OF ARCH.
############################


######## Restoring settings
echo 'Restoring pacman.conf'
sudo cp pacman.conf /etc/pacman.conf


######## Yaourt import
echo 'Downloading yaourt...'
mkdir tmp
curl -o ./tmp/yaourt.tar.gz 'https://aur.archlinux.org/packages/ya/yaourt/yaourt.tar.gz'
echo 'Installing yaourt...'
cd tmp/
tar -xvf yaourt.tar.gz
cd yaourt/
makepkg -s
sudo pacman -U *.tar.xz
cd ../../
if [ "$(ls -A backups/)" ]; then
  echo 'Installing AUR packages...'
  yaourt --backup backups/*
else
  echo "COULD NOT RESTORE: No backup found."
fi
