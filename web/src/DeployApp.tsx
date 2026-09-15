import { useState, useCallback } from "react";
import {
  LockKeyhole,
  TriangleAlert,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";
import { generateSecretKey } from "@privatepredict/api";
import { connectAndDeploy } from "./wallet/connect.js";
import { bytesToHex } from "./hex.js";
import { Brand } from "./components/Brand.js";

type DeployPhase = "idle" | "connecting" | "success" | "error";

/**
 * Copies text to the clipboard and returns a "just copied" signal for 2s.
 */
function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return [copied, copy];
}

/**
 * Organizer-only deployment tool — a separate entry point (deploy.html),
 * not part of the participant-facing app (index.html/App.tsx). Deploying a
 * match means deploying a new contract instance; there is still no
 * `createMatch` circuit and no deploy path inside the participant app.
 */
export function DeployApp() {
  const [matchId] = useState(() => generateSecretKey());
  const [organizerSecretKey] = useState(() => generateSecretKey());
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [deadline, setDeadline] = useState("");
  const [phase, setPhase] = useState<DeployPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    walletAddress: string;
    contractAddress: string;
  } | null>(null);

  const [keyCopied, copyKey] = useCopy();
  const [contractCopied, copyContract] = useCopy();
  const [resultKeyCopied, copyResultKey] = useCopy();

  const canDeploy =
    teamA.trim() !== "" &&
    teamB.trim() !== "" &&
    deadline !== "" &&
    phase !== "connecting";

  async function handleDeploy() {
    setPhase("connecting");
    setError(null);
    try {
      const networkId = import.meta.env.VITE_NETWORK_ID;
      if (!networkId) {
        throw new Error("VITE_NETWORK_ID must be configured.");
      }
      const deadlineSeconds = BigInt(
        Math.floor(new Date(deadline).getTime() / 1000),
      );
      const deployment = await connectAndDeploy(
        networkId,
        matchId,
        teamA.trim(),
        teamB.trim(),
        deadlineSeconds,
        organizerSecretKey,
      );
      setResult(deployment);
      setPhase("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  const orgKeyHex = bytesToHex(organizerSecretKey);

  return (
    <main className="deploy-app">
      <Brand />
      <h1>Deploy a match</h1>

      <div className="deploy-callout">
        <TriangleAlert aria-hidden="true" size={16} />
        Organizer tooling only — not part of the participant app. One deployment
        represents exactly one match.
      </div>

      {phase !== "success" && (
        <>
          <div className="deploy-field">
            <label htmlFor="teamA">Home team</label>
            <input
              id="teamA"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              disabled={phase === "connecting"}
              placeholder="e.g. Arsenal"
            />
          </div>
          <div className="deploy-field">
            <label htmlFor="teamB">Away team</label>
            <input
              id="teamB"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              disabled={phase === "connecting"}
              placeholder="e.g. Chelsea"
            />
          </div>
          <div className="deploy-field">
            <label htmlFor="deadline">Submission deadline</label>
            <input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={phase === "connecting"}
            />
          </div>

          <div className="deploy-generated">
            <p>
              <LockKeyhole aria-hidden="true" size={14} />
              Generated match ID: <code>{bytesToHex(matchId)}</code>
            </p>
            <div className="deploy-generated-key-row">
              <p style={{ flex: 1, margin: 0 }}>
                <LockKeyhole aria-hidden="true" size={14} />
                Generated organizer secret key: <code>{orgKeyHex}</code>
              </p>
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyKey(orgKeyHex)}
                aria-label="Copy organizer secret key"
                title={keyCopied ? "Copied!" : "Copy to clipboard"}
              >
                {keyCopied ? (
                  <Check aria-hidden="true" size={14} />
                ) : (
                  <Copy aria-hidden="true" size={14} />
                )}
                {keyCopied ? "Copied" : "Copy key"}
              </button>
            </div>
            <div className="deploy-callout" style={{ marginTop: "0.75rem" }}>
              <TriangleAlert aria-hidden="true" size={14} />
              Save this secret key now. It lives only in this browser tab&apos;s
              memory and does not survive a page reload. You need it to close
              the match and publish the result.
            </div>
          </div>

          <button type="button" onClick={handleDeploy} disabled={!canDeploy}>
            {phase === "connecting"
              ? "Connecting wallet…"
              : "Connect Wallet & Deploy"}
          </button>

          {phase === "error" && error && (
            <p
              role="alert"
              className="deploy-error"
              style={{ marginTop: "0.75rem" }}
            >
              <TriangleAlert aria-hidden="true" size={16} /> {error}
            </p>
          )}
        </>
      )}

      {phase === "success" && result && (
        <div className="deploy-success">
          <p>
            <CheckCircle aria-hidden="true" size={16} />
            Match deployed successfully
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontWeight: 400,
              fontSize: "0.875rem",
              marginBottom: "0.5rem",
            }}
          >
            Save both of these now — neither is recoverable if lost:
          </p>
          <dl>
            <dt>Contract address (set as VITE_PREDICTION_BOARD_ADDRESS)</dt>
            <dd className="deploy-success-copy-row">
              <code>{result.contractAddress}</code>
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyContract(result.contractAddress)}
                aria-label="Copy contract address"
                title={contractCopied ? "Copied!" : "Copy to clipboard"}
              >
                {contractCopied ? (
                  <Check aria-hidden="true" size={14} />
                ) : (
                  <Copy aria-hidden="true" size={14} />
                )}
                {contractCopied ? "Copied" : "Copy"}
              </button>
            </dd>
            <dt>Organizer secret key</dt>
            <dd className="deploy-success-copy-row">
              <code>{orgKeyHex}</code>
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyResultKey(orgKeyHex)}
                aria-label="Copy organizer secret key"
                title={resultKeyCopied ? "Copied!" : "Copy to clipboard"}
              >
                {resultKeyCopied ? (
                  <Check aria-hidden="true" size={14} />
                ) : (
                  <Copy aria-hidden="true" size={14} />
                )}
                {resultKeyCopied ? "Copied" : "Copy"}
              </button>
            </dd>
          </dl>
        </div>
      )}
    </main>
  );
}
