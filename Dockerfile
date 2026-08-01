# Upstream publishes only a rolling `latest`, so the base is pinned by digest.
FROM machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a AS plugin-build

# The base is debian:stable-slim, so coreutils gives base64 and sed, but zip is
# not installed. Adding it to a throwaway stage keeps the runtime image as
# upstream shipped it and avoids introducing a second base image.
USER root
RUN apt-get update > /dev/null && \
    apt-get install -y --no-install-recommends zip > /dev/null && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /plugin
COPY app/plugin/branding/ ./

# Inline the logo, then pack the plugin.
#
# extension.Discovery compares the zip entry name against manifest.json and each
# module entrypoint literally, so the archive has to be flat. The shell expands
# the glob to bare filenames in this directory and zip stores them as given;
# recursing a directory instead would prefix every entry with its name and
# nothing would resolve. The archive is written outside the directory so it
# cannot match its own glob, and kmsa-logo.jpg is excluded because it is a build
# input whose only output is the base64 already inside the stylesheet.
#
# The replacement is base64, which contains no ampersand or pipe, so it is safe
# both as a sed replacement and against the pipe delimiter.
RUN set -eu; \
    n="$(grep -o __KMSA_LOGO_DATA_URI__ branding.css | wc -l)"; \
    if [ "$n" -ne 1 ]; then \
        echo "build: branding.css must contain the logo placeholder exactly once, found $n" >&2; \
        echo "build: sed replaces every occurrence, so a stray mention in a comment" >&2; \
        echo "build: inlines the whole image again" >&2; \
        exit 1; \
    fi; \
    uri="data:image/jpeg;base64,$(base64 -w0 kmsa-logo.jpg)"; \
    sed -i -e "s|__KMSA_LOGO_DATA_URI__|$uri|" branding.css; \
    if grep -q __KMSA_LOGO_DATA_URI__ branding.css; then \
        echo "build: logo placeholder survived substitution" >&2; exit 1; \
    fi; \
    zip -q /branding.zip * -x kmsa-logo.jpg

FROM machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a

USER root
COPY --chown=1000:1000 app/config.json /app/config.json.tmpl
# Staged outside /app/data because the deployment mounts an emptyDir there,
# which would mask anything baked into state/plugins. The entrypoint installs it.
COPY --from=plugin-build --chown=1000:1000 /branding.zip /app/plugin/branding.zip
COPY --chown=1000:1000 --chmod=0755 app/entrypoint.sh /app/entrypoint.sh
USER filestash

EXPOSE 8334
ENTRYPOINT ["/app/entrypoint.sh"]
