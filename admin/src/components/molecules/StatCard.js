export default function StatCard({ icon: Icon, label, value, tone = "green" }) {
  return (
    <div className={`admin-stat-card admin-stat-${tone}`}>
      <span className="admin-stat-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span>
      <div>
        <span className="admin-stat-label">{label}</span>
        <strong className="admin-stat-value">{value}</strong>
      </div>
    </div>
  );
}
