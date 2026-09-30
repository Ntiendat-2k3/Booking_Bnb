export default function Container({ className = "", children }) {
  return (
    <div
      className={
        "site-container " + className
      }
    >
      {children}
    </div>
  );
}
