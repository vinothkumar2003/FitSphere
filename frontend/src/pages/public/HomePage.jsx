import "./HomePage.css";
import PageTitle from "../../components/PageTitle";
import PublicNavbar from "../../components/PublicNavbar";

const homeStats = [
  {
    icon: "[]",
    value: "24",
    lines: ["guided", "workout plans"],
  },
  {
    icon: "+",
    value: "12",
    lines: ["nutrition and habit", "tracking tools"],
    iconClassName: "home-stat-icon home-stat-icon-plus",
  },
  {
    icon: "o",
    value: "1",
    lines: ["connected", "fitness journey"],
  },
];

export const Home = ({ title }) => {
  return (<>
      <PublicNavbar/>
    <main className="home-page-shell" aria-label={title}>
      <PageTitle title={title} />
      <section className="home-hero-section">
        <div className="home-hero-glow home-hero-glow-left" aria-hidden="true" />
        <div className="home-hero-glow home-hero-glow-right" aria-hidden="true" />

        <div className="container position-relative text-center home-hero-content">
          <span className="badge rounded-pill home-hero-badge px-4 py-2 mb-4">
            Train Smarter
          </span>

          <h1 className="display-3 fw-semibold text-white mb-4 lh-tight">
            Build Your{" "}
            <span className="home-gradient-text">FitSphere</span>
          </h1>

          <p className="lead home-hero-copy mx-auto mb-5">
            FitSphere brings workouts, progress tracking, and daily motivation
            into one focused space so members, trainers, and admins stay in
            sync.
          </p>

          <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3 mb-4 home-hero-meta">
            <div className="d-flex align-items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="me-2 home-meta-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 3v1h14V3a1 1 0 0 0-1-1h-1v.5a.5.5 0 0 1-1 0V2h-8v.5a.5.5 0 0 1-1 0V2H2a1 1 0 0 0-1 1zm14 2H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z" />
                <rect width="2" height="2" x="11" y="7" rx=".5" />
              </svg>
              <span>Plans, classes, and progress in one place</span>
            </div>

            <div className="d-flex align-items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="me-2 home-meta-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
              </svg>
              <span>Built for gyms, trainers, and members</span>
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            <a href="/login" className="btn btn-light btn-lg px-5 shadow-sm">
              Get Started
            </a>
            <a href="#home-stats" className="btn btn-outline-light btn-lg px-5">
              Explore Features
            </a>
          </div>
        </div>

        <div className="home-scroll-indicator" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      <section id="home-stats" className="home-stats-section">
        <div className="container home-stats-wrap">
          <div className="home-stats-card">
            {homeStats.map((stat) => (
              <div className="home-stat-item" key={`${stat.icon}-${stat.value}`}>
                <div className={stat.iconClassName ?? "home-stat-icon"}>
                  {stat.icon}
                </div>
                <div className="home-stat-content">
                  <div className="home-stat-number">{stat.value}</div>
                  <div className="home-stat-details">
                    <span>{stat.lines[0]}</span>
                    <span>{stat.lines[1]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
              </>
  );
};

export default Home;
