#!/bin/bash
############################
# initial-setup.sh
# This script installs yaourt. ONLY RUN ON A FRESH INSTALL OF ARCH.
############################

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
echo 'Installing AUR packages...'
yaourt --backup backups/*
