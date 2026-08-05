# kenya-forecasts

A public, read-only file browser over `gs://kenya-forecasting-data`, the bucket
of Kenya Meteorological Service Authority forecast products. It is the place KMSA
sends the public to download forecasts. No login, no upload, no delete.

Live at <https://kenya-forecasts.sheerwater.rhizaresearch.org>.

## What this repo builds

A container image on top of upstream Filestash
(`machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a`;
upstream ships only a rolling `latest`, hence the digest). The `Dockerfile` sits
at the root and builds from the repo root. `app/` holds the runtime config;
`app/plugin/` is the plugins directory, with one plugin per subdirectory.

- `app/config.json` — the Filestash config with `__TOKEN__` placeholders for the
  four secrets, the public host, `S3_ENDPOINT` (defaulted by the entrypoint to
  the GCS XML API) and `S3_BUCKET` (a bare bucket name; the entrypoint adds the
  leading slash that roots the browse tree at the bucket).
- `app/entrypoint.sh` — validates the five environment values, substitutes them
  into `/app/data/state/config/config.json`, installs the plugin zip into
  `/app/data/state/plugins/`, and execs Filestash. Both writes happen at runtime
  because `/app/data` is an emptyDir that masks whatever the image put there.

Branding ships as a Filestash plugin, a self-contained artifact Filestash loads
on its own. The build packs `app/plugin/branding/` verbatim into a flat
`branding.zip` — the directory name, the zip name and the plugin name Filestash
registers are all `branding`, since Filestash takes the plugin name from the
zip's basename. Filestash discovers zips in `state/plugins/` at startup and
registers the modules the manifest names.

- `manifest.json` — `author`, `version` and three modules, `css`, `favicon` and
  `patch`.
- `index.js` — builds the header, the pilot band, the links band and the footer,
  and marks the listing row named for the current date. Filestash serves it from
  inside the zip at `/assets/<BUILD_REF>/plugin/branding.zip/index.js`, so
  `import.meta.url` resolves sibling assets and the logo is a plain `img`.
- `branding.patch` — a one line insertion into
  `public/assets/boot/ctrl_boot_frontoffice.js` that imports `index.js`. The
  frontoffice HTML is out of reach because `ServeIndex` never calls `applyPatch`,
  and this boot module is in the preload list so it runs on every page load. Both
  serve paths patch it, `ServeFile` per request and `ServeBundle` once at startup.
- `branding.css` — layout, color and the rules hiding the write controls, which
  fail at GCS anyway. No text: the copy lives in `index.js`.
- `kmsa-logo.jpg` — 330x128, cropped to the mark. Placeholder for the real KMSA
  asset; replacing the file is enough.
- `kmsa-favicon.png` — 128x128, the crest on white. PNG because the favicon hook
  sniffs only ICO, PNG and GIF magic bytes and labels anything else
  `image/svg+xml`, which no browser will render for a JPEG.

`applyPatch` returns nil on every failure path and its caller then serves the
unpatched original, so a patch that stops applying after a base image bump would
drop the branding without an error. The `validate` job in the build workflow is
the detector: it starts the image, fails if the injected import is absent from
the boot module, and only then does the build publish.

Anonymous read-only access comes from a GCS HMAC key held by a service account
with `roles/storage.objectViewer` on the bucket and nothing else.

## Run locally

Against the real bucket, which needs an HMAC key:

```sh
cp .env.example .env      # fill in the HMAC key, secret key and bcrypt hash
docker compose up --build
```

Then open <http://localhost:8334>.

Without any credential, against a minio stand-in for the bucket:

```sh
docker compose -f compose.local.yaml up -d --build
```

That stack publishes no port. `general.host` has to match the request `Host`,
and the service name is what the `validate` job addresses.

## Deploy

Push to `main`. `.github/workflows/build.yml` builds and pushes
`ghcr.io/rhiza-research/kenya-forecasts`, writes the commit sha into
`chart/values.yaml`, and force-updates the `deploy` branch. ArgoCD watches
`chart/` on `deploy` and syncs it to GKE. The namespace, service account, bucket
IAM, HMAC key, generated secrets, DNS record and the ArgoCD Application itself
are Terraform, in `infrastructure/terraform/20-gke-cluster/kenya-forecasts.tf`.

The Ingress returns 404 for `/admin`, so the admin console
is reachable only when running locally; production settings are baked into
`app/config.json` rather than clicked in.

## License

Copyright 2026 Rhiza Research. AGPL-3.0-only; the full text is in `LICENSE`, and
a copy ships in the image at `/licenses/LICENSE`.

The image contains upstream [Filestash](https://github.com/mickael-kerjean/filestash)
verbatim, which is AGPL-3.0. The corresponding source for that part is the base
image this repo builds on,
`machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a`.
