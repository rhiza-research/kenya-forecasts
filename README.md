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
  four secrets, the public host and `S3_BUCKET` (a bare bucket name; the
  entrypoint adds the leading slash that roots the browse tree at the bucket).
- `app/entrypoint.sh` — validates the five environment values, substitutes them
  into `/app/data/state/config/config.json`, installs the plugin zip into
  `/app/data/state/plugins/`, and execs Filestash. Both writes happen at runtime
  because `/app/data` is an emptyDir that masks whatever the image put there.

Branding ships as a Filestash plugin, a self-contained artifact Filestash loads
on its own. The build packs `app/plugin/branding/` into a flat `branding.zip` —
the directory name, the zip name and the plugin name Filestash registers are all
`branding`, since Filestash takes the plugin name from the zip's basename.
Filestash discovers zips in `state/plugins/` at startup and registers the `css`
and `favicon` modules the manifest names.

- `manifest.json` — `author`, `version` and the two modules.
- `branding.css` — the KMSA banner and the rules hiding the write controls,
  which fail at GCS anyway. Its logo placeholder is replaced at build time with
  base64 from `kmsa-logo.jpg`. The logo has to be inlined because Filestash
  reads only module entrypoints out of the zip and never serves the other
  entries, so a relative `url()` would 404. The build fails unless the
  placeholder appears exactly once: `sed` replaces every occurrence, so a second
  mention in a comment inlines the whole image twice.
- `kmsa-logo.jpg` — 330x128, cropped to the mark. Placeholder for the real KMSA
  asset; replacing it is enough, the build re-inlines it. Not packed into the
  zip; only its base64 is, inside the stylesheet.
- `kmsa-favicon.png` — 128x128, the crest on white. PNG because the favicon hook
  sniffs only ICO, PNG and GIF magic bytes and labels anything else
  `image/svg+xml`, which no browser will render for a JPEG.

Anonymous read-only access comes from a GCS HMAC key held by a service account
with `roles/storage.objectViewer` on the bucket and nothing else.

## Run locally

```sh
cp .env.example .env      # fill in the HMAC key, secret key and bcrypt hash
docker compose up         # runs the published image
docker compose up --build # rebuilds it from the Dockerfile
```

Then open <http://localhost:8334>.

## Deploy

Push to `main`. `.github/workflows/build.yml` builds and pushes
`ghcr.io/rhiza-research/kenya-forecasts`, writes the commit sha into
`chart/values.yaml`, and force-updates the `deploy` branch. ArgoCD watches
`chart/` on `deploy` and syncs it to GKE. The namespace, service account, bucket
IAM, HMAC key, generated secrets, DNS record and the ArgoCD Application itself
are Terraform, in `infrastructure/terraform/20-gke-cluster/kenya-forecasts.tf`.

The Ingress returns 404 for `/admin` and `/api/files/zip`, so the admin console
is reachable only when running locally; production settings are baked into
`app/config.json` rather than clicked in.

## License

Copyright 2026 Rhiza Research. AGPL-3.0-only; the full text is in `LICENSE`, and
a copy ships in the image at `/licenses/LICENSE`.

The image contains upstream [Filestash](https://github.com/mickael-kerjean/filestash)
verbatim, which is AGPL-3.0. The corresponding source for that part is the base
image this repo builds on,
`machines/filestash@sha256:f24de790b8828f66807c9097e48add1e846ca0cd2d3a936b3c3e845024e4fe9a`.

## Outstanding

- The S3 signing region is `us`, unverified against live GCS. If listing fails
  with a signature or region error, try `auto` and then `us-east-1`.
- `app/plugin/branding/kmsa-logo.jpg` is a low-resolution placeholder.
- The emptyDir `sizeLimit` is a containment bound, not a measurement: Filestash
  copies a whole object into `/app/data/cache` to answer a Range request, and
  the bucket's largest object is not yet known.
