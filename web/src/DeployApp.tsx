import { useState } from "react";
import { LockKeyhole, CircleAlert, CircleCheck } from "lucide-react";
import { generateSecretKey } from "@privatepredict/api";
import { connectAndDeploy } from "./wallet/connect.js";
import { bytesToHex } from "./hex.js";
import { Brand } from "./components/Brand.js";

type DeployPhase = "idle" | "connecting" | "success" | "error";

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

  return (
    <main className="deploy-app">
      <Brand />
      <h1>Deploy a PredictionBoard match</h1>
      <p className="deploy-callout">
        <CircleAlert aria-hidden="true" size={18} /> Organizer tooling only —
        not part of the participant app. One deployment represents exactly one
        match.
      </p>

      {phase !== "success" && (
        <>
          <div className="deploy-field">
            <label htmlFor="teamA">Home team</label>
            <input
              id="teamA"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              disabled={phase === "connecting"}
            />
          </div>
          <div className="deploy-field">
            <label htmlFor="teamB">Away team</label>
            <input
              id="teamB"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              disabled={phase === "connecting"}
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
              <LockKeyhole aria-hidden="true" size={16} /> Generated match ID:{" "}
              <code>{bytesToHex(matchId)}</code>
            </p>
            <p>
              <LockKeyhole aria-hidden="true" size={16} /> Generated organizer
              secret key: <code>{bytesToHex(organizerSecretKey)}</code>
            </p>
            <p className="deploy-callout">
              Save this secret key now. It lives only in this browser tab's
              memory — it is never sent anywhere, and it does not survive a page
              reload. You will need it again to close the match and publish the
              result later; without it, this deployment cannot be administered.
            </p>
          </div>

          <button type="button" onClick={handleDeploy} disabled={!canDeploy}>
            {phase === "connecting"
              ? "Connecting wallet…"
              : "Connect Wallet & Deploy"}
          </button>

          {phase === "error" && error && (
            <p role="alert" className="deploy-error">
              <CircleAlert aria-hidden="true" size={18} /> {error}
            </p>
          )}
        </>
      )}

      {phase === "success" && result && (
        <div className="deploy-success">
          <p>
            <CircleCheck aria-hidden="true" size={18} /> Match deployed.
          </p>
          <p>Save both of these now — neither is recoverable if lost:</p>
          <dl>
            <dt>Contract address (set as VITE_PREDICTION_BOARD_ADDRESS)</dt>
            <dd>
              <code>{result.contractAddress}</code>
            </dd>
            <dt>Organizer secret key</dt>
            <dd>
              <code>{bytesToHex(organizerSecretKey)}</code>
            </dd>
          </dl>
        </div>
      )}
    </main>
  );
}
