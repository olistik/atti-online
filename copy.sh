#!/bin/bash

dest_dir="../atti-online-frontend"
cp database.json "$dest_dir/data/"
gcp -af bundles "$dest_dir/source/"
