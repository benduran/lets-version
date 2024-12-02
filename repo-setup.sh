#!/bin/bash

bunExists() {
  RESULT="$(command -v bun)"

  if [ -z "$RESULT" ]; then
    echo "not_found"
  else
    echo $RESULT
  fi
}

BUNPATH="$(bunExists)"

if [ "$BUNPATH" == "not_found" ]; then
  echo "Bun wasn't found. Downloading now..."
  # assume a unix-like platform.
  # sorry Windows folks. catch you next time 👋🏼
  curl -fsSL https://bun.sh/install | bash
  exec /usr/bin/zsh
fi

if [ "$CI" != "" ]; then
  bun install --frozen-lockfile
else
  bun install
fi

bun husky
