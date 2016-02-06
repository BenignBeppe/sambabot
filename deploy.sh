#! /usr/bin/env bash

DESTINATION_PATH=~/Dropbox/Public/sambabot
SCORE_LIST_PATH=score-list.txt
NOTE_TYPE_LIST_PATH=note-type-list.txt
ONLY_GENERATE=0

while getopts ":g" opt; do
  case $opt in
    g)
      ONLY_GENERATE=1
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

echo === Generating lists ===
ls -1B scores | sed -r "s/\.json//g" > $SCORE_LIST_PATH
echo Generated $SCORE_LIST_PATH with $(wc -l $SCORE_LIST_PATH | egrep -o "^[0-9]+") scores.
find sounds -type f > $NOTE_TYPE_LIST_PATH
echo Generated $NOTE_TYPE_LIST_PATH with $(wc -l $NOTE_TYPE_LIST_PATH | egrep -o "^[0-9]+") note type sounds.

if [ $ONLY_GENERATE = 0 ]
then
    echo === Creating directories ===
    for d in $(find . -type d -not -path "." -not -path "*/.*")
    do
        mkdir -v $DESTINATION_PATH/$d
    done

    echo === Copying files ===
    for f in $(find . -type f -not -path "*/.*" -not -name "*~" \
               -not -name "#*#" -not -name "deploy.sh" )
    do
        cp -v $f $DESTINATION_PATH/$f
    done
fi
