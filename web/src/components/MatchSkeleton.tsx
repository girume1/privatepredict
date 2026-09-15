/**
 * Shown while the wallet is connected but derivedState hasn't arrived yet
 * from the ledger. Gives the user a sense of progress rather than an abrupt
 * empty state.
 */
export function MatchSkeleton() {
  return (
    <div
      className="match-skeleton"
      aria-busy="true"
      aria-label="Loading match data"
    >
      <div className="skeleton skeleton--timeline" />
      <div
        className="skeleton skeleton--title"
        style={{ width: "70%", height: "3rem", marginBottom: "0.5rem" }}
      />
      <div
        className="skeleton skeleton--title"
        style={{ width: "40%", height: "1rem" }}
      />
      <div
        className="skeleton skeleton--card"
        style={{ marginTop: "1.5rem" }}
      />
      <div className="skeleton skeleton--card" style={{ height: "5rem" }} />
    </div>
  );
}
