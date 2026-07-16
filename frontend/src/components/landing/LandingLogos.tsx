const UNIVERSITIES = [
  'University of Oxford',
  'Imperial College London',
  'UCL',
  'University of Manchester',
  "King's College London",
  'University of Edinburgh',
  'University of Birmingham',
  'Loughborough University',
  'University of Bristol',
  'University of Warwick',
]

export function LandingLogos() {
  // Duplicate array so the marquee loops seamlessly
  const all = [...UNIVERSITIES, ...UNIVERSITIES]

  return (
    <div className="rai-logos">
      <div className="rai-logos-inner">
        <span className="rai-logos-label">Built for students at universities like</span>
        <div className="rai-logos-scroll">
          <div className="rai-logos-track">
            {all.map((u, i) => (
              <span key={i} className="rai-logo-item">{u}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
