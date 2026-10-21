import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Compass,
  Cpu,
  Grid2X2,
  Layers3,
  Menu,
  Network,
  Search,
  Sparkles,
  X,
  Cloud,
  Building2,
  SlidersHorizontal,
  Newspaper,
} from "lucide-react";
import {
  categories,
  entities,
  relationships,
  featuredIds,
} from "./data/ecosystem";
import {
  getNeighborhood,
  findMentionedEntities,
  isOperationalRelationship,
} from "./lib/graph";
import BrandMark, { AtlasMark } from "./components/BrandMark";
import EcosystemMap from "./components/EcosystemMap";
import DetailPanel, { useDialogFocus } from "./components/DetailPanel";

const categoryIcons = {
  companies: Building2,
  models: Sparkles,
  hardware: Cpu,
  infrastructure: Cloud,
  tools: Code2,
  applications: Layers3,
  research: BookOpen,
};
const entityIds = new Set(entities.map((e) => e.id));
const storageKey = "atlas.saved.v1";
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(
      Array.isArray(value) ? value.filter((id) => entityIds.has(id)) : [],
    );
  } catch {
    return new Set();
  }
}

function AboutDialog({ onClose }) {
  const ref = useRef(null);
  useDialogFocus(ref, onClose);
  return (
    <div className="about-overlay" onClick={onClose}>
      <section
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="About Atlas"
        ref={ref}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button about-close"
          aria-label="Close guide"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2>Using the map</h2>
        <ol className="usage-steps">
          <li>
            Search for a company, model, or technology, or paste a news headline
            to find names in this dataset.
          </li>
          <li>
            Select an entity to see its direct relationships. Switch to two
            steps to include relationships through another entity.
          </li>
          <li>
            Read each arrow as a statement: for example, NVIDIA → develops →
            CUDA. Relationship direction follows that statement.
          </li>
          <li>
            Open a related entity to continue tracing connections, or save it to
            revisit later.
          </li>
        </ol>
        <h3>Data coverage</h3>
        <p>
          {entities.length} entities and {relationships.length} curated
          relationships. Official entity websites are linked. Historical
          relationships are labeled as such. This dataset is not a live news
          feed or a complete record of the industry.
        </p>
        <p>
          Connected entities are candidates to investigate when reading a story.
          The map does not establish that an event will affect them, or the
          direction or size of any effect.
        </p>
        <p className="privacy-note">
          Headline matching runs in your browser. Article text is not sent to a
          service. Saved entities stay in this browser.
        </p>
        <button className="primary-button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

function NewsContext({ onSelect, selected, onClearSelection }) {
  const [text, setText] = useState("");
  const [matches, setMatches] = useState(null);
  const [submitted, setSubmitted] = useState("");
  const submit = (event) => {
    event.preventDefault();
    const next = findMentionedEntities(text, entities);
    setMatches(next);
    setSubmitted(text);
    if (next.length) onSelect(next[0]);
    else onClearSelection();
  };
  return (
    <section className="news-context" aria-label="News context">
      <form onSubmit={submit} className="news-form">
        <label htmlFor="news-input">
          <Newspaper size={16} />
          News context
        </label>
        <input
          id="news-input"
          aria-label="News headline or excerpt"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setMatches(null);
          }}
          placeholder="Paste a headline or excerpt to find entities"
        />
        <button
          className="primary-button"
          type="submit"
          disabled={!text.trim()}
        >
          Find entities <ArrowRight size={14} />
        </button>
      </form>
      {matches !== null && (
        <div className="news-matches" aria-live="polite">
          {matches.length ? (
            <>
              <span>
                {matches.length} {matches.length === 1 ? "match" : "matches"} in
                this dataset
              </span>
              <div className="matched-entities">
                {matches.map((entity) => (
                  <button
                    key={entity.id}
                    aria-label={`Focus on ${entity.name}`}
                    aria-pressed={selected?.id === entity.id}
                    className={selected?.id === entity.id ? "active" : ""}
                    onClick={() => onSelect(entity)}
                  >
                    <BrandMark entity={entity} />
                    {entity.name}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span>No matching entities in this dataset.</span>
          )}
          <button
            className="clear-context icon-button"
            aria-label="Clear news context"
            onClick={() => {
              setText("");
              setMatches(null);
              setSubmitted("");
              onClearSelection();
            }}
          >
            <X size={15} />
          </button>
          {submitted && !matches.length && (
            <p>Search for a specific name, or browse the directory.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Directory({ items, onSelect, saved, onSave, onClear, savedOnly }) {
  const [sort, setSort] = useState("name");
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        sort === "category"
          ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      ),
    [items, sort],
  );
  return (
    <div className="directory">
      <div className="directory-heading">
        <span>
          <strong>{items.length}</strong>{" "}
          {items.length === 1 ? "entity" : "entities"}
        </span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort entities"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="name">Name, A–Z</option>
            <option value="category">Category</option>
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      {!items.length ? (
        <div className="empty-state">
          <Search size={28} />
          <h3>{savedOnly ? "No saved entities" : "No connections found"}</h3>
          <p>
            {savedOnly
              ? "Save entities from their profiles to keep them here."
              : "Try another name or clear the filters."}
          </p>
          <button className="primary-button" onClick={onClear}>
            Show all entities
          </button>
        </div>
      ) : (
        <div className="entity-grid">
          {sorted.map((entity) => {
            const category = categories.find(
              (item) => item.id === entity.category,
            );
            return (
              <article className="entity-card" key={entity.id}>
                <div className="entity-card-top">
                  <span
                    className="category-label"
                    style={{ "--category-color": category.color }}
                  >
                    <i />
                    {category.label}
                  </span>
                  <button
                    className={`card-save ${saved.has(entity.id) ? "is-saved" : ""}`}
                    aria-label={`${saved.has(entity.id) ? "Unsave" : "Save"} ${entity.name}`}
                    aria-pressed={saved.has(entity.id)}
                    onClick={() => onSave(entity.id)}
                  >
                    <Bookmark
                      size={16}
                      fill={saved.has(entity.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <button
                  className="entity-card-main"
                  aria-label={`Explore ${entity.name}`}
                  onClick={() => onSelect(entity)}
                >
                  <BrandMark entity={entity} />
                  <h3>{entity.name}</h3>
                  <p>{entity.tagline}</p>
                  <div className="entity-card-footer">
                    <span>{entity.tags[0]}</span>
                    <ArrowUpRight size={18} />
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("map");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [depth, setDepth] = useState(1);
  const [relationshipScope, setRelationshipScope] = useState("operational");
  const [saved, setSaved] = useState(readSaved);
  const [savedOnly, setSavedOnly] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const searchRef = useRef(null);
  const sidebarRef = useRef(null);
  const previousView = useRef(null);
  const closeAbout = useCallback(() => setShowAbout(false), []);
  const closeDetails = useCallback(() => {
    setSelected(null);
    if (previousView.current) {
      const previous = previousView.current;
      setView(previous.view);
      setCategory(previous.category);
      setQuery(previous.query);
      setSavedOnly(previous.savedOnly);
      previousView.current = null;
    }
  }, []);
  const selectEntity = (entity) => {
    if (!selected) {
      previousView.current = { view, category, query, savedOnly };
      setDepth(1);
      setRelationshipScope("operational");
    }
    setSelected(entity);
    setView("map");
    setCategory("all");
    setQuery("");
    setSavedOnly(false);
    setFilterOpen(false);
  };
  const clearSelection = () => {
    setSelected(null);
    previousView.current = null;
  };
  const activeCategory = categories.find((item) => item.id === category);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((item) => [
          item.id,
          entities.filter((entity) => entity.category === item.id).length,
        ]),
      ),
    [],
  );
  const visible = useMemo(
    () =>
      entities.filter(
        (entity) =>
          (!query.trim() ||
            `${entity.name} ${entity.tagline} ${entity.tags.join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())) &&
          (category === "all" || entity.category === category) &&
          (!savedOnly || saved.has(entity.id)),
      ),
    [query, category, saved, savedOnly],
  );
  const focusRelationships = useMemo(
    () =>
      relationshipScope === "all"
        ? relationships
        : relationships.filter(isOperationalRelationship),
    [relationshipScope],
  );
  const neighborhood = useMemo(
    () =>
      selected
        ? getNeighborhood(selected.id, entities, focusRelationships, depth)
        : null,
    [selected, depth, focusRelationships],
  );
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...saved]));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved]);
  useEffect(() => {
    const handler = (event) => {
      if (
        (event.key === "/" ||
          ((event.ctrlKey || event.metaKey) && event.key === "k")) &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        ) &&
        !showAbout
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (showAbout) return;
        if (navOpen) setNavOpen(false);
        else if (filterOpen) setFilterOpen(false);
        else if (selected) closeDetails();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showAbout, navOpen, filterOpen, selected, closeDetails]);
  useEffect(() => {
    if (!navOpen) return;
    const previous = document.activeElement;
    const controls = [
      ...sidebarRef.current.querySelectorAll("a[href],button:not(:disabled)"),
    ];
    controls[0]?.focus();
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [navOpen]);
  const toggleSave = (id) =>
    setSaved((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const reset = () => {
    clearSelection();
    setCategory("all");
    setQuery("");
    setSavedOnly(false);
    setFilterOpen(false);
    setNavOpen(false);
  };
  const chooseCategory = (id) => {
    clearSelection();
    setCategory(id);
    setNavOpen(false);
    setFilterOpen(false);
  };
  const changeView = (next) => {
    clearSelection();
    setView(next);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to ecosystem
      </a>
      {navOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${navOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <a
          className="brand"
          href="#"
          aria-label="Atlas home"
          onClick={(event) => {
            event.preventDefault();
            reset();
            setView("map");
          }}
        >
          <AtlasMark />
          <span>
            atlas<span className="brand-period">.</span>
          </span>
        </a>
        <nav className="primary-nav">
          <button
            className={!savedOnly ? "active" : ""}
            onClick={() => {
              reset();
              setView("map");
            }}
          >
            <Compass size={18} />
            Ecosystem
            <span className="nav-active-dot" />
          </button>
          <button
            className={savedOnly ? "active" : ""}
            aria-label="Saved collection"
            onClick={() => {
              clearSelection();
              setSavedOnly(true);
              setCategory("all");
              setQuery("");
              setView("directory");
              setNavOpen(false);
            }}
          >
            <Bookmark size={17} />
            Saved entities<span className="collection-count">{saved.size}</span>
          </button>
        </nav>
        <div className="sidebar-section-heading">Categories</div>
        <nav className="category-nav" aria-label="Categories">
          <button
            className={category === "all" ? "current" : ""}
            aria-label="Show all categories"
            aria-pressed={category === "all"}
            onClick={() => chooseCategory("all")}
          >
            <span className="category-icon all-icon">
              <Grid2X2 size={15} />
            </span>
            <span>All categories</span>
            <span className="category-count">{entities.length}</span>
          </button>
          {categories.map((item) => {
            const Icon = categoryIcons[item.id] || Box;
            return (
              <button
                key={item.id}
                className={category === item.id ? "current" : ""}
                aria-label={`Filter by ${item.label}`}
                aria-pressed={category === item.id}
                onClick={() => chooseCategory(item.id)}
              >
                <span
                  className="category-icon"
                  style={{ "--category-color": item.color }}
                >
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
                <span className="category-count">{counts[item.id]}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-about"
            onClick={() => {
              setShowAbout(true);
              setNavOpen(false);
            }}
          >
            <CircleHelp size={16} />
            How to use & data coverage
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((value) => !value)}
            >
              <Menu size={22} />
            </button>
            <h1>AI ecosystem</h1>
            {savedOnly && <span>/ Saved entities</span>}
          </div>
          <span className="dataset-count">
            {entities.length} entities <span>·</span> {relationships.length}{" "}
            relationships
          </span>
        </header>
        <main id="main-content">
          <NewsContext
            onSelect={selectEntity}
            selected={selected}
            onClearSelection={closeDetails}
          />
          <section className="explorer" aria-label="Explore the AI ecosystem">
            <header className="explorer-toolbar">
              <div className="view-switch" aria-label="Display style">
                <button
                  aria-label="Map view"
                  aria-pressed={view === "map"}
                  className={view === "map" ? "selected" : ""}
                  onClick={() => changeView("map")}
                >
                  <Network size={16} />
                  Map
                </button>
                <button
                  aria-label="Directory view"
                  aria-pressed={view === "directory"}
                  className={view === "directory" ? "selected" : ""}
                  onClick={() => changeView("directory")}
                >
                  <Grid2X2 size={15} />
                  Directory
                </button>
              </div>
              <div className="toolbar-right">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    aria-label="Search the ecosystem"
                    value={query}
                    onChange={(event) => {
                      clearSelection();
                      setQuery(event.target.value);
                    }}
                    placeholder="Search companies, models, tools…"
                  />
                  {query ? (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <div className="filter-wrapper">
                  <button
                    className={`filter-button ${filterOpen || category !== "all" ? "is-active" : ""}`}
                    aria-label="Filter categories"
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen((value) => !value)}
                  >
                    <SlidersHorizontal size={16} />
                    <span>Filter</span>
                    {category !== "all" && <i />}
                  </button>
                  {filterOpen && (
                    <>
                      <button
                        className="popover-backdrop"
                        aria-label="Dismiss filters"
                        onClick={() => setFilterOpen(false)}
                      />
                      <div className="filter-popover">
                        <span>Categories</span>
                        <button onClick={() => chooseCategory("all")}>
                          All categories
                          {category === "all" && <Check size={15} />}
                        </button>
                        {categories.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => chooseCategory(item.id)}
                          >
                            <i style={{ background: item.color }} />
                            {item.label}
                            {category === item.id && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>
            {(category !== "all" || query || savedOnly) && (
              <div className="active-filters">
                {savedOnly && (
                  <button onClick={() => setSavedOnly(false)}>
                    Saved entities <X size={12} />
                  </button>
                )}
                {activeCategory && (
                  <button onClick={() => setCategory("all")}>
                    {activeCategory.label}
                    <X size={12} />
                  </button>
                )}
                {query && (
                  <button onClick={() => setQuery("")}>
                    “{query}”<X size={12} />
                  </button>
                )}
                <span className="result-count">{visible.length} results</span>
                <button className="clear-filters" onClick={reset}>
                  Clear filters
                </button>
              </div>
            )}
            {selected && (
              <div className="focus-toolbar">
                <div className="focus-name">
                  <BrandMark entity={selected} />
                  <strong>{selected.name}</strong>
                  <span>
                    {neighborhood.entities.length - 1} connected entities
                  </span>
                </div>
                <select
                  className="relationship-scope"
                  aria-label="Relationship scope"
                  value={relationshipScope}
                  onChange={(event) => setRelationshipScope(event.target.value)}
                >
                  <option value="operational">
                    Products &amp; infrastructure
                  </option>
                  <option value="all">All relationships</option>
                </select>
                <div className="depth-controls" aria-label="Relationship depth">
                  <button
                    aria-label="Direct relationships"
                    aria-pressed={depth === 1}
                    className={depth === 1 ? "active" : ""}
                    onClick={() => setDepth(1)}
                  >
                    Direct
                  </button>
                  <button
                    aria-label="Two-step relationships"
                    aria-pressed={depth === 2}
                    className={depth === 2 ? "active" : ""}
                    onClick={() => setDepth(2)}
                  >
                    2 steps
                  </button>
                </div>
                <button
                  className="icon-button"
                  aria-label="Clear selected entity"
                  onClick={closeDetails}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div
              className={`explorer-content ${selected ? "has-selection" : ""}`}
            >
              <div className="explorer-primary">
                {view === "map" ? (
                  <EcosystemMap
                    entities={selected ? neighborhood.entities : visible}
                    relationships={
                      selected ? neighborhood.relationships : relationships
                    }
                    featuredIds={featuredIds}
                    selected={selected}
                    onSelect={selectEntity}
                    category={category}
                    query={query}
                    savedOnly={savedOnly}
                    onClear={reset}
                    categories={categories}
                    neighborhood={neighborhood}
                    depth={depth}
                  />
                ) : (
                  <Directory
                    items={visible}
                    onSelect={selectEntity}
                    saved={saved}
                    onSave={toggleSave}
                    onClear={reset}
                    savedOnly={savedOnly}
                  />
                )}
              </div>
              {selected && (
                <DetailPanel
                  entity={selected}
                  entities={entities}
                  relationships={focusRelationships}
                  categories={categories}
                  saved={saved.has(selected.id)}
                  onSave={toggleSave}
                  onSelect={selectEntity}
                  onClose={closeDetails}
                  neighborhood={neighborhood}
                  depth={depth}
                />
              )}
            </div>
            <footer className="map-legend">
              <div>
                {categories.map((item) => (
                  <button
                    key={item.id}
                    title={`Filter by ${item.label}`}
                    className={category === item.id ? "active" : ""}
                    onClick={() =>
                      chooseCategory(category === item.id ? "all" : item.id)
                    }
                  >
                    <i style={{ background: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
              {selected && (
                <span className="edge-legend">
                  Arrows show the stated relationship
                </span>
              )}
            </footer>
          </section>
          {storageError && (
            <p className="storage-notice" role="status">
              Browser storage is unavailable. Saved entities will be lost after
              a refresh.
            </p>
          )}
        </main>
      </div>
      {showAbout && <AboutDialog onClose={closeAbout} />}
    </div>
  );
}
