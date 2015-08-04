#!/bin/bash
############################
# restore.sh
# This script restores gnome settings
############################

echo "Restoring gconfig..."
gconftool-2 --load gconf_dump.xml

echo "Restoring gnome shell extensions..."
cp -R extensions/ ~/.local/share/gnome-shell/extensions

echo "Finished!"
