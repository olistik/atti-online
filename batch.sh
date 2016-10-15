#!/bin/bash

for i in $(seq 0 9); do
  let start=$(expr $i*50+1)
  let end=$(expr $start+49)
  echo "Batch: $start - $end"
  ./node_modules/casperjs/bin/casperjs fetch.js --year=2016 --label="Delibere di Giunta" --start="$start" --end="$end"
done
