// components/live/service-down.tsx — one honest "can't reach the backend" hint.
//
// The four engine services split two ways, and the fix differs by which:
//   • REMOTE (need the SSH tunnel): artifact-catalog :8102, data-catalog :8101
//   • LOCAL  (just a process):      agent-runtime :8104, research-workbench :8105
// A hint that names a tunnel for a local service (or forwards the wrong port)
// sends you chasing the wrong fix — so the message says exactly which lane.

// Both remote-only services in one forward; `ingest` resolves via ~/.ssh/config.
const TUNNEL_CMD =
  "ssh -fN -L 8101:localhost:8101 -L 8102:localhost:8102 ingest";

export function ServiceDown({
  service,
  port,
  error,
  reach,
}: {
  service: string;
  port: number;
  error: string;
  reach: "tunnel" | "local";
}) {
  return (
    <p className="mt-10 text-ui text-clay">
      Could not reach {service} (:{port}):{" "}
      <span className="font-mono text-meta">{error}</span>
      <br />
      <span className="text-muted">
        {reach === "tunnel" ? (
          <>
            Is the SSH tunnel up?{" "}
            <span className="font-mono text-meta">{TUNNEL_CMD}</span>
          </>
        ) : (
          <>
            Is {service} running locally on :{port}?
          </>
        )}
      </span>
    </p>
  );
}
