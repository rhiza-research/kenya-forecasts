#!/bin/sh
set -eu
# ${VAR:?} catches unset AND empty; an empty value substitutes to nothing.
: "${FILESTASH_HOST:?is unset or empty}"
: "${S3_BUCKET:?is unset or empty}"
: "${FILESTASH_SECRET_KEY:?is unset or empty}"
: "${FILESTASH_ADMIN_BCRYPT:?is unset or empty}"
: "${S3_ACCESS_KEY_ID:?is unset or empty}"
: "${S3_SECRET_ACCESS_KEY:?is unset or empty}"
S3_ENDPOINT="${S3_ENDPOINT:-https://storage.googleapis.com}"
# Reject anything that would corrupt the sed replacement or the JSON value it
# lands in. grep works a line at a time, so newlines are rejected separately.
check() {
  [ "$(printf '%s' "$2" | wc -l | tr -d ' ')" -eq 0 ] || { echo "entrypoint: $1 has a newline" >&2; exit 1; }
  printf '%s' "$2" | grep -qxE "$3" || { echo "entrypoint: $1 does not match $3" >&2; exit 1; }
}
check FILESTASH_HOST "$FILESTASH_HOST" '[A-Za-z0-9.:-]+'
check S3_BUCKET "$S3_BUCKET" '[a-z0-9][a-z0-9._-]*'
check FILESTASH_SECRET_KEY "$FILESTASH_SECRET_KEY" '[a-zA-Z0-9]{16}'
check FILESTASH_ADMIN_BCRYPT "$FILESTASH_ADMIN_BCRYPT" '\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}'
check S3_ACCESS_KEY_ID "$S3_ACCESS_KEY_ID" '[A-Za-z0-9+/=]+'
check S3_SECRET_ACCESS_KEY "$S3_SECRET_ACCESS_KEY" '[A-Za-z0-9+/=]+'
check S3_ENDPOINT "$S3_ENDPOINT" 'https?://[A-Za-z0-9.:_/-]+'
mkdir -p /app/data/state/config /app/data/state/plugins
# /app/data is an emptyDir under Kubernetes, so it is empty at every start and
# the plugin has to be installed into it rather than baked in.
cp /app/plugin/branding.zip /app/data/state/plugins/branding.zip
# The leading slash is added here, not typed into .env: without it the browse
# root becomes the bucket list rather than the bucket.
sed -e "s|__HOST__|$FILESTASH_HOST|g" \
  -e "s|__S3_BUCKET__|/$S3_BUCKET|g" \
  -e "s|__SECRET_KEY__|$FILESTASH_SECRET_KEY|g" \
  -e "s|__ADMIN_BCRYPT__|$FILESTASH_ADMIN_BCRYPT|g" \
  -e "s|__S3_ACCESS_KEY_ID__|$S3_ACCESS_KEY_ID|g" \
  -e "s|__S3_SECRET_ACCESS_KEY__|$S3_SECRET_ACCESS_KEY|g" \
  -e "s|__S3_ENDPOINT__|$S3_ENDPOINT|g" \
  /app/config.json.tmpl > /app/data/state/config/config.json
exec /app/filestash
