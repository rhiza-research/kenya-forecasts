{{/*
Expand the name of the chart.
*/}}
{{- define "kenya-forecasts.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "kenya-forecasts.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kenya-forecasts.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kenya-forecasts.labels" -}}
helm.sh/chart: {{ include "kenya-forecasts.chart" . }}
{{ include "kenya-forecasts.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kenya-forecasts.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kenya-forecasts.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
An Ingress rule with no host becomes a cluster-wide catch-all on the shared
nginx controller, so refuse to render without one.
*/}}
{{- define "kenya-forecasts.host" -}}
{{- required "host is required: an Ingress rule with no host becomes a catch-all on the shared nginx controller" .Values.host }}
{{- end }}
