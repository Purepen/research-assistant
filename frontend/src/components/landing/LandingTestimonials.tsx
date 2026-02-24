const REVIEW_PLATFORMS = [
  { name: 'Trustpilot', score: '4.9 / 5.0' },
  { name: 'Google',     score: '4.8 / 5.0' },
  { name: 'Sitejabber', score: '4.7 / 5.0' },
]

const TESTIMONIALS = [
  {
    name: 'Adaeze Okonkwo',
    uni: 'MSc Data Science · University of Manchester',
    text: '"I uploaded my guidelines on a Monday evening and had a supervisor-approved specification by Tuesday morning. ResearchAI understood every marking criterion."',
    color: '#16a34a',
    initials: 'AO',
  },
  {
    name: 'James Kowalski',
    uni: 'PhD Computer Science · Imperial College London',
    text: '"The live progress tracker is incredible — you can literally watch the AI building your spec. My supervisor said it was the most complete first draft she\'d seen in 10 years."',
    color: '#2563eb',
    initials: 'JK',
  },
  {
    name: 'Fatima Al-Rashid',
    uni: 'MSc Artificial Intelligence · UCL',
    text: '"I was struggling to narrow my topic for weeks. ResearchAI not only structured my spec perfectly but suggested a more novel angle I hadn\'t considered."',
    color: '#7c3aed',
    initials: 'FA',
  },
  {
    name: 'Liam Murphy',
    uni: 'MSc Cybersecurity · University of Edinburgh',
    text: '"The past project upload feature is a game changer. It picked up on the exact tone my university expects. My specification scored 97% on completeness."',
    color: '#dc2626',
    initials: 'LM',
  },
  {
    name: 'Ngozi Obiechina',
    uni: "PhD Biomedical Engineering · King's College",
    text: '"Worth every penny. I used to spend 3 weeks writing a specification — with ResearchAI it took 8 minutes. Better quality than anything I wrote manually."',
    color: '#d97706',
    initials: 'NO',
  },
]

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <div className="rai-testi-card">
      <div className="rai-testi-stars">★★★★★</div>
      <p className="rai-testi-text">{t.text}</p>
      <div className="rai-testi-author">
        <div className="rai-avatar" style={{ background: t.color }}>{t.initials}</div>
        <div>
          <div className="rai-testi-name">{t.name}</div>
          <div className="rai-testi-uni">{t.uni}</div>
        </div>
      </div>
    </div>
  )
}

export function LandingTestimonials() {
  return (
    <section className="rai-testimonials" id="testimonials">
      <div className="rai-container">
        <div className="rai-section-header">
          <span className="rai-tag">Student Reviews</span>
          <h2 className="rai-h2">What students are saying</h2>
          <p className="rai-section-sub">
            Thousands of postgraduate students used ResearchAI to get their specs approved first time.
          </p>
        </div>

        {/* Review platforms bar */}
        <div className="rai-reviews-bar">
          {REVIEW_PLATFORMS.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {i > 0 && <div className="rai-vdivider" />}
              <div className="rai-rp">
                <span className="rai-rp-name">{r.name}</span>
                <span className="rai-stars">★★★★★</span>
                <span className="rai-rp-score">{r.score}</span>
              </div>
            </div>
          ))}
          <div className="rai-vdivider" />
          <span style={{ fontSize: '0.85rem', color: '#4b6b4b', fontWeight: 600 }}>
            4,500+ verified reviews
          </span>
        </div>

        {/* First row — 3 cards */}
        <div className="rai-testi-grid">
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>

        {/* Second row — 2 cards centred */}
        <div className="rai-testi-grid-2">
          {TESTIMONIALS.slice(3).map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
