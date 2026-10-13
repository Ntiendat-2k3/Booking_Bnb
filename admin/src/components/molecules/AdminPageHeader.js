export default function AdminPageHeader({ icon: Icon, title, description, children }) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-heading">
        <span className="admin-page-icon" aria-hidden="true"><Icon size={25} strokeWidth={1.7} /></span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children ? <div className="admin-page-controls">{children}</div> : null}
    </div>
  );
}
