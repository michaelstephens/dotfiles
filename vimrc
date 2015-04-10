set nocompatible
filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
execute pathogen#infect()

cmap w!! %sudo tee > /dev/null %
filetype plugin indent on
syntax on

" SETTINGS
:set tabstop=2 shiftwidth=2 expandtab
:set autoindent
:set cindent
:set number

" PLUGINS
Plugin 'gmarik/Vundle.vim'
Plugin 'tpope/vim-fugitive'
Plugin 'L9'
Plugin 'git://git.wincent.com/command-t.git'
Plugin 'rstacruz/sparkup', {'rtp': 'vim/'}
Plugin 'kchmck/vim-coffee-script'
Plugin 'tpope/vim-endwise'
Plugin 'jiangmiao/auto-pairs'
Plugin 'nathanaelkane/vim-indent-guides'
Plugin 'vim-ruby/vim-ruby'
Plugin 'tpope/vim-rails'
Plugin 'tpope/vim-bundler'
Plugin 'pangloss/vim-javascript'
Plugin 'terryma/vim-multiple-cursors'
Plugin 'bronson/vim-trailing-whitespace'
Plugin 'DeleteTrailingWhitespace'
Plugin 'kien/ctrlp.vim'

" Syntax Plugins
Plugin 'nanotech/jellybeans.vim'
Plugin 'tomasr/molokai'
Plugin 'slim-template/vim-slim'
Plugin 'leshill/vim-json'
Plugin 'kien/rainbow_parentheses.vim'

