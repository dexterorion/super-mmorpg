export interface TelemetryEvent {
  readonly name: 'game_started' | 'action' | 'save' | 'error' | 'performance'
  readonly at: number
  readonly fields: Readonly<Record<string, string | number | boolean>>
}
export interface Exporter {
  export(event: TelemetryEvent): void
}
export class NoopExporter implements Exporter {
  export(event: TelemetryEvent): void {
    void event
  }
}
export class ConsoleExporter implements Exporter {
  export(event: TelemetryEvent): void {
    console.warn('[GAROA]', event)
  }
}
export class OtlpHttpExporter implements Exporter {
  constructor(private readonly endpoint: string) {}
  export(event: TelemetryEvent): void {
    void fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    timeUnixNano: `${event.at}000000`,
                    body: { stringValue: event.name },
                    attributes: Object.entries(event.fields).map(([key, value]) => ({
                      key,
                      value: { stringValue: String(value) },
                    })),
                  },
                ],
              },
            ],
          },
        ],
      }),
      keepalive: true,
    }).catch(() => undefined)
  }
}
export class EventBus {
  private readonly recentEvents: TelemetryEvent[] = []
  constructor(private readonly exporter: Exporter = new NoopExporter()) {}
  emit(event: TelemetryEvent): void {
    this.recentEvents.push(event)
    if (this.recentEvents.length > 20) this.recentEvents.shift()
    this.exporter.export(event)
  }
  recent(): readonly TelemetryEvent[] {
    return this.recentEvents
  }
}
