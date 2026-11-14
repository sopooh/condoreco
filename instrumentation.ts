import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
const missingVariable = key ? 'NEXT_PUBLIC_POSTHOG_HOST' : 'NEXT_PUBLIC_POSTHOG_KEY'

if ((!key || !host) && process.env.NODE_ENV !== 'production') {
  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}

export const posthogLoggerProvider = key && host
  ? new LoggerProvider({
      resource: resourceFromAttributes({ 'service.name': 'condoreco-web' }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
          }),
        }),
      ],
    })
  : undefined

// This dedicated logger intentionally does not attach the exporter to existing app loggers.
export const posthogLogger = posthogLoggerProvider?.getLogger('condoreco-posthog')

export function register() {
  // Next.js 16 enables instrumentation by default. The dedicated provider is used directly.
}
