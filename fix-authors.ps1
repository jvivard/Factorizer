$env:GIT_AUTHOR_NAME="jvivard"
$env:GIT_AUTHOR_EMAIL="ggakavishnu@gmail.com"
$env:GIT_COMMITTER_NAME="jvivard"
$env:GIT_COMMITTER_EMAIL="ggakavishnu@gmail.com"

git filter-branch -f --env-filter "
    export GIT_AUTHOR_NAME=`"$env:GIT_AUTHOR_NAME`"
    export GIT_AUTHOR_EMAIL=`"$env:GIT_AUTHOR_EMAIL`"
    export GIT_COMMITTER_NAME=`"$env:GIT_COMMITTER_NAME`"
    export GIT_COMMITTER_EMAIL=`"$env:GIT_COMMITTER_EMAIL`"
" --tag-name-filter cat -- --all 