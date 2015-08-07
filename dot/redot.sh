#!/bin/bash
############################
# redot.sh
# This script creates symlinks from the home directory to any desired dotfiles in ~/dotfiles
############################

########## Variables

dir=~/git/dotfiles/dot               # dotfiles directory
olddir=~/git/dotfiles/dot/dotold     # old dotfiles backup directory
files="bashrc vimrc vim irbrc gemrc gitconfig bash_profile zshrc"    # list of files/folders to symlink in homedir
ohmyzsh=~/.oh-my-zsh
# conkyrc yaourtrc oh-my-zsh
##########

# create dotfiles_old in homedir
echo "Creating $olddir for backup of any existing dotfiles in ~"
mkdir -p $olddir
echo "...done"

# change to the dotfiles directory
echo "Changing to the $dir directory"
cd $dir
echo "...done"

# move any existing dotfiles in homedir to dotfiles_old directory, then create symlinks
for file in $files; do
  echo "[Move]    $file ~ $olddir"
  mv ~/.$file $olddir/$file
  echo "[Symlink] $file"
  ln -s $dir/$file ~/.$file
done

# Set up oh my zsh
if [ -d "$ohmyzsh" ]; then
  echo "$ohmyzsh exists, skipping."
else
  sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
  cd $ohmyzsh/custom/plugins
  git clone git://github.com/zsh-users/zsh-syntax-highlighting.git
fi
