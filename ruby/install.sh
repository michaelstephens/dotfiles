#!/bin/bash
############################
# install.sh
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
