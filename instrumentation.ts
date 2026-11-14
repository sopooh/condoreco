import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { SeverityNumber } from '@opentelemetry/api-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

export const posthogLoggerProvider = key && host
  ? new LoggerProvider({
      resource: resourceFromAttributes({ 'service.name': 'condoreco' }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: new URL('/i/v1/logs', host).toString(),
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            timeoutMillis: 2000,
          }),
          exportTimeoutMillis: 2000,
        }),
      ],
    })
  : null

export const posthogLogger = posthogLoggerProvider?.getLogger('condoreco.posthog')
export { SeverityNumber }

export function register() {
  if (!posthogLoggerProvider && process.env.NODE_ENV !== 'production') {
    if (!key) {
      console.warn('NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured')
    }

    if (!host) {
      console.warn('NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured')
    }
  }
}
