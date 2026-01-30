export default function Container({ className = "", children }) {
  return (
    <div
      className={
        "mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 " + className
      }
    >
      {children}
    </div>
  );
}
