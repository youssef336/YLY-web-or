/** Bello wordmark / app logo. */
export function BelloLogo({ size = 42 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-600/30"
      style={{ width: size, height: size }}
    >
      <span className="font-black leading-none text-white" style={{ fontSize: size * 0.48 }}>
        B
      </span>
    </span>
  );
}