#!/bin/bash
# Upload audio files and aligned JSON to Cloudflare R2
#
# Prerequisites:
#   1. Install AWS CLI: brew install awscli
#   2. Configure R2 credentials:
#      aws configure --profile r2
#      (Use R2 access key ID and secret from Cloudflare dashboard)
#   3. Set your Cloudflare account ID below
#
# Usage:
#   ./scripts/upload_to_r2.sh
#   ./scripts/upload_to_r2.sh --dry-run   # List files without uploading

set -euo pipefail

BUCKET="gita-audio"
PROFILE="r2"
ACCOUNT_ID="${R2_ACCOUNT_ID:-7d9ee80cb675d44fa609a6ef487e31b8}"
ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"

AUDIO_BASE="$HOME/Desktop/gita_podcast"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[DRY RUN] Listing files that would be uploaded..."
fi

upload_file() {
  local src="$1"
  local dest="$2"
  local content_type="$3"

  if $DRY_RUN; then
    echo "  Would upload: $(basename "$src") -> s3://${BUCKET}/${dest}"
  else
    aws s3 cp "$src" "s3://${BUCKET}/${dest}" \
      --profile "$PROFILE" \
      --endpoint-url "$ENDPOINT" \
      --content-type "$content_type" \
      --quiet
  fi
}

count=0

echo ""
echo "=== Uploading English audio files (M4A) ==="
for f in "${AUDIO_BASE}/Audio_English_AAC/"*.m4a; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "audio/en/${filename}" "audio/mp4"
  count=$((count + 1))
done
echo "  English audio: $count files"

count=0
echo ""
echo "=== Uploading English aligned JSON files ==="
for f in "${AUDIO_BASE}/Audio_English/"*_aligned.json; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "audio/en/${filename}" "application/json"
  count=$((count + 1))
done
echo "  English JSON: $count files"

count=0
echo ""
echo "=== Uploading Hindi audio files (M4A) ==="
for f in "${AUDIO_BASE}/Audio_Hindi_AAC/"*.m4a; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "audio/hi/${filename}" "audio/mp4"
  count=$((count + 1))
done
echo "  Hindi audio: $count files"

count=0
echo ""
echo "=== Uploading Hindi aligned JSON files ==="
for f in "${AUDIO_BASE}/Audio_Hindi/"*_aligned.json; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "audio/hi/${filename}" "application/json"
  count=$((count + 1))
done
echo "  Hindi JSON: $count files"

if ! $DRY_RUN; then
  echo ""
  echo "=== Verifying upload ==="
  echo -n "English files: "
  aws s3 ls "s3://${BUCKET}/audio/en/" --profile "$PROFILE" --endpoint-url "$ENDPOINT" | wc -l | tr -d ' '
  echo -n "Hindi files: "
  aws s3 ls "s3://${BUCKET}/audio/hi/" --profile "$PROFILE" --endpoint-url "$ENDPOINT" | wc -l | tr -d ' '
fi

echo ""
echo "Done."
