# Progressive Expansion Test Data - 실행 가이드

## 1. Dummy Job Manager API 추가 완료

`/api/v1/jobs/scheduling-lineage/progressive_test` 엔드포인트가 추가되었습니다.

**데이터 구조**:
- Level 0: 20 jobs (각 Level 1의 upstream)
- Level 1: 10 jobs (CENTER_JOB의 upstream)
- Level 2: CENTER_JOB (10 upstream, 10 downstream)
- Level 3: 10 jobs (CENTER_JOB의 downstream)

---

## 2. 테스트 데이터 로드 명령어

### 방법 1: JSON 파일 사용 (권장)

```bash
# 1. Job Manager에서 데이터 가져와서 Lineage Manager에 sync
curl -X POST http://localhost:5003/lineage-manager/api/v1/graph/jobs/sync/by_ids \
  -H "Content-Type: application/json" \
  -d @/home/darkwing/src/lineage_manager/scripts/progressive_test_payload.json
```

### 방법 2: 인라인 JSON

```bash
curl -X POST http://localhost:5003/lineage-manager/api/v1/graph/jobs/sync/by_ids \
  -H "Content-Type: application/json" \
  -d '{
  "jobs": [
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_001"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_002"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_003"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_004"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_005"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_006"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_007"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_008"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_009"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_010"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_011"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_012"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_013"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_014"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_015"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_016"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_017"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_018"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_019"},
    {"type": "SELF-TYPE", "job_id": "LEVEL0_JOB_020"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_001"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_002"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_003"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_004"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_005"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_006"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_007"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_008"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_009"},
    {"type": "SELF-TYPE", "job_id": "LEVEL1_JOB_010"},
    {"type": "SELF-TYPE", "job_id": "CENTER_JOB"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_001"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_002"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_003"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_004"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_005"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_006"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_007"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_008"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_009"},
    {"type": "SELF-TYPE", "job_id": "LEVEL3_JOB_010"}
  ]
}'
```

---

## 3. 테스트 절차

### Step 1: 데이터 로드
```bash
curl -X POST http://localhost:5003/lineage-manager/api/v1/graph/jobs/sync/by_ids \
  -H "Content-Type: application/json" \
  -d @/home/darkwing/src/lineage_manager/scripts/progressive_test_payload.json
```

### Step 2: 브라우저에서 테스트
```
http://localhost:5003/lineage-manager
```

### Step 3: CENTER_JOB 검색
1. 검색창에 "CENTER_JOB" 입력
2. 검색 결과 클릭

### Step 4: Upstream 확장 테스트
1. "Expand Upstream" 버튼 클릭
2. **확인사항**:
   - ✅ 4개 job 표시 (LEVEL1_JOB_001 ~ 004)
   - ✅ "... 6 more jobs" 집계 노드 표시
3. 집계 노드 클릭
4. **확인사항**:
   - ✅ 2초 동안 심장 박동 애니메이션 (꿍... 꿍... 꿍... 꿍...)
   - ✅ 3개 job 추가 표시 (LEVEL1_JOB_005 ~ 007)
   - ✅ "... 3 more jobs" 새 집계 노드
5. 다시 집계 노드 클릭
6. **확인사항**:
   - ✅ 심장 박동 애니메이션
   - ✅ 마지막 3개 job 표시 (LEVEL1_JOB_008 ~ 010)
   - ✅ 집계 노드 사라짐

### Step 5: Downstream 확장 테스트
1. "Expand Downstream" 버튼 클릭
2. 동일한 패턴 확인:
   - 4개 → "... 6 more" → 클릭 → 3개 추가 → "... 3 more" → 클릭 → 3개 추가

---

## 4. 예상 결과

### 초기 상태 (CENTER_JOB만)
```
CENTER_JOB
```

### Expand Upstream 1회
```
[LEVEL1_JOB_001] [LEVEL1_JOB_002] [LEVEL1_JOB_003] [LEVEL1_JOB_004]
                    ↓
              [CENTER_JOB]
              
[... 6 more jobs] ← 클릭 대기
```

### 집계 노드 클릭 후 (심장 박동 2초)
```
[LEVEL1_JOB_001] [LEVEL1_JOB_002] [LEVEL1_JOB_003] [LEVEL1_JOB_004]
[LEVEL1_JOB_005] [LEVEL1_JOB_006] [LEVEL1_JOB_007]
                    ↓
              [CENTER_JOB]
              
[... 3 more jobs] ← 클릭 대기
```

### 최종 상태
```
[LEVEL1_JOB_001] [LEVEL1_JOB_002] [LEVEL1_JOB_003] [LEVEL1_JOB_004]
[LEVEL1_JOB_005] [LEVEL1_JOB_006] [LEVEL1_JOB_007] [LEVEL1_JOB_008]
[LEVEL1_JOB_009] [LEVEL1_JOB_010]
                    ↓
              [CENTER_JOB]
                    ↓
[LEVEL3_JOB_001] [LEVEL3_JOB_002] [LEVEL3_JOB_003] [LEVEL3_JOB_004]
[LEVEL3_JOB_005] [LEVEL3_JOB_006] [LEVEL3_JOB_007] [LEVEL3_JOB_008]
[LEVEL3_JOB_009] [LEVEL3_JOB_010]
```

---

## 5. 문제 해결

### Dummy Job Manager가 응답하지 않는 경우
```bash
# Dummy Job Manager 재시작
cd /home/darkwing/src/lineage_manager/src/dummy_job_manager
make run
```

### 데이터가 로드되지 않는 경우
```bash
# 로그 확인
# Lineage Manager 로그에서 sync 결과 확인
```

### 집계 노드가 보이지 않는 경우
- 브라우저 캐시 삭제
- 페이지 새로고침 (Ctrl+Shift+R)
- 개발자 도구 콘솔에서 에러 확인

---

## 6. 추가 테스트

### Level 1 Job 확장
```
1. LEVEL1_JOB_001 검색
2. Expand Upstream 클릭
3. 2개의 Level 0 job 확인 (집계 없음)
```

### Level 0 Job 확장
```
1. LEVEL0_JOB_001 검색
2. Expand Upstream 클릭
3. 1개의 input table만 확인
```

---

**테스트 준비 완료!** 🎉
