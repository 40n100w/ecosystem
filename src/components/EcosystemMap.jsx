import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize, MousePointer2, Network } from "lucide-react";
import BrandMark from "./BrandMark";

const featuredPositions = {
  "azure-ai": [185, 78],
  gpt: [650, 40],
  claude: [930, 57],
  amazon: [1420, 100],
  microsoft: [280, 240],
  openai: [640, 255],
  anthropic: [1000, 275],
  "aws-bedrock": [1460, 265],
  chatgpt: [405, 83],
  "github-copilot": [105, 320],
  perplexity: [840, 160],
  arxiv: [1190, 30],
  "hugging-face": [205, 470],
  transformers: [85, 620],
  langchain: [425, 380],
  qwen: [140, 820],
  nvidia: [660, 540],
  cuda: [480, 680],
  "nvidia-gpu": [630, 845],
  coreweave: [810, 410],
  "google-deepmind": [1210, 490],
  gemini: [1450, 450],
  "google-tpu": [1460, 625],
  "google-vertex-ai": [1260, 820],
  meta: [950, 690],
  llama: [1040, 870],
  pytorch: [260, 675],
  "amd-instinct": [450, 870],
  "mistral-ai": [1270, 700],
  "mistral-models": [1470, 850],
  "stanford-hai": [805, 865],
  "deepseek-company": [875, 565],
  "deepseek-models": [1010, 450],
};
const WORLD_W = 1640;
const WORLD_H = 830;

export default function EcosystemMap({
  entities,
  relationships,
  featuredIds,
  selected,
  onSelect,
  category,
  query,
  savedOnly,
  onClear,
  categories,
  neighborhood,
  depth,
}) {
  const viewport = useRef(null);
  const drag = useRef(null);
  const markerId = `arrow-${useId().replace(/:/g, "")}`;
  const [dimensions, setDimensions] = useState({ width: 1000, height: 650 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const filtered = category !== "all" || Boolean(query) || savedOnly;
  const visible = useMemo(
    () =>
      selected || filtered || expanded
        ? entities
        : entities.filter((entity) => featuredIds.includes(entity.id)),
    [entities, featuredIds, selected, filtered, expanded],
  );
  const layout = useMemo(() => {
    if (selected && neighborhood) {
      const direct = visible.filter(
        (entity) => neighborhood.distances.get(entity.id) === 1,
      );
      const indirect = visible.filter(
        (entity) => neighborhood.distances.get(entity.id) === 2,
      );
      const incoming = new Set(
        relationships
          .filter((edge) => edge.target === selected.id)
          .map((edge) => edge.source),
      );
      const groups = {
        incoming: [],
        outgoing: [],
        leftIndirect: [],
        rightIndirect: [],
      };
      for (const entity of direct)
        groups[incoming.has(entity.id) ? "incoming" : "outgoing"].push(entity);
      for (const entity of indirect) {
        const firstEdge = neighborhood.paths.get(entity.id)?.[0];
        const firstNeighbor =
          firstEdge?.source === selected.id
            ? firstEdge.target
            : firstEdge?.source;
        groups[
          incoming.has(firstNeighbor) ? "leftIndirect" : "rightIndirect"
        ].push(entity);
      }
      const occupied = [
        { id: "leftIndirect", items: groups.leftIndirect },
        { id: "incoming", items: groups.incoming },
        { id: "selected", items: [selected] },
        { id: "outgoing", items: groups.outgoing },
        { id: "rightIndirect", items: groups.rightIndirect },
      ].filter((column) => column.items.length);
      const width = Math.max(520, (occupied.length - 1) * 355 + 270);
      const height = Math.max(
        570,
        Math.max(...occupied.map((column) => column.items.length)) * 130 + 140,
      );
      const positions = {};
      occupied.forEach((column, columnIndex) => {
        const x = occupied.length === 1 ? width / 2 : 135 + columnIndex * 355;
        column.items.forEach((entity, index) => {
          positions[entity.id] = [
            x,
            75 + ((height - 150) * (index + 1)) / (column.items.length + 1),
          ];
        });
      });
      return { width, height, positions };
    }
    if (!filtered && !expanded)
      return {
        width: WORLD_W,
        height: WORLD_H,
        positions: Object.fromEntries(
          visible.map((entity, index) => {
            const [x, y] = featuredPositions[entity.id] || [
              700,
              400 + index * 2,
            ];
            return [entity.id, [x, y * 0.82 + 12]];
          }),
        ),
        columns: [],
      };
    const columns = Math.min(
      7,
      Math.max(1, visible.length),
      Math.max(1, Math.ceil(Math.sqrt(visible.length * 1.65))),
    );
    const rows = Math.ceil(visible.length / columns);
    const width = Math.max(520, columns * 260 + 100),
      height = Math.max(500, rows * 155 + 140);
    return {
      width,
      height,
      positions: Object.fromEntries(
        visible.map((entity, index) => [
          entity.id,
          [
            (width / (columns + 1)) * ((index % columns) + 1),
            (height / (rows + 1)) * (Math.floor(index / columns) + 1),
          ],
        ]),
      ),
      columns: [],
    };
  }, [visible, selected, neighborhood, relationships, filtered, expanded]);
  const { width: worldWidth, height: worldHeight, positions } = layout;
  const visibleEdges = relationships.filter(
    (edge) => positions[edge.source] && positions[edge.target],
  );
  const fitScale = Math.max(
    !filtered && dimensions.width < 500 ? 0.45 : 0,
    Math.min(
      selected ? 1 : Infinity,
      dimensions.width / worldWidth,
      dimensions.height / worldHeight,
    ),
  );
  const scale = fitScale * zoom;
  const active = hovered || selected?.id;
  const connected = new Set([
    active,
    ...relationships
      .filter((edge) => edge.source === active || edge.target === active)
      .flatMap((edge) => [edge.source, edge.target]),
  ]);
  const transform = {
    x: (dimensions.width - worldWidth * scale) / 2 + offset.x,
    y: (dimensions.height - worldHeight * scale) / 2 + offset.y,
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setHovered(null);
  }, [category, query, savedOnly, expanded, selected?.id, depth, neighborhood]);
  const changeZoom = (amount) =>
    setZoom((value) => Math.min(3.5, Math.max(0.65, value + amount)));
  const handlePointerDown = (event) => {
    if (event.target.closest("button") || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, origin: offset };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };
  const handlePointerMove = (event) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.origin.x + event.clientX - drag.current.x,
      y: drag.current.origin.y + event.clientY - drag.current.y,
    });
  };
  const endDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };
  const clipEnd = (source, target, entity) => {
    const dx = target[0] - source[0],
      dy = target[1] - source[1];
    const halfWidth = (entity?.category === "companies" ? 110 : 100) + 5,
      halfHeight = (entity?.category === "companies" ? 43 : 38) + 5;
    const fraction = Math.min(
      dx ? halfWidth / Math.abs(dx) : Infinity,
      dy ? halfHeight / Math.abs(dy) : Infinity,
    );
    return [source[0] + dx * fraction, source[1] + dy * fraction];
  };
  return (
    <div
      className={`map-container ${selected ? "focused-map" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <div className="map-scope">
        <span>
          {visible.length} entities · {visibleEdges.length} relationships
        </span>
        {!filtered && !selected && (
          <button onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Overview" : "Show all"} <Network size={13} />
          </button>
        )}
      </div>
      <div
        ref={viewport}
        className="map-viewport"
        tabIndex={0}
        aria-label="AI ecosystem map"
        onKeyDown={(event) => {
          const moves = {
            ArrowLeft: [50, 0],
            ArrowRight: [-50, 0],
            ArrowUp: [0, 50],
            ArrowDown: [0, -50],
          };
          if (event.target !== event.currentTarget) return;
          if (moves[event.key]) {
            event.preventDefault();
            setOffset((previous) => ({
              x: previous.x + moves[event.key][0],
              y: previous.y + moves[event.key][1],
            }));
          }
          if (["+", "=", "-"].includes(event.key)) {
            event.preventDefault();
            changeZoom(event.key === "-" ? -0.25 : 0.25);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {!visible.length ? (
          <div className="empty-state">
            <SearchIcon />
            <h3>No connections found</h3>
            <p>Try another name or clear the filters.</p>
            <button className="primary-button" onClick={onClear}>
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className="map-world"
            style={{
              width: worldWidth,
              height: worldHeight,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${scale})`,
            }}
          >
            <svg
              className="map-connections"
              width={worldWidth}
              height={worldHeight}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#779265" />
                </marker>
              </defs>
              {visibleEdges.map((edge, index) => {
                const source = visible.find(
                    (entity) => entity.id === edge.source,
                  ),
                  target = visible.find((entity) => entity.id === edge.target);
                const [x1, y1] = clipEnd(
                    positions[edge.source],
                    positions[edge.target],
                    source,
                  ),
                  [x2, y2] = clipEnd(
                    positions[edge.target],
                    positions[edge.source],
                    target,
                  );
                const highlighted =
                  edge.source === active || edge.target === active;
                const dimmed = hovered && !highlighted;
                const bend = selected
                  ? 0
                  : (index % 2 ? -1 : 1) *
                    Math.min(65, Math.abs(x2 - x1) * 0.12 + 20);
                const cx = (x1 + x2) / 2 + bend,
                  cy = (y1 + y2) / 2 - bend;
                const labelX = 0.25 * x1 + 0.5 * cx + 0.25 * x2,
                  labelY = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
                const labelWidth = edge.label.length * 6.3 + 18;
                const historical = /originally|contributed|incubated/i.test(
                  edge.label,
                );
                return (
                  <g key={`${edge.source}-${edge.target}-${index}`}>
                    <path
                      d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
                      markerEnd={`url(#${markerId})`}
                      className={`connection ${highlighted ? "highlighted" : ""} ${dimmed ? "dimmed" : ""} ${historical ? "historical" : ""}`}
                    />
                    {(selected || highlighted) && (
                      <g
                        className={`edge-label ${dimmed ? "dimmed" : ""}`}
                        transform={`translate(${labelX},${labelY})`}
                      >
                        <rect
                          x={-labelWidth / 2}
                          y={-12}
                          width={labelWidth}
                          height={24}
                          rx={4}
                        />
                        <text textAnchor="middle" dominantBaseline="central">
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
            {visible.map((entity) => {
              const [x, y] = positions[entity.id];
              const categoryInfo = categories.find(
                (item) => item.id === entity.category,
              );
              const distance = neighborhood?.distances.get(entity.id);
              return (
                <button
                  key={entity.id}
                  className={`map-node ${entity.category === "companies" ? "company-node" : ""} ${selected?.id === entity.id ? "selected" : ""} ${hovered && !connected.has(entity.id) ? "muted" : ""} ${distance === 2 ? "indirect-node" : ""}`}
                  style={{
                    left: x,
                    top: y,
                    "--category-color": categoryInfo?.color,
                  }}
                  onClick={() => onSelect(entity)}
                  onMouseEnter={() => setHovered(entity.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(entity.id)}
                  onBlur={() => setHovered(null)}
                  aria-label={`Explore ${entity.name}`}
                >
                  <BrandMark entity={entity} />
                  <span className="node-copy">
                    <strong title={entity.name}>{entity.name}</strong>
                    <span>
                      <i />
                      {entity.category === "companies"
                        ? "Company"
                        : categoryInfo?.label}
                    </span>
                  </span>
                  {distance === 2 && <span className="distance-badge">2</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="map-bottom">
        <span className="drag-hint">
          <MousePointer2 size={13} />
          Drag to pan
        </span>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            onClick={() => changeZoom(-0.25)}
            disabled={zoom <= 0.65}
          >
            <Minus size={16} />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            onClick={() => changeZoom(0.25)}
            disabled={zoom >= 3.5}
          >
            <Plus size={16} />
          </button>
          <span className="zoom-divider" />
          <button
            aria-label="Reset map"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <Maximize size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
function SearchIcon() {
  return <Network size={28} />;
}
