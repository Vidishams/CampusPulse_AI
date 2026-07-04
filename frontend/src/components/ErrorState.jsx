export default function ErrorState({ message, onRetry }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="error-text" style={{ marginBottom: onRetry ? 12 : 0 }}>
        {message || "Something went wrong loading this. Please try again."}
      </p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}
