#!/bin/sh

# This file defines which environment variables are substituted into configuration files.
# Centralizing this list makes it easier to add/remove settings.

# 1. Variables for config.js (Application Config)
export APP_VARS='$API_BASE_URL $BASE_URL $ENABLE_LINEAGE_MFE $ENABLE_CATALOG_MFE $LINEAGE_MFE_URL $CATALOG_MFE_URL $ENABLE_AUTH $OIDC_AUTHORITY $OIDC_CLIENT_ID $OIDC_REDIRECT_URI $OIDC_SCOPE $OIDC_CLIENT_SECRET $OIDC_RESOURCE $OIDC_USERINFO_ENDPOINT $OIDC_RESPONSE_TYPE $OIDC_RESPONSE_MODE $OIDC_AUTH_ENDPOINT $OIDC_TOKEN_ENDPOINT'

# 2. Variables for nginx.conf (Infrastructure Config)
export INFRA_VARS='$BASE_URL $BASE_URL_PREFIX $REDIRECT_COMMAND $API_LOCATION_REGEX $SUBPATH_REDIRECT_BLOCK $NAMESERVER $BACKEND_HOST'

# 3. Combined list for convenience
export ALL_VARS="${APP_VARS} ${INFRA_VARS}"
