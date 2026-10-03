export default function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code-window my-5 p-5 font-mono text-[13px] leading-relaxed text-paper-300 shadow-lift">
      <code>{code}</code>
    </pre>
  );
}
