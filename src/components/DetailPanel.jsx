import { useEffect, useRef } from "react";
import {
  X,
  ArrowUpRight,
  ArrowRight,
  Bookmark,
} from "lucide-react";
import BrandMark from "./BrandMark";

export function useDialogFocus(ref, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    const first = element?.querySelector(
      'button, a[href], input, [tabindex="0"]',
    );
    first?.focus();
    const handler = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !element) return;
      const focusable = [
        ...element.querySelectorAll(
          'button:not(:disabled), a[href], input, [tabindex="0"]',
        ),
      ];
      const start = focusable[0];
      const end = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end?.focus();
      }
      if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [ref, onClose]);
}

export default function DetailPanel({
  entity,
  entities,
  relationships,
  categories,
  saved,
  onSave,
  onSelect,
  onClose,
  neighborhood,
  depth,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous?.isConnected) previous.focus();
      else
        document.querySelector('[aria-label="Search the ecosystem"]')?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    ref.current.scrollTop = 0;
    ref.current.querySelector('[aria-label="Close details"]')?.focus();
  }, [entity.id]);
  const category = categories.find((item) => item.id === entity.category);
  const incoming = relationships.filter((edge) => edge.target === entity.id),
    outgoing = relationships.filter((edge) => edge.source === entity.id);
  const indirect =
    depth === 2
      ? neighborhood.entities.filter(
          (item) => neighborhood.distances.get(item.id) === 2,
        )
      : [];
  const entityById = Object.fromEntries(
    entities.map((item) => [item.id, item]),
  );
  const statement = (edge) =>
    `${entityById[edge.source].name} ${edge.label.charAt(0).toLowerCase() + edge.label.slice(1)} ${entityById[edge.target].name}`;
  const group = (label, edges) =>
    edges.length > 0 && (
      <section className="detail-section connections-section">
        <h3>
          {label}
          <span>{edges.length}</span>
        </h3>
        <div className="related-list">
          {edges.map((edge, index) => {
            const related =
              entityById[edge.source === entity.id ? edge.target : edge.source];
            return (
              <button
                className="related-item"
                key={`${related.id}-${index}`}
                onClick={() => onSelect(related)}
                aria-label={`Explore ${related.name}`}
              >
                <BrandMark entity={related} />
                <span>
                  <strong>{related.name}</strong>
                  <small>{statement(edge)}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            );
          })}
        </div>
      </section>
    );
  return (
    <aside
      className="detail-panel"
      ref={ref}
      role="complementary"
      aria-label={`${entity.name} details`}
    >
      <header className="detail-header">
        <span>Entity details</span>
        <button
          className="icon-button"
          aria-label="Close details"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="detail-content">
        <div className="detail-identity">
          <BrandMark entity={entity} className="detail-brand" />
          <div>
            <div
              className="detail-category"
              style={{ "--category-color": category.color }}
            >
              <i />
              {category.label}
            </div>
            <h2>{entity.name}</h2>
          </div>
        </div>
        <p className="detail-description">{entity.description}</p>
        <div className="detail-actions">
          <a
            className="source-link"
            href={entity.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official website <ArrowUpRight size={14} />
          </a>
          <button
            className={`save-button ${saved ? "saved" : ""}`}
            aria-label={`${saved ? "Unsave" : "Save"} ${entity.name}`}
            aria-pressed={saved}
            onClick={() => onSave(entity.id)}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        {group("Outgoing relationships", outgoing)}
        {group("Incoming relationships", incoming)}
        {!incoming.length && !outgoing.length && (
          <p className="no-relations">
            No relationships in this scope.
          </p>
        )}
        {depth === 2 && (
          <section className="detail-section indirect-section">
            <h3>
              Two steps away <span>{indirect.length}</span>
            </h3>
            {indirect.length ? (
              indirect.map((item) => (
                <details key={item.id} className="path-detail">
                  <summary>
                    <span>{item.name}</span>
                    <span>View path</span>
                  </summary>
                  <ol>
                    {neighborhood.paths.get(item.id).map((edge, index) => (
                      <li key={index}>{statement(edge)}</li>
                    ))}
                  </ol>
                  <button
                    onClick={() => onSelect(item)}
                    aria-label={`Explore ${item.name}`}
                  >
                    Focus on {item.name}
                    <ArrowRight size={13} />
                  </button>
                </details>
              ))
            ) : (
              <p>No additional entities within two steps.</p>
            )}
          </section>
        )}
        <p className="source-note">
          Connections show where to investigate a story’s effects. They do not
          establish an actual impact.
        </p>
      </div>
    </aside>
  );
}
