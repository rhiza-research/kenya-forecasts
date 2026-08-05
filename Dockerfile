# Upstream publishes only a rolling `latest`, so the base is pinned by digest.
FROM machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a AS plugin-build

# The base is debian:stable-slim, which does not ship zip. Adding it to a
# throwaway stage keeps the runtime image as upstream shipped it and avoids
# introducing a second base image.
USER root
RUN apt-get update > /dev/null && \
    apt-get install -y --no-install-recommends zip > /dev/null && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /plugin
COPY app/plugin/branding/ ./

# Pack the plugin verbatim. Every file goes in, including kmsa-logo.jpg, which
# index.js now loads over HTTP from inside the zip instead of the stylesheet
# carrying it as base64.
#
# extension.Discovery compares the zip entry name against manifest.json and each
# module entrypoint literally, so the archive has to be flat. The shell expands
# the glob to bare filenames in this directory and zip stores them as given;
# recursing a directory instead would prefix every entry with its name and
# nothing would resolve. The archive is written outside the directory so it
# cannot match its own glob.
RUN set -eu; \
    zip -q /branding.zip *

FROM machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a

# Upstream sets no org.opencontainers.image.* labels — only the legacy
# MAINTAINER — so these add rather than override. AGPL because the image carries
# Filestash verbatim and everything added here is licensed to match.
LABEL org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/rhiza-research/kenya-forecasts" \
      org.opencontainers.image.description="Public read-only file browser over the KMSA forecast bucket"

USER root
COPY --chown=1000:1000 app/config.json /app/config.json.tmpl
# A copy of the license travels with the artifact, per the OCI convention.
COPY --chown=1000:1000 LICENSE /licenses/LICENSE
# Staged outside /app/data because the deployment mounts an emptyDir there,
# which would mask anything baked into state/plugins. The entrypoint installs it.
COPY --from=plugin-build --chown=1000:1000 /branding.zip /app/plugin/branding.zip
COPY --chown=1000:1000 --chmod=0755 app/entrypoint.sh /app/entrypoint.sh
USER filestash

EXPOSE 8334
ENTRYPOINT ["/app/entrypoint.sh"]
