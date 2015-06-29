#!/bin/bash
############################
# backup.sh
# This script backs up gnome settings
############################

echo "Backing up gconf..."
gconftool-2 --dump / > gconf_dump.xml

echo "Backing up gnome shell extensions..."
cp -R ~/.local/share/gnome-shell/extensions extensions/

echo "Finished!"
