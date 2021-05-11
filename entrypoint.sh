#!/bin/sh

set -eu

if [ ! -z "${1:-}" ]; then
	exec "$@"
else
  # check if config.js is present (via volume)
  # or if it's missing
  if [ ! -f "./config.js" ]; then
    # config.js missing, generate it
    if [ ! -z "${CONFIGJS:-}" ]; then
      # use $CONFIGJS variable that might be passed to the container:
      # --env CONFIGJS="$(cat public/config.example.js)"
      echo "${CONFIGJS}" > ./config.js
    else
      # Try to guess where the API is located by using DOMAIN or VIRTUAL_HOST and prefix it with "api."
      API_HOST=${API_HOST:-"api.${VIRTUAL_HOST:-"${DOMAIN:-"local.cortezaproject.org"}"}"}
      API_FULL_URL=${API_FULL_URL:-"//${API_HOST}"}

      echo "window.CortezaAPI = '${API_FULL_URL}'" > ./config.js
    fi
  fi

  nginx -g "daemon off;"
fi
