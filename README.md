#![](http://i.imgur.com/msEXHsu.png) dotfiles

## General

#### How to install

- `git clone` plus the url (ssh or https)
- Alternatively you can download the zip
- If you want to contribute create a fork and then a pull request 


#### Tips

This is the general directions applicable to every script.

- Be sure to `cd dir/of/script/` before running any script.
- If you receive an error running `./script.sh` run `chmod +x ./script.sh`
- Be sure to look at each script before running it to make any necessary modifications before running it.

## .files
- Replace current dot files with your own (`mv ~/.dotrc ~/dotfiles/dot/. `) or use mine.
- Run `./redot.sh` to symlink

## [Atom](https://atom.io/)
All of my atom settings are saved in `config.cson`. The `package-install.sh` file will restore these settings as well as all my packages and themes. The file `package-list.txt` is my list of currently installed packages.

#### Backup
- Run `./backup-packages.sh` while in the `atom/` folder.
- Both `config.cson` and `package-list.txt` should now be updated with your latest settings.

#### Restore
- Run `./package-install.sh` and it will install all the atom packages and restore settings.

## [Arch Linux](https://www.archlinux.org/)

My arch installation uses the tool [Yaourt](https://wiki.archlinux.org/index.php/Yaourt) for package management from [AUR](https://aur.archlinux.org/). My script can be easily adapted to support any package manager.

#### Backup
- Run `./backup-arch.sh` to backup your packagelist (using yaourt) and your `pacman.conf` file. (This requires sudo)
  - This will backup your packagelist to the `backups/` folder
  - Only one copy of your packagelist is saved

#### Restore
The restore script will assume you are on a fresh install and haven't even installed yaourt. It will download the tarball from AUR and install it for you.

- Run `./initial-setup.sh` (Thats it!)
  - This requires the `backups/` folder to not be empty and contain a yaourt backup of your packagelist
  - This will download yaourt and save it to the `tmp/` folder, be sure to remove it if you do not wish to have the tarball after the script has finished

## [Gnome](https://www.gnome.org/)

Gnome 3 shell extensions and gconf backups

##### My Shell Extensions:
- [Caffine](https://extensions.gnome.org/extension/517/caffeine/)
- [Dynamic Top Bar](https://extensions.gnome.org/extension/885/dynamic-top-bar/)
- [OpenWeather](https://extensions.gnome.org/extension/750/openweather/)
- [Refresh Wifi](https://extensions.gnome.org/extension/905/refresh-wifi-connections/)
- [Shutdown Timer](https://extensions.gnome.org/extension/183/shutdown-timer/)
- [TeaTime](https://extensions.gnome.org/extension/604/teatime/)

#### Backup
- Run `./backup.sh`

#### Restore
- Run `./restore.sh`

## [Ruby on Rails](http://rubyonrails.org/)

This script installs ruby 2.2.2, 2.2.0, and 2.1.4 as well as rails and sets up Git.

#### Installation
- Run `./install.sh`


## Disclaimer
- This is open sourced and the code is available for anyone to use. There is no reason for you to not understand what each script is doing.
- Nothing in this project is malicious at all.
- I do not take responsibility for anything broken on your machine, please look through the code and understand what is happening.