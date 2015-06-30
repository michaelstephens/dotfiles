#!/bin/bash
############################
# first_time_setup.sh
# This script is the timer setup for systemd to allow automation.
############################

echo "Moving the backup.service file..."
if [ -a /etc/systemd/system/backup.service ]; then
  sudo rm /etc/systemd/system/backup.service
fi
sudo cp backup.service /etc/systemd/system/backup.service

echo "Moving the backup.timer file..."
if [ -a /etc/systemd/system/backup.timer ]; then
  sudo rm /etc/systemd/system/backup.timer
fi
sudo cp backup.timer /etc/systemd/system/backup.timer

echo 'Reloading daemon...'
sudo systemctl daemon-reload
echo 'Starting backup.timer...'
sudo systemctl enable backup.timer
sudo systemctl start backup.timer

systemctl list-timers --all
