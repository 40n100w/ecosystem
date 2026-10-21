// Membership, publication activity, and historical origins are context rather
// than active product or infrastructure relationships in the operational view.
const contextualRelationshipLabels = new Set([
  "originally developed",
  "contributed to",
  "incubated",
  "includes as a member",
  "researchers publish on",
  "authors share preprints on",
]);

export function isOperationalRelationship(edge) {
  return !contextualRelationshipLabels.has(edge.label.trim().toLowerCase());
}

/**
 * Find the entities within one or two relationships of a selected entity.
 * Traversal is bidirectional for discovery; edge direction and labels are
 * retained exactly as supplied. A path describes connections, not causation.
 */
export function getNeighborhood(focusId, entities, relationships, depth = 1) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const distances = new Map();
  const paths = new Map();
  if (!byId.has(focusId)) {
    return { entities: [], relationships: [], distances, paths };
  }

  const maxDepth = Number(depth) >= 2 ? 2 : 1;
  const validRelationships = relationships.filter(
    ({ source, target }) => byId.has(source) && byId.has(target),
  );
  const adjacent = new Map(entities.map(({ id }) => [id, []]));
  for (const relationship of validRelationships) {
    adjacent.get(relationship.source).push({
      id: relationship.target,
      relationship,
    });
    adjacent.get(relationship.target).push({
      id: relationship.source,
      relationship,
    });
  }

  const queue = [focusId];
  distances.set(focusId, 0);
  paths.set(focusId, []);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const distance = distances.get(id);
    if (distance >= maxDepth) continue;
    for (const next of adjacent.get(id)) {
      if (distances.has(next.id)) continue;
      distances.set(next.id, distance + 1);
      paths.set(next.id, [...paths.get(id), next.relationship]);
      queue.push(next.id);
    }
  }

  return {
    entities: queue.map((id) => byId.get(id)),
    relationships: validRelationships.filter(
      ({ source, target }) => distances.has(source) && distances.has(target),
    ),
    distances,
    paths,
  };
}

// These aliases identify entries already in the dataset; they do not infer
// entities or relationships from a story. Ambiguous family names are handled
// explicitly below instead of matching every occurrence to both entries.
const aliases = {
  "google-deepmind": ["Google", "DeepMind"],
  "hugging-face": ["HuggingFace"],
  "mistral-ai": ["Mistral"],
  "mistral-models": [
    "Mistral model",
    "Mistral models",
    "Mistral's model",
    "Mistral's models",
    "Mistral Large",
    "Mistral Small",
    "Mixtral",
  ],
  "deepseek-models": [
    "DeepSeek model",
    "DeepSeek models",
    "DeepSeek's model",
    "DeepSeek's models",
    "DeepSeek-R1",
    "DeepSeek R1",
    "DeepSeek-V3",
    "DeepSeek V3",
  ],
  amazon: ["AWS", "Amazon Web Services"],
  "nvidia-gpu": ["NVIDIA GPU"],
  "google-tpu": ["Google TPUs", "TPU", "TPUs"],
  "aws-trainium": ["Trainium"],
  "aws-inferentia": ["Inferentia"],
  "azure-ai": ["Azure"],
  "aws-bedrock": ["AWS Bedrock", "Bedrock"],
  "google-vertex-ai": ["Google Vertex AI"],
  "hf-hub": ["HuggingFace Hub"],
  "github-copilot": ["GitHub's Copilot"],
  "ms-copilot": ["Microsoft's Copilot"],
  "allen-ai": ["Allen Institute for AI", "Allen AI"],
  "stanford-hai": ["Stanford Institute for Human-Centered AI"],
  "mit-csail": ["CSAIL"],
  "berkeley-bair": ["Berkeley Artificial Intelligence Research"],
  wandb: ["Weights and Biases", "W&B"],
};

// Ordinary lowercase words alone should not be treated as product mentions.
// Brand capitalization or an explicit qualified name is still recognized.
const commonNames = new Set([
  "Command",
  "Phi",
  "Granite",
  "Whisper",
  "Replicate",
  "Modal",
  "Transformers",
  "Cursor",
  "Runway",
  "Triton",
]);
const qualifiedAliases = {
  command: ["Cohere Command", "Command model", "Command models"],
  phi: ["Microsoft Phi", "Phi model", "Phi models"],
  granite: ["IBM Granite", "Granite model", "Granite models"],
  whisper: ["OpenAI Whisper", "Whisper model"],
  replicate: ["Replicate platform", "Replicate API"],
  modal: ["Modal cloud", "Modal platform"],
  transformers: ["Hugging Face Transformers", "Transformers library"],
  cursor: ["Cursor AI", "Cursor editor"],
  runway: ["Runway AI", "Runway ML"],
  triton: ["Triton compiler", "Triton language"],
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizePunctuation = (value) =>
  value.normalize("NFKC").replace(/[’‘]/g, "'");

/**
 * Match known names in a headline or article excerpt. Matching is local and
 * literal, with word boundaries and a small alias list, not article analysis.
 * Longer overlapping matches take precedence. Results retain text order.
 */
export function findMentionedEntities(text, entities) {
  if (typeof text !== "string" || !text.trim()) return [];
  const source = normalizePunctuation(text);
  const candidates = [];

  entities.forEach((entity, entityIndex) => {
    const names = new Set([
      ...(entity.id === "mistral-models" ? [] : [entity.name]),
      ...(aliases[entity.id] || []),
      ...(qualifiedAliases[entity.id] || []),
    ]);
    for (const name of names) {
      const literal = normalizePunctuation(name);
      const caseSensitive = name === entity.name && commonNames.has(name);
      const expression = new RegExp(
        `(?<![\\p{L}\\p{N}_])${escapeRegExp(literal)}(?![\\p{L}\\p{N}_])`,
        caseSensitive ? "gu" : "giu",
      );
      for (const match of source.matchAll(expression)) {
        candidates.push({
          entity,
          entityIndex,
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }
  });

  candidates.sort(
    (a, b) =>
      a.start - b.start || b.end - a.end || a.entityIndex - b.entityIndex,
  );
  const found = [];
  const seen = new Set();
  let acceptedEnd = -1;
  for (const candidate of candidates) {
    if (candidate.start < acceptedEnd) continue;
    acceptedEnd = candidate.end;
    if (seen.has(candidate.entity.id)) continue;
    seen.add(candidate.entity.id);
    found.push(candidate.entity);
  }
  return found;
}
