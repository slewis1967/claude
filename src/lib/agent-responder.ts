import type { AgentId } from "./agents";

// Local, themed responders for the non-live agents. Each has a small voice and
// keyword-aware replies so the chat feels alive. Swap any of these for a real
// API route (mirroring /api/claude) to make that agent truly live.

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const n = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

export function respond(id: AgentId, prompt: string): string {
  const p = prompt.toLowerCase();

  if (/\b(status|health|how are you|queue)\b/.test(p)) {
    return statusLine(id);
  }
  if (/\b(help|what can you|capabilities|commands)\b/.test(p)) {
    return helpLine(id);
  }

  switch (id) {
    case "openclaw":
      if (/\bcrawl|scrape|fetch|url|http|\.com|domain\b/.test(p))
        return `Crawl dispatched across ${n(8, 60)} domains. Streaming results now — ${n(120, 900)} pages queued, ${n(20, 80)} extracted so far. I'll index everything into the warehouse and ping you when it's complete.`;
      if (/\bextract|price|data\b/.test(p))
        return `Extraction running. I found ${n(12, 240)} structured records across the target pages and normalized them into JSON. Want me to dedupe and export to CSV?`;
      if (/\bschedule|daily|recurring\b/.test(p))
        return `Scheduled. I'll run this crawl every 24h at 03:00 UTC and diff the results, alerting you only when something changes. Job id #${n(1000, 9999)}.`;
      return pick([
        `On it — spinning up a worker pool for "${prompt}". ${n(3, 12)} crawlers allocated.`,
        `Got it. Indexing target set now; ETA ~${n(2, 9)} minutes.`,
      ]);

    case "hermes":
      if (/\bsend|announce|blast|broadcast|email|message\b/.test(p))
        return `Message routed ✦ Delivered to ${n(120, 4200).toLocaleString()} recipients across email + Slack with a ${(99 + Math.random()).toFixed(1)}% delivery rate. ${n(0, 3)} soft bounces retried automatically.`;
      if (/\bdraft|write|compose\b/.test(p))
        return `Here's a draft:\n\n"Big news — we just shipped something we think you'll love. Tap in and let us know what you think." \n\nWant it warmer, shorter, or more formal? I can send the moment you approve.`;
      if (/\bslack\b/.test(p))
        return `Posted to #general and #announcements. Threaded a summary and pinned it. Reactions are already rolling in 🎉`;
      if (/\bsms|alert|text\b/.test(p))
        return `SMS alert configured. I'll text you within ${n(2, 8)}s of any trigger — routed through the fastest carrier path.`;
      return pick([
        `Routing "${prompt}" now — picking the lowest-latency channel.`,
        `Done. Message is in flight, delivery confirmation incoming.`,
      ]);

    case "atlas":
      if (/\bdeploy|ship|release|rollout\b/.test(p))
        return `Deploy pipeline triggered 🚀 Building → testing → rolling out to ${n(3, 16)} nodes with a canary at 10%. Health checks green so far. I'll auto-rollback if error rate crosses 1%.`;
      if (/\bscale\b/.test(p))
        return `Scaling now — provisioning additional nodes and rebalancing traffic. Target reached in ~${n(40, 120)}s. CPU headroom looks comfortable.`;
      if (/\bmonitor|utilization|resource|metrics\b/.test(p))
        return `Current fleet: CPU ${n(28, 62)}% · memory ${n(35, 70)}% · ${n(6, 24)} healthy nodes · 0 alerts. p99 latency ${n(40, 180)}ms. Everything nominal.`;
      if (/\brollback|revert|undo\b/.test(p))
        return `Rolling back to the previous stable release. Traffic draining from the bad version now — full restore in ~${n(20, 60)}s. Post-mortem draft started.`;
      return pick([
        `Acknowledged. Orchestrating "${prompt}" across the cluster.`,
        `On it — infrastructure change queued with a safe rollout strategy.`,
      ]);

    case "orion":
      if (/\bquery|revenue|sql|select|data\b/.test(p))
        return `Query executed — scanned ${n(10000, 900000).toLocaleString()} rows in ${(Math.random() * 2 + 0.2).toFixed(2)}s. Top result: revenue up ${n(4, 23)}% MoM, led by the ${pick(["EMEA", "APAC", "Americas"])} region. Want this as a chart?`;
      if (/\bforecast|predict|projection|trend\b/.test(p))
        return `Forecast ready. Model projects ${n(8, 35)}% growth next quarter (±${n(2, 6)}% at 95% CI), assuming current trajectory holds. Key driver: organic signups. I can break it down by cohort.`;
      if (/\breport|kpi|dashboard\b/.test(p))
        return `Report compiled 📊 7 KPIs, week-over-week deltas, and 3 anomalies flagged. Rendered to PDF and the live dashboard. Scheduling a weekly send every Monday 9am?`;
      if (/\bpipeline\b/.test(p))
        return `Pipeline health: ${n(12, 40)} jobs green, 0 failed, freshness lag ${n(1, 9)} min. Last full ETL completed ${n(5, 50)} min ago. All sources in sync.`;
      return pick([
        `Crunching "${prompt}" — querying the warehouse now.`,
        `On it. Pulling the numbers and checking for anomalies.`,
      ]);

    default:
      return `Acknowledged: "${prompt}".`;
  }
}

function statusLine(id: AgentId): string {
  const map: Record<AgentId, string> = {
    claude: "All systems nominal — reasoning core warm and ready.",
    openclaw: `All workers healthy · queue depth ${n(0, 6)} · ${n(40000, 90000).toLocaleString()} pages indexed today.`,
    hermes: `Relay green · ${(99 + Math.random()).toFixed(2)}% delivery · ${n(200, 5000).toLocaleString()} messages sent today.`,
    atlas: `Cluster healthy · ${n(6, 24)} nodes · 0 alerts · last deploy ${n(5, 90)} min ago.`,
    orion: `Pipelines green · freshness ${n(1, 9)} min · ${n(12, 48)} models live.`,
  };
  return map[id];
}

function helpLine(id: AgentId): string {
  const map: Record<AgentId, string> = {
    claude: "I can reason, write and run code, use tools, and work over long context. Just ask.",
    openclaw: "I crawl, extract, index, and schedule. Try: crawl a URL, extract data, or schedule a recurring job.",
    hermes: "I send and route messages over email, Slack, and SMS. Try: send an announcement, draft a message, or set an alert.",
    atlas: "I deploy, scale, monitor, and roll back infrastructure. Try: deploy to prod, scale a service, or check utilization.",
    orion: "I query data, forecast trends, and build reports. Try: query revenue, forecast signups, or build a KPI report.",
  };
  return map[id];
}
