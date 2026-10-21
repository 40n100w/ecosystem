import {
  Cpu,
  Infinity,
  Layers3,
  Box,
  Sparkles,
  BookOpen,
  Cloud,
  Code2,
} from "lucide-react";

export function AtlasMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="20"
        cy="20"
        rx="16"
        ry="8.5"
        transform="rotate(-45 20 20)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <ellipse
        cx="20"
        cy="20"
        rx="16"
        ry="8.5"
        transform="rotate(45 20 20)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}

export default function BrandMark({ entity, className = "" }) {
  const { id, initials, color, category } = entity;
  let content;
  if (id === "openai" || id === "gpt" || id === "chatgpt") {
    content = (
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <rect
              key={i}
              x="13"
              y="4"
              width="10"
              height="20"
              rx="5"
              transform={`rotate(${i * 60} 18 18)`}
            />
          ))}
        </g>
      </svg>
    );
  } else if (id === "anthropic" || id === "claude") {
    content = (
      <span className="anthropic-mark">
        A<span>ı</span>
      </span>
    );
  } else if (
    id === "google-deepmind" ||
    id === "gemini" ||
    id === "google-vertex-ai" ||
    id === "google-tpu"
  ) {
    content =
      id === "gemini" ? <Sparkles /> : <span className="google-mark">G</span>;
  } else if (id === "meta" || id === "llama") {
    content = <Infinity strokeWidth={2.3} />;
  } else if (id === "nvidia" || id === "nvidia-gpu" || id === "cuda") {
    content = (
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M5 19c7-10 20-11 28-1-7 10-20 11-28 1Z"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path d="M13 7v21h17" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M17 15c6-4 13 5 5 8-5 2-8-5-3-7"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
    );
  } else if (id === "hugging-face" || id === "transformers") {
    content = <span className="hugging-mark">🤗</span>;
  } else if (
    id === "microsoft" ||
    id === "azure-ai" ||
    id === "github-copilot"
  ) {
    content = (
      <span className="microsoft-mark">
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  } else if (id === "amazon" || id === "aws-bedrock") {
    content = (
      <span className="amazon-mark">
        a<span>⌣</span>
      </span>
    );
  } else if (id === "mistral-ai" || id === "mistral-models") {
    content = <span className="mistral-mark">M</span>;
  } else if (id === "deepseek-company" || id === "deepseek-models") {
    content = <span className="deepseek-mark">≈</span>;
  } else if (id === "pytorch") {
    content = <span className="pytorch-mark">◔</span>;
  } else if (id === "langchain") {
    content = <span className="chain-mark">⛓</span>;
  } else if (id === "perplexity") {
    content = (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M8 4l16 14H8L24 4v24L8 15h16L8 28V4Zm8-3v30" />
      </svg>
    );
  } else if (initials) {
    content = <span className="initial-mark">{initials}</span>;
  } else {
    const Icon =
      {
        hardware: Cpu,
        models: Sparkles,
        infrastructure: Cloud,
        research: BookOpen,
        tools: Code2,
        applications: Layers3,
        companies: Box,
      }[category] || Box;
    content = <Icon />;
  }
  return (
    <span
      className={`brand-mark ${className}`}
      style={{ "--brand-color": color || "#31584b" }}
    >
      {content}
    </span>
  );
}
