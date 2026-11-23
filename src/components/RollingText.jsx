export default function RollingText({ children }) {
  return (
    <>
      <span className="sr">{children}</span>
      <span className="roll" aria-hidden="true">
        <span data-text={children}>{children}</span>
      </span>
    </>
  );
}
