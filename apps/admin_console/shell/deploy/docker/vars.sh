#!/bin/sh

# This file defines which environment variables are substituted into configuration files.
# Centralizing this list makes it easier to add/remove settings.

# 1. Variables for config.js (Application Config)
export APP_VARS='$API_BASE_URL $BASE_URL $ENABLE_LINEAGE_MFE $ENABLE_TABLE_DETAIL_MFE $LINEAGE_MFE_URL $TABLE_DETAIL_MFE_URL'

# 2. Variables for nginx.conf (Infrastructure Config)
export INFRA_VARS='$BASE_URL $BASE_URL_PREFIX $REDIRECT_COMMAND $API_LOCATION_REGEX $SUBPATH_REDIRECT_BLOCK $NAMESERVER'

# 3. Combined list for convenience
export ALL_VARS="${APP_VARS} ${INFRA_VARS}"
