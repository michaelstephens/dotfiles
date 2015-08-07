#!/bin/bash
############################
# master_restore.sh
# This script is for automation. It will run all the restore and installation scripts.
############################

######## Variables
# These enable/disable the specific restore
dot_on=true
arch_on=false
atom_on=true
gnome_on=false
ruby_on=falses
conky_on=false
# These are the directories for the scripts
home_dir=~/git/dotfiles
dot_dir=~/git/dotfiles/dot
arch_dir=~/git/dotfiles/arch
atom_dir=~/git/dotfiles/atom
gnome_dir=~/git/dotfiles/gnome
ruby_dir=~/git/dotfiles/ruby
conky_dir=~/git/dotfiles/conky
########

cd $home_dir

# Restore Arch Linux packages and pacman.conf
if $arch_on; then
  echo "Beginning Arch restore..."
  cd $arch_dir
  ./restore.sh
  cd $home_dir
else
  echo "Skipping Arch restore..."
fi

# Restore for Gnome extensions, settings, and gconf
if $gnome_on; then
  echo "Beginning Gnome restore..."
  cd $gnome_dir
  ./restore.sh
  cd $home_dir
else
  echo "Skipping Gnome restore..."
fi

# Restore for dotfiles
if $dot_on; then
  echo "Beginning Dotfile restore..."
  cd $dot_dir
  ./redot.sh
  cd $home_dir
else
  echo "Skipping Dotfile restore..."
fi


# Installation of Ruby, Ruby on Rails, and Git
if $ruby_on; then
  echo "Beginning Ruby restore..."
  cd $ruby_dir
  ./install.sh
  cd $home_dir
else
  echo "Skipping Ruby restore..."
fi

# Restore for Atom packages, themes, and settings
if $atom_on; then
  echo "Beginning Atom restore..."
  cd $atom_dir
  ./restore.sh
  cd $home_dir
else
  echo "Skipping Atom restore..."
fi

# Restore for conky
if $conky_on; then
  echo "Beginning Conky restore..."
  cd $conky_dir
  ./install.sh
  cd $home_dir
else
  echo "Skipping Conky restore..."
fi

echo "Restore finished"
