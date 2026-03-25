import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

const presets = {
  "400": {
    headline: "Bad Request.",
    text: "The request does not look valid. Check the URL or try again.",
  },
  "401": {
    headline: "Unauthorized.",
    text: "You need permission to access this area.",
  },
  "403": {
    headline: "Access Denied.",
    text: "You do not have permission to view this page.",
  },
  "404": {
    headline: "Page Not Found.",
    text: "This page does not exist in FitSphere. It may have been moved or removed.",
  },
  "500": {
    headline: "Server Error.",
    text: "Something broke on the server. Please try again shortly.",
  },
  "503": {
    headline: "Service Unavailable.",
    text: "The service is temporarily offline, likely during maintenance or restart.",
  },
};

const fallback = {
  headline: "Something went wrong.",
  text: "An unexpected error occurred. If it happens again, please contact support.",
};

const topbarStyle = {
  padding: "16px 20px",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  opacity: 0.9,
};

const wrapperStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px 60px",
};

const buttonBaseStyle = {
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const NotFoundPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const code = searchParams.get("code") || "404";
  const customMessage = searchParams.get("message");
  const preset = presets[code] || fallback;
  const headline = customMessage || preset.headline;

  useEffect(() => {
    document.title = `Error ${code} - FitSphere`;
  }, [code]);

  return (
    <main
      style={{
        margin: 0,
        background: "#000",
        color: "#fff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={topbarStyle}>FitSphere · Error</div>

      <section style={wrapperStyle}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <div style={{ fontSize: "clamp(52px, 9vw, 96px)", fontWeight: 800, marginBottom: 12 }}>
            {code}
          </div>
          <div style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, marginBottom: 18 }}>
            {headline}
          </div>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 32, maxWidth: 520 }}>
            {preset.text}
          </p>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", opacity: 0.8, marginBottom: 26 }}>
            {`Code ${code} · URL: ${location.pathname || "/"}`}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link
              to="/"
              style={{
                ...buttonBaseStyle,
                background: "#fff",
                color: "#000",
                border: "none",
              }}
            >
              Back to Home
            </Link>

            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                ...buttonBaseStyle,
                background: "transparent",
                color: "#fff",
                border: "1px solid #333",
              }}
            >
              Go Back
            </button>

            <a
              href="mailto:support@fitsphere.com?subject=FitSphere Error Report"
              style={{
                ...buttonBaseStyle,
                background: "transparent",
                color: "#fff",
                border: "1px solid #333",
              }}
            >
              Report Issue
            </a>
          </div>
        </div>
      </section>

      <footer style={{ padding: "14px 20px 20px", fontSize: 12, color: "rgba(255,255,255,0.65)", opacity: 0.8 }}>
        © {new Date().getFullYear()} FitSphere · All rights reserved.
      </footer>
    </main>
  );
};

export default NotFoundPage;
