"use client";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBlock({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState("");
  useEffect(() => setStatus(""), [text]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Clipboard unavailable. Select and copy the text below.");
    }
  }
  return (
    <div className="copy-block">
      <div className="section-heading">
        <h3>{title}</h3>
        <button type="button" className="button small secondary" onClick={copy}>
          {status === "Copied" ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          Copy {title.toLowerCase()}
        </button>
      </div>
      <pre tabIndex={0}>{text}</pre>
      <span className="caption" role="status">
        {status}
      </span>
    </div>
  );
}
