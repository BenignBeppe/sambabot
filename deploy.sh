#! /usr/bin/env bash

DESTINATION_PATH=~/Dropbox/Public/sambabot

for d in $(find . -type d -not -path "." -not -path "*/.*")
do
    mkdir -v $DESTINATION_PATH/$d
done
for f in $(find . -type f -not -path "*/.*" -not -name "*~" )
do
    cp -v $f $DESTINATION_PATH/$f
done
