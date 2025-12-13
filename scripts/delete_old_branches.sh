#!/bin/bash

# 3일 이상 된 로컬 브랜치 삭제 스크립트
# 사용법: ./delete_old_branches.sh [days]
# 예: ./delete_old_branches.sh 3

DAYS=${1:-3}
PROTECTED_BRANCHES="develop|main|master|current"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🔍 Finding branches older than $DAYS days..."
echo "Protected branches: $PROTECTED_BRANCHES, $CURRENT_BRANCH"
echo ""

# 3일 이상 된 브랜치 찾기
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso)' refs/heads/ | \
while read branch date; do
  # 보호된 브랜치 제외
  if [[ "$branch" =~ ^($PROTECTED_BRANCHES)$ ]] || [[ "$branch" == "$CURRENT_BRANCH" ]]; then
    continue
  fi
  
  # 날짜 비교
  branch_timestamp=$(date -d "$date" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S %z" "$date" +%s 2>/dev/null)
  cutoff_timestamp=$(date -d "$DAYS days ago" +%s 2>/dev/null || date -v-${DAYS}d +%s 2>/dev/null)
  
  if [ $branch_timestamp -lt $cutoff_timestamp ]; then
    echo "🗑️  Deleting: $branch (last commit: $date)"
    git branch -D "$branch"
  fi
done

echo ""
echo "✅ Done!"
