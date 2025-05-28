#!/bin/sh

git filter-branch --env-filter '
export GIT_AUTHOR_NAME="jvivard"
export GIT_AUTHOR_EMAIL="ggakavishnu@gmail.com"
export GIT_COMMITTER_NAME="jvivard"
export GIT_COMMITTER_EMAIL="ggakavishnu@gmail.com"
' --tag-name-filter cat -- --all 