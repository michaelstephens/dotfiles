#!/bin/bash
############################
# backup.sh
# This script installs ruby
############################

################# Variables
username = "Michael Stephens" # Your Git username
email = "michael.stephens@biola.edu" # Your Git email
#################

echo "Installing rbenv..."
git clone https://github.com/sstephenson/rbenv.git ~/.rbenv
echo "Installing ruby-build..."
git clone https://github.com/sstephenson/ruby-build.git ~/.rbenv/plugins/ruby-build
echo "Installing rbenv rehash..."
git clone https://github.com/sstephenson/rbenv-gem-rehash.git ~/.rbenv/plugins/rbenv-gem-rehash
echo "Installing ruby 2.2.2..."
rbenv install 2.2.2
rbenv rehash
echo "Installing ruby 2.2.0..."
rbenv install 2.2.0
rbenv rehash
echo "Installing ruby 2.1.4..."
rbenv install 2.1.4
rbenv rehash
echo "Set global ruby to 2.2.2..."
rbenv global 2.2.2
rbenv rehash

if type ruby; then
  echo "Installing Rails..."
  gem install bundler
  gem install rails
  rbenv rehash
  gem install mysql2
fi

echo "Set up Git..."
git config --global color.ui true
# These are specific to me, be sure to set your own
git config --global user.name $username
git config --global user.email $email
# This checks authentication against GitHub.
# Remove or comment this out if you do not use GitHub.
ssh -T git@github.com
