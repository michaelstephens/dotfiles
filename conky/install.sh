#!/bin/bash
############################
# install.sh
# This script installs my conky config
############################

########## Variables

dir=~/git/dotfiles/conky      # conky directory
folder="harmattan-assets"    # conky folder

##########

# move existing folder in homedir
echo "[Install] $folder"
cp -r $folder ~/.$folder
echo "[Finished]"
